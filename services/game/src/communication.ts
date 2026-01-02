// ============================================
// COMMUNICATION LAYER
// Abstracts WebSocket/transport to allow easy changes
// ============================================

import type { RawData, WebSocket } from "ws"
import { ClientMessage, GameMode, SerializedEngine, SerializedPaddle, ServerMessage, Side } from "./sharedTypes"

// ============================================
// SOCKET INTERFACE
// Abstraction over WebSocket to allow swapping transport
// ============================================

export const SOCKET_OPEN = 1

/**
 * Check if socket is open and ready
 */
export function isSocketOpen(socket: WebSocket): boolean {
  return socket.readyState === SOCKET_OPEN
}

// ============================================
// MESSAGE SERIALIZATION
// ============================================

/**
 * Serialize a message to JSON string
 */
export function serializeMessage(message: ServerMessage): string {
  return JSON.stringify(message)
}

/**
 * Parse incoming message from client
 */
export function parseClientMessage(data: RawData): ClientMessage | undefined {
  try {
    return JSON.parse(data.toString()) as ClientMessage
  } catch (err) {
    return undefined
  }
}

// ============================================
// SEND FUNCTIONS (One per message type)
// ============================================

/**
 * Send raw message to socket
 */
export function sendRaw(socket: WebSocket, message: ServerMessage): boolean {
  if (!isSocketOpen(socket))
    return false
  socket.send(serializeMessage(message))
  return true
}

/**
 * Send to multiple sockets
 */
export function broadcastRaw(sockets: Iterable<WebSocket>, message: ServerMessage): void {
  const msgStr = serializeMessage(message)
  for (const socket of sockets) {
    if (isSocketOpen(socket))
      socket.send(msgStr)
  }
}

// ============================================
// QUEUE MESSAGES
// ============================================

/**
 * Notify player they joined the queue
 */
export function sendQueueJoined(socket: WebSocket, position: number, mode: GameMode): boolean {
  return sendRaw(socket, {
    type: "queue_joined",
    position,
    mode,
  })
}

/**
 * Notify player they left the queue
 */
export function sendQueueLeft(socket: WebSocket): boolean {
  return sendRaw(socket, {
    type: "queue_left",
  })
}

// ============================================
// GAME FOUND / SETUP MESSAGES
// ============================================

/**
 * Notify player a game was found
 */
export function sendGameFound(
  socket: WebSocket,
  side: Side,
  opponentName: string,
  mode: GameMode,
): boolean {
  return sendRaw(socket, {
    type: "game_found",
    side,
    opponentName,
    mode,
  })
}

/**
 * Send countdown tick
 */
export function sendCountdown(socket: WebSocket, seconds: number): boolean {
  return sendRaw(socket, {
    type: "countdown",
    seconds,
  })
}

/**
 * Broadcast countdown to multiple sockets
 */
export function broadcastCountdown(sockets: Iterable<WebSocket>, seconds: number): void {
  broadcastRaw(sockets, {
    type: "countdown",
    seconds,
  })
}

/**
 * Notify game start
 */
export function sendGameStart(socket: WebSocket): boolean {
  return sendRaw(socket, {
    type: "game_start",
  })
}

/**
 * Broadcast game start
 */
export function broadcastGameStart(sockets: Iterable<WebSocket>): void {
  broadcastRaw(sockets, {
    type: "game_start",
  })
}

// ============================================
// GAME STATE MESSAGES
// ============================================

/**
 * Send full game state snapshot
 */
export function sendGameSync(socket: WebSocket, state: SerializedEngine): boolean {
  return sendRaw(socket, {
    type: "game_sync",
    state,
  })
}

/**
 * Broadcast full game state
 */
export function broadcastGameSync(sockets: Iterable<WebSocket>, state: SerializedEngine): void {
  broadcastRaw(sockets, {
    type: "game_sync",
    state,
  })
}

// ============================================
// PADDLE MESSAGES
// ============================================

/**
 * Send paddle update
 */
export function sendPaddleUpdate(
  socket: WebSocket,
  side: Side,
  paddle: SerializedPaddle,
): boolean {
  return sendRaw(socket, {
    type: "paddle_update",
    side,
    paddle,
  })
}

/**
 * Broadcast paddle update
 */
export function broadcastPaddleUpdate(
  sockets: Iterable<WebSocket>,
  side: Side,
  paddle: SerializedPaddle,
): void {
  broadcastRaw(sockets, {
    type: "paddle_update",
    side,
    paddle,
  })
}

// ============================================
// SCORE MESSAGES
// ============================================

/**
 * Send score update
 */
export function sendScoreUpdate(socket: WebSocket, score: { left: number; right: number }): boolean {
  return sendRaw(socket, {
    type: "score_update",
    score,
  })
}

/**
 * Broadcast score update
 */
export function broadcastScoreUpdate(
  sockets: Iterable<WebSocket>,
  score: { left: number; right: number },
): void {
  broadcastRaw(sockets, {
    type: "score_update",
    score,
  })
}

// ============================================
// GAME OVER MESSAGES
// ============================================

/**
 * Send game over
 */
export function sendGameOver(
  socket: WebSocket,
): boolean {
  return sendRaw(socket, {
    type: "game_over",
  })
}

/**
 * Broadcast game over
 */
export function broadcastGameOver(
  sockets: Iterable<WebSocket>,
): void {
  broadcastRaw(sockets, {
    type: "game_over",
  })
}

/**
 * Send tournament final result
 */
export function sendTournamentResult(socket: WebSocket, rankings: string[]): boolean {
  return sendRaw(socket, {
    type: "tournament_result",
    rankings,
  })
}

/**
 * Broadcast tournament result
 */
export function broadcastTournamentResult(sockets: Iterable<WebSocket>, rankings: string[]): void {
  broadcastRaw(sockets, {
    type: "tournament_result",
    rankings,
  })
}

// ============================================
// ERROR / UTILITY MESSAGES
// ============================================

/**
 * Send error message
 */
export function sendError(socket: WebSocket, message: string): boolean {
  return sendRaw(socket, {
    type: "error",
    message,
  })
}

/**
 * Send pong (response to ping)
 */
export function sendPong(socket: WebSocket): boolean {
  return sendRaw(socket, {
    type: "pong",
  })
}
