// ============================================
// COMMUNICATION LAYER
// Abstracts WebSocket/transport to allow easy changes
// ============================================

import { BallSync, GameStateSnapshot, PlayerSide, ServerMessage } from "./types.js"

// ============================================
// SOCKET INTERFACE
// Abstraction over WebSocket to allow swapping transport
// ============================================

export interface ISocket {
  send(data: string): void
  readyState: number
}

export const SOCKET_OPEN = 1

/**
 * Check if socket is open and ready
 */
export function isSocketOpen(socket: ISocket): boolean {
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
export function sendRaw(socket: ISocket, message: ServerMessage): boolean {
  if (!isSocketOpen(socket))
    return false
  socket.send(serializeMessage(message))
  return true
}

/**
 * Send to multiple sockets
 */
export function broadcastRaw(sockets: Iterable<ISocket>, message: ServerMessage): void {
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
export function sendQueueJoined(socket: ISocket, position: number): boolean {
  return sendRaw(socket, {
    type: "queue_joined",
    position,
  })
}

/**
 * Notify player they left the queue
 */
export function sendQueueLeft(socket: ISocket): boolean {
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
  socket: ISocket,
  gameId: string,
  side: PlayerSide,
  opponentName: string,
): boolean {
  return sendRaw(socket, {
    type: "game_found",
    gameId,
    side,
    opponentName,
  })
}

/**
 * Send countdown tick
 */
export function sendCountdown(socket: ISocket, seconds: number): boolean {
  return sendRaw(socket, {
    type: "countdown",
    seconds,
  })
}

/**
 * Broadcast countdown to multiple sockets
 */
export function broadcastCountdown(sockets: Iterable<ISocket>, seconds: number): void {
  broadcastRaw(sockets, {
    type: "countdown",
    seconds,
  })
}

/**
 * Notify game start
 */
export function sendGameStart(socket: ISocket): boolean {
  return sendRaw(socket, {
    type: "game_start",
  })
}

/**
 * Broadcast game start
 */
export function broadcastGameStart(sockets: Iterable<ISocket>): void {
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
export function sendGameState(socket: ISocket, state: GameStateSnapshot): boolean {
  return sendRaw(socket, {
    type: "game_state",
    state,
  })
}

/**
 * Broadcast full game state
 */
export function broadcastGameState(sockets: Iterable<ISocket>, state: GameStateSnapshot): void {
  broadcastRaw(sockets, {
    type: "game_state",
    state,
  })
}

/**
 * Send ball sync data
 */
export function sendBallSync(socket: ISocket, ball: BallSync): boolean {
  return sendRaw(socket, {
    type: "ball_sync",
    ball,
  })
}

/**
 * Broadcast ball sync
 */
export function broadcastBallSync(sockets: Iterable<ISocket>, ball: BallSync): void {
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
  socket: ISocket,
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
  sockets: Iterable<ISocket>,
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
export function sendScoreUpdate(socket: ISocket, left: number, right: number): boolean {
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
  sockets: Iterable<ISocket>,
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
  socket: ISocket,
  winnerId: string,
  leftScore: number,
  rightScore: number,
): boolean {
  return sendRaw(socket, {
    type: "game_over",
    winnerId,
    finalScore: { left: leftScore, right: rightScore },
  })
}

/**
 * Broadcast game over
 */
export function broadcastGameOver(
  sockets: Iterable<ISocket>,
  winnerId: string,
  leftScore: number,
  rightScore: number,
): void { // Need better data to send, and maybe update user-management, need to see
  broadcastRaw(sockets, {
    type: "game_over",
    winnerId,
    finalScore: { left: leftScore, right: rightScore },
  })
}

// ============================================
// CONNECTION STATUS MESSAGES
// ============================================

/**
 * Notify opponent disconnected
 */
export function sendOpponentDisconnected(socket: ISocket): boolean {
  return sendRaw(socket, {
    type: "opponent_disconnected",
  })
}

/**
 * Notify opponent reconnected
 */
export function sendOpponentReconnected(socket: ISocket): boolean {
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
export function sendError(socket: ISocket, message: string): boolean {
  return sendRaw(socket, {
    type: "error",
    message,
  })
}

/**
 * Send pong (response to ping)
 */
export function sendPong(socket: ISocket): boolean {
  return sendRaw(socket, {
    type: "pong",
  })
}
