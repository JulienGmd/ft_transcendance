// ============================================
// COMMUNICATION LAYER
// Abstracts WebSocket/transport to allow easy changes
// ============================================

import type { WebSocket } from "ws"
import { BallSync, GameMode, GameStateSnapshot, PlayerSide, ServerMessage, TournamentRanking } from "./types"

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
export function parseClientMessage(data: string): unknown {
  return JSON.parse(data)
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
  gameId: string,
  side: PlayerSide,
  opponentName: string,
  mode: GameMode,
): boolean {
  return sendRaw(socket, {
    type: "game_found",
    gameId,
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
export function sendGameState(socket: WebSocket, state: GameStateSnapshot): boolean {
  return sendRaw(socket, {
    type: "game_state",
    state,
  })
}

/**
 * Broadcast full game state
 */
export function broadcastGameState(sockets: Iterable<WebSocket>, state: GameStateSnapshot): void {
  broadcastRaw(sockets, {
    type: "game_state",
    state,
  })
}

/**
 * Send ball sync data
 */
export function sendBallSync(socket: WebSocket, ball: BallSync): boolean {
  return sendRaw(socket, {
    type: "ball_sync",
    ball,
  })
}

/**
 * Broadcast ball sync
 */
export function broadcastBallSync(sockets: Iterable<WebSocket>, ball: BallSync): void {
  broadcastRaw(sockets, {
    type: "ball_sync",
    ball,
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
  side: PlayerSide,
  y: number,
  direction: -1 | 0 | 1,
): boolean {
  return sendRaw(socket, {
    type: "paddle_update",
    side,
    y,
    direction,
  })
}

/**
 * Broadcast paddle update
 */
export function broadcastPaddleUpdate(
  sockets: Iterable<WebSocket>,
  side: PlayerSide,
  y: number,
  direction: -1 | 0 | 1,
): void {
  broadcastRaw(sockets, {
    type: "paddle_update",
    side,
    y,
    direction,
  })
}

// ============================================
// SCORE MESSAGES
// ============================================

/**
 * Send score update
 */
export function sendScoreUpdate(socket: WebSocket, left: number, right: number): boolean {
  return sendRaw(socket, {
    type: "score_update",
    left,
    right,
  })
}

/**
 * Broadcast score update
 */
export function broadcastScoreUpdate(
  sockets: Iterable<WebSocket>,
  left: number,
  right: number,
): void {
  broadcastRaw(sockets, {
    type: "score_update",
    left,
    right,
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
  leftScore: number,
  rightScore: number,
  mode: GameMode,
): boolean {
  return sendRaw(socket, {
    type: "game_over",
    finalScore: { left: leftScore, right: rightScore },
    mode,
  })
}

/**
 * Broadcast game over
 */
export function broadcastGameOver(
  sockets: Iterable<WebSocket>,
  leftScore: number,
  rightScore: number,
  mode: GameMode,
  leftPrecision?: number,
  rightPrecision?: number,
): void {
  broadcastRaw(sockets, {
    type: "game_over",
    finalScore: { left: leftScore, right: rightScore },
    mode,
    leftPrecision,
    rightPrecision,
  })
}

/**
 * Send tournament waiting message
 */
export function sendTournamentWaiting(socket: WebSocket, message: string): boolean {
  return sendRaw(socket, {
    type: "tournament_waiting",
    message,
  })
}

/**
 * Broadcast tournament waiting
 */
export function broadcastTournamentWaiting(sockets: Iterable<WebSocket>, message: string): void {
  broadcastRaw(sockets, {
    type: "tournament_waiting",
    message,
  })
}

/**
 * Send tournament final result
 */
export function sendTournamentResult(socket: WebSocket, rankings: TournamentRanking[]): boolean {
  return sendRaw(socket, {
    type: "tournament_result",
    rankings,
  })
}

/**
 * Broadcast tournament result
 */
export function broadcastTournamentResult(sockets: Iterable<WebSocket>, rankings: TournamentRanking[]): void {
  broadcastRaw(sockets, {
    type: "tournament_result",
    rankings,
  })
}

// ============================================
// CONNECTION STATUS MESSAGES
// ============================================

/**
 * Notify opponent disconnected
 */
export function sendOpponentDisconnected(socket: WebSocket): boolean {
  return sendRaw(socket, {
    type: "opponent_disconnected",
  })
}

/**
 * Notify opponent reconnected
 */
export function sendOpponentReconnected(socket: WebSocket): boolean {
  return sendRaw(socket, {
    type: "opponent_reconnected",
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
