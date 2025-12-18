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
import { NormalQueue, TournamentQueue } from "./queue.js"
import { ClientMessage, GameMode, InputAction, InputKey } from "./types.js"

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
const normalQueue = new NormalQueue(gameManager)
const tournamentQueue = new TournamentQueue(gameManager)

// Register tournament callback for game endings
gameManager.setOnGameEndCallback((gameId, winnerId) => {
  if (tournamentQueue.isTournamentGame(gameId))
    tournamentQueue.onGameEnd(gameId, winnerId)
})

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
    normalQueueSize: normalQueue.size,
    tournamentQueueSize: tournamentQueue.size,
  }
})

// ============================================
// WEBSOCKET MESSAGE HANDLERS
// ============================================

function handleJoinNormal(playerId: string, username: string, socket: ISocket): void {
  if (gameManager.handleReconnect(playerId, socket)) {
    console.log(`[WS] Player ${playerId} reconnected to game`)
    return
  }
  const result = normalQueue.join(playerId, username, socket)
  if (!result.matched)
    sendQueueJoined(socket, result.position, GameMode.NORMAL)
}

function handleJoinTournament(playerId: string, username: string, socket: ISocket): void {
  if (gameManager.handleReconnect(playerId, socket)) {
    console.log(`[WS] Player ${playerId} reconnected to game`)
    return
  }
  const result = tournamentQueue.join(playerId, username, socket)
  if (!result.matched)
    sendQueueJoined(socket, result.position, GameMode.TOURNAMENT)
}

function handleLeaveQueue(playerId: string, socket: ISocket): void {
  normalQueue.leave(playerId)
  tournamentQueue.leave(playerId)
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
    case "join_normal":
      if (playerId && username)
        handleJoinNormal(playerId, username, socket)
      return playerId

    case "join_tournament":
      if (playerId && username)
        handleJoinTournament(playerId, username, socket)
      return playerId

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
  normalQueue.handleDisconnect(playerId)
  tournamentQueue.handleDisconnect(playerId)
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

  // Check if player is in an existing game and reconnect them
  if (playerId && gameManager.handleReconnect(playerId, socketWrapper))
    console.log(`[WS] Player ${playerId} auto-reconnected to existing game`)

  socket.on("message", (data: Buffer) => {
    try {
      const message = parseClientMessage(data.toString()) as ClientMessage
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
