// ============================================
// GAME TYPES & STATES
// ============================================

import { JWTUser } from "@ft_transcendence/shared"
import type { WebSocket } from "ws"
import { SerializedEngine, SerializedPaddle } from "./engine"
import { GameMode } from "./gameManager"

// --- Player ---

export type Player = JWTUser & {
  socket: WebSocket
}

// --- Enums ---

export enum Side {
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
  | { type: "game_found"; side: Side; opponentName: string; mode: GameMode }
  | { type: "countdown"; seconds: number }
  | { type: "game_start" }
  | { type: "game_sync"; state: SerializedEngine }
  | { type: "paddle_update"; side: Side; paddle: SerializedPaddle }
  | { type: "score_update"; score: { left: number; right: number } }
  | { type: "game_over" }
  | { type: "tournament_waiting"; message: string } // Waiting for other match to finish
  | { type: "tournament_result"; rankings: TournamentRanking[] }
  | { type: "error"; message: string }
  | { type: "pong" }

// Tournament result (sent to frontend - no playerId for security)
export interface TournamentRanking {
  rank: number // 1, 2, 3, 4
  username: string
}

// --- Queue ---

export interface QueueEntry {
  playerId: string
  username: string
  joinedAt: number
  socket: WebSocket
}
