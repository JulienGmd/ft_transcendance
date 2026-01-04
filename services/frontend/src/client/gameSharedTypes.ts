// ============================================
// GAME TYPES & STATES
// Shared between server and client
// ============================================

export enum GameMode {
  NORMAL = "normal",
  TOURNAMENT = "tournament",
}

export interface Vector2D {
  x: number
  y: number
}

export interface SerializedPaddle {
  y: number
  direction: -1 | 0 | 1
}

export interface SerializedBall {
  /** Time since last bounce/launch */
  time: number
  /** Position at last bounce/launch */
  pos: Vector2D
  /** Velocity at last bounce/launch */
  velocity: Vector2D
}

export interface SerializedEngine {
  ball: SerializedBall
  paddles: {
    left: SerializedPaddle
    right: SerializedPaddle
  }
  score: {
    left: number
    right: number
  }
}

export interface TournamentResult {
  semi1: { p1: string; p2: string; winner?: string }
  semi2: { p1: string; p2: string; winner?: string }
  final?: { p1: string; p2: string; winner?: string }
  third?: { p1: string; p2: string; winner?: string }
}

// --- Enums ---

export enum Side {
  LEFT = "left",
  RIGHT = "right",
}

// --- WebSocket Messages ---

// Client -> Server
// Note: playerId is determined server-side from the authenticated token
export type ClientMessage =
  | { type: "join_normal" }
  | { type: "join_tournament" }
  | { type: "leave_queue" }
  | { type: "move"; direction: -1 | 0 | 1 }
  | { type: "ping" }

// Server -> Client
export type ServerMessage =
  | { type: "queue_joined"; position: number; mode: GameMode }
  | { type: "queue_left" }
  | { type: "game_found"; side: Side; opponentName: string; mode: GameMode }
  | { type: "countdown"; seconds: number }
  | { type: "game_start" }
  | { type: "game_sync"; state: SerializedEngine }
  | { type: "paddle_update"; side: Side; paddle: SerializedPaddle }
  | { type: "score_update"; score: { left: number; right: number } }
  | { type: "game_over" }
  | { type: "tournament_result"; result: TournamentResult }
  | { type: "error"; message: string }
  | { type: "pong" }
