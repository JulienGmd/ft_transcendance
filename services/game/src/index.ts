// ============================================
// GAME SERVICE - Main Entry Point
// Backend only, no static files
// ============================================

import Fastify from "fastify"
import fastifyWebsocket from "@fastify/websocket"
import { readFileSync } from "fs"
import type { WebSocket } from "ws"
import { ClientMessage, InputAction, InputKey } from "./types.js"
import {
  ISocket,
  sendQueueJoined,
  sendQueueLeft,
  sendError,
  sendPong,
  parseClientMessage,
} from "./communication.js"
import { connectNats } from "./nats.js"

// ============================================
// INITIALIZE
// ============================================

// Connect to NATS for communication with user-management
try {
  await connectNats()
} catch (err) {
  console.warn("⚠️ NATS connection failed, match results won't be recorded:", err)
}

// ============================================
// CREATE SERVER
// ============================================

const fastify = Fastify({
  https: {
    key: readFileSync(`/certs/key.pem`),
    cert: readFileSync(`/certs/cert.pem`),
  },
})

await fastify.register(fastifyWebsocket)

// ============================================
// HEALTH CHECK
// ============================================

fastify.get("/health", async () => {
  return {
    status: "ok",
  }
})

// ============================================
// WEBSOCKET MESSAGE HANDLERS
// ============================================

function handlePing(socket: ISocket): void {
  sendPong(socket)
}

function handleMessage(socket: ISocket, playerId: string | null, message: ClientMessage): string | null {
  switch (message.type) {
    case "ping":
      handlePing(socket)
      return playerId

    default:
      return playerId
  }
}

// ============================================
// WEBSOCKET ENDPOINT
// ============================================

fastify.get("/api/game/ws", { websocket: true }, async (socket: WebSocket, request) => {
  console.log("[WS] New connection")

  // Extract JWT token from cookie
  const cookies = request.headers.cookie || ""
  const tokenMatch = cookies.match(/token=([^;]+)/)
  const token = tokenMatch ? tokenMatch[1] : null

  let numericUserId: number | null = null

  // Validate token via NATS to get user ID
  if (token) {
    const { verifyToken } = await import("./nats.js")
    numericUserId = await verifyToken(token)
    if (numericUserId) {
      console.log(`[WS] Authenticated user ID: ${numericUserId}`)
    } else {
      console.warn("[WS] Token validation failed, user will not be able to play ranked")
    }
  } else {
    console.warn("[WS] No token in cookies, user will not be able to play ranked")
  }

  // Use numeric user ID as string, or null if not authenticated
  let playerId: string | null = numericUserId ? String(numericUserId) : null
  const socketWrapper: ISocket = socket

  socket.on("message", (data: Buffer) => {
    try {
      const message = parseClientMessage(data.toString()) as ClientMessage
      if (message.type === "join_queue" && numericUserId) {
        message.playerId = String(numericUserId)
      }
      playerId = handleMessage(socketWrapper, playerId, message)
    } catch (err) {
      console.error("[WS] Invalid message:", err)
      sendError(socketWrapper, "Invalid message format")
    }
  })

  socket.on("error", (err: Error) => {
    console.error(`[WS] Socket error for player ${playerId}:`, err)
  })
})

// ============================================
// START SERVER
// ============================================

try {
  await fastify.listen({ port: 3000, host: "0.0.0.0" })
  console.log("🎮 Game service listening on https://0.0.0.0:3000")
} catch (err) {
  console.error("Error starting game service:", err)
  process.exit(1)
}
