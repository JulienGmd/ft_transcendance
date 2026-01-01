// ============================================
// GAME SERVICE - Main Entry Point
// Backend only, no static files
// ============================================

import fastifyCookie from "@fastify/cookie"
import fastifyWebsocket from "@fastify/websocket"
import Fastify from "fastify"
import { readFileSync } from "fs"
import type { RawData, WebSocket } from "ws"
import { parseClientMessage, sendError, sendPong } from "./communication"
import { GameManager } from "./gameManager"
import { getJWT } from "./jwt"
import { connectNats, disconnectNats } from "./nats"
import { NormalMatchmaking, TournamentMatchmaking } from "./queue"
import { ClientMessage } from "./sharedTypes"
import { Player } from "./types"

// ============================================
// INITIALIZE
// ============================================

// Connect to NATS for communication with user-management
await connectNats()

const gameManager = new GameManager()
const normalMatchmaking = new NormalMatchmaking(gameManager)
const tournamentMatchmaking = new TournamentMatchmaking(gameManager)

// ============================================
// CREATE SERVER
// ============================================

const fastify = Fastify({
  https: {
    key: readFileSync("/secrets/certs/key.pem"),
    cert: readFileSync("/secrets/certs/cert.pem"),
  },
})

await fastify.register(fastifyWebsocket)
await fastify.register(fastifyCookie)

// ============================================
// REQUESTS LOG
// ============================================

fastify.addHook("onRequest", async (req, res) => {
  if (process.env.NODE_ENV !== "production" && req.url !== "/health")
    console.log(`${req.method} ${req.url}`)
})

// ============================================
// HEALTH CHECK
// ============================================

fastify.get("/health", async () => ({ status: "ok" }))

// ============================================
// WEBSOCKET MESSAGE HANDLERS
// ============================================

function handleMessage(player: Player, data: RawData): void {
  try {
    const message = parseClientMessage(data.toString()) as ClientMessage

    switch (message.type) {
      case "join_normal":
        if (!tournamentMatchmaking.isInQueue(player))
          normalMatchmaking.join(player)
        break

      case "join_tournament":
        if (!normalMatchmaking.isInQueue(player))
          tournamentMatchmaking.join(player)
        break

      case "leave_queue":
        normalMatchmaking.leave(player)
        tournamentMatchmaking.leave(player)
        break

      case "move":
        gameManager.handleInput(player, message.direction)
        break

      case "ping":
        sendPong(player.socket)
        break

      default:
        break
    }
  } catch (err) {
    console.error("[WS] Invalid message")
    sendError(player.socket, "Invalid message format")
  }
}

function handleDisconnect(player: Player): void {
  normalMatchmaking.leave(player)
  tournamentMatchmaking.leave(player)
  gameManager.handleDisconnect(player)
  console.log(`[WS] Disconnected: ${player.username}`)
}

// ============================================
// WEBSOCKET ENDPOINT
// ============================================

fastify.get("/api/game/ws", { websocket: true }, async (socket: WebSocket, request) => {
  // Extract JWT token from cookie
  const user = await getJWT(request)
  if (!user) {
    console.log("[WS] Refusing connection: Unauthorized")
    socket.close(1008, "Unauthorized")
    return
  }
  const player: Player = { ...user, socket }
  console.log(`[WS] Connected: ${player.username}`)

  // Check if player is in an existing game and reconnect them
  gameManager.handleReconnect(player)

  socket.on("message", (data) => handleMessage(player, data))
  socket.on("close", () => handleDisconnect(player))
  socket.on("error", (err) => console.error(`[WS] Socket error for player ${player.username}:`, err))
})

// ============================================
// CLEAN EXIT
// ============================================

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`${signal} received, shutting down gracefully...`)
    await fastify?.close()
    await disconnectNats()
    gameManager.dispose()
    process.exit(0)
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
