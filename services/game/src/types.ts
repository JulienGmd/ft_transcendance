// ============================================
// GAME TYPES & STATES
// ============================================

// --- Enums ---

export enum GameMode {
  NORMAL = "normal",
  TOURNAMENT = "tournament",
}

export enum GameState {
  WAITING = "waiting",
  COUNTDOWN = "countdown",
  PLAYING = "playing",
  FINISHED = "finished",
}

export enum PlayerSide {
  LEFT = "left",
  RIGHT = "right",
}

export enum InputKey {
  UP = "up",
  DOWN = "down",
}

export enum InputAction {
  PRESS = "press",
  RELEASE = "release",
}

// --- Game Constants ---

export const GAME_CONFIG = {
  // Canvas dimensions (logical units)
  WIDTH: 800,
  HEIGHT: 600,

  // Paddle
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 100,
  PADDLE_SPEED: 400, // pixels per second
  PADDLE_MARGIN: 30, // distance from edge

  // Ball
  BALL_RADIUS: 10,
  BALL_INITIAL_SPEED: 300, // pixels per second
  BALL_SPEED_INCREMENT: 20, // increase on each hit
  BALL_MAX_SPEED: 600,

  // Game
  WINNING_SCORE: 3,
  COUNTDOWN_SECONDS: 3,
  SYNC_INTERVAL_MS: 300, // sync ball every 200ms
  TICK_RATE_MS: 32, // ~30 FPS for server tick
} as const

// --- Interfaces ---

export interface Vector2D {
  x: number
  y: number
}

export interface Ball {
  position: Vector2D
  velocity: Vector2D
  radius: number
  predictedArrival: {
    time: number
    y: number
    side: PlayerSide
  } | null
}

export interface Paddle {
  y: number
  width: number
  height: number
  speed: number
  direction: -1 | 0 | 1
}

export interface Player {
  id: string
  side: PlayerSide
  paddle: Paddle
  score: number
  connected: boolean
  lastInputTime: number
}

export interface Game {
  id: string
  mode: GameMode
  state: GameState
  players: Map<string, Player>
  ball: Ball
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
  winnerId: string | null
  lastUpdateTime: number
  countdownEnd: number | null
}

// --- WebSocket Messages ---

// Client -> Server
// Note: playerId is determined server-side from the authenticated token
export type ClientMessage =
  | { type: "join_normal" }
  | { type: "join_tournament" }
  | { type: "leave_queue" }
  | { type: "input"; key: InputKey; action: InputAction }
  | { type: "ping" }

// Server -> Client
export type ServerMessage =
  | { type: "queue_joined"; position: number; mode: GameMode }
  | { type: "queue_left" }
  | { type: "game_found"; gameId: string; side: PlayerSide; opponentName: string; mode: GameMode }
  | { type: "countdown"; seconds: number }
  | { type: "game_start" }
  | { type: "game_state"; state: GameStateSnapshot }
  | { type: "ball_sync"; ball: BallSync }
  | { type: "paddle_update"; side: PlayerSide; y: number; direction: -1 | 0 | 1 }
  | { type: "score_update"; left: number; right: number }
  | { type: "game_over"; finalScore: { left: number; right: number }; mode: GameMode }
  | { type: "tournament_waiting"; message: string } // Waiting for other match to finish
  | { type: "tournament_result"; rankings: TournamentRanking[] }
  | { type: "opponent_disconnected" }
  | { type: "opponent_reconnected" }
  | { type: "error"; message: string }
  | { type: "pong" }

// Tournament result (sent to frontend - no playerId for security)
export interface TournamentRanking {
  rank: number // 1, 2, 3, 4
  username: string
}

// Snapshot for full state sync
export interface GameStateSnapshot {
  gameId: string
  state: GameState
  ball: BallSync
  paddles: {
    left: { y: number; direction: -1 | 0 | 1 }
    right: { y: number; direction: -1 | 0 | 1 }
  }
  score: { left: number; right: number }
  timestamp: number
}

// Ball sync data
export interface BallSync {
  position: Vector2D
  velocity: Vector2D
  timestamp: number
}

// --- Queue ---

// Socket interface for queue (matches ISocket from communication.ts)
export interface QueueSocket {
  send(data: string): void
  readyState: number
}

export interface QueueEntry {
  playerId: string
  username: string
  joinedAt: number
  socket: QueueSocket
}
