// TODO
// username instead of playerId
// simple tournament mode, matchmaking 4 players, 4 match, 1st round, top3 + final
// update endgame info to send (precision?) : GameID, Dates, ?

// ============================================
// GAME SERVICE - Main Entry Point
// Backend only, no static files
// ============================================

import fastifyWebsocket from "@fastify/websocket"
import Fastify from "fastify"
import { readFileSync } from "fs"
import type { WebSocket } from "ws"
import { ISocket, parseClientMessage, sendError, sendPong, sendQueueJoined, sendQueueLeft } from "./communication.js"
import { GameManager } from "./gameManager.js"
import { connectNats } from "./nats.js"
import { MatchmakingQueue } from "./queue.js"
import { ClientMessage, InputAction, InputKey } from "./types.js"

// ============================================
// INITIALIZE
// ============================================

// Connect to NATS for communication with user-management
try {
  await connectNats()
} catch (err) {
  console.warn("⚠️ NATS connection failed, match results won't be recorded:", err)
}

const gameManager = new GameManager()
const queue = new MatchmakingQueue(gameManager)

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
    activeGames: gameManager.activeGames,
    queueSize: queue.size,
  }
})

// ============================================
// WEBSOCKET MESSAGE HANDLERS
// ============================================

function handleJoinQueue(playerId: string, username: string, socket: ISocket): void {
  if (gameManager.handleReconnect(playerId, socket)) {
    console.log(`[WS] Player ${playerId} reconnected to game`)
    return
  }
  const result = queue.join(playerId, username, socket)
  if (!result.matched)
    sendQueueJoined(socket, result.position)
}

function handleLeaveQueue(playerId: string, socket: ISocket): void {
  queue.leave(playerId)
  sendQueueLeft(socket)
}

function handleInput(playerId: string, key: InputKey, action: InputAction): void {
  gameManager.handleInput(playerId, key, action)
}

function handlePing(socket: ISocket): void {
  sendPong(socket)
}

function handleMessage(
  socket: ISocket,
  playerId: string | null,
  username: string | null,
  message: ClientMessage,
): string | null {
  switch (message.type) {
    case "join_queue":
      if (username)
        handleJoinQueue(message.playerId, username, socket)
      return message.playerId

    case "leave_queue":
      if (playerId)
        handleLeaveQueue(playerId, socket)
      return playerId

    case "input":
      if (playerId)
        handleInput(playerId, message.key, message.action)
      return playerId

    case "ping":
      handlePing(socket)
      return playerId

    default:
      return playerId
  }
}

function handleDisconnect(playerId: string | null): void {
  if (!playerId)
    return
  queue.handleDisconnect(playerId)
  gameManager.handleDisconnect(playerId)
}

// ============================================
// WEBSOCKET ENDPOINT
// ============================================

fastify.get("/api/game/ws", { websocket: true }, async (socket: WebSocket, request) => {
  console.log("[WS] New connection")

  // Extract JWT token from cookie
  const cookies = request.headers.cookie || ""
  const tokenMatch = cookies.match(/authToken=([^;]+)/)
  const token = tokenMatch ? tokenMatch[1] : null

  let verifiedUser: { id: number; username: string } | null = null

  // Validate token via NATS to get user ID and username
  if (token) {
    const { verifyToken } = await import("./nats.js")
    verifiedUser = await verifyToken(token)
    if (verifiedUser)
      console.log(`[WS] Authenticated user: ${verifiedUser.username} (ID: ${verifiedUser.id})`)
    else
      console.warn("[WS] Token validation failed, user will not be able to play ranked")
  } else {
    console.warn("[WS] No token in cookies, user will not be able to play ranked")
  }

  // Use verified user info
  let playerId: string | null = verifiedUser ? String(verifiedUser.id) : null
  const username: string | null = verifiedUser?.username || null
  const socketWrapper: ISocket = socket

  socket.on("message", (data: Buffer) => {
    try {
      const message = parseClientMessage(data.toString()) as ClientMessage
      // If user is authenticated, use their numeric ID instead of client-provided ID
      if (message.type === "join_queue" && verifiedUser)
        message.playerId = String(verifiedUser.id)
      playerId = handleMessage(socketWrapper, playerId, username, message)
    } catch (err) {
      console.error("[WS] Invalid message:", err)
      sendError(socketWrapper, "Invalid message format")
    }
  })

  socket.on("close", () => {
    console.log(`[WS] Connection closed for player ${playerId}`)
    handleDisconnect(playerId)
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
