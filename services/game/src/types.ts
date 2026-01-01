// ============================================
// GAME TYPES & STATES
// ============================================

import { JWTUser } from "@ft_transcendence/shared"
import type { WebSocket } from "ws"
import { SerializedEngine, SerializedPaddle } from "./engine"

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
  | { type: "queue_joined"; position: number }
  | { type: "queue_left" }
  | { type: "game_found"; side: Side; opponentName: string }
  | { type: "countdown"; seconds: number }
  | { type: "game_start" }
  | { type: "game_sync"; state: SerializedEngine }
  | { type: "paddle_update"; side: Side; paddle: SerializedPaddle }
  | { type: "score_update"; score: { left: number; right: number } }
  | { type: "game_over" }
  | { type: "tournament_result"; rankings: string[] }
  | { type: "error"; message: string }
  | { type: "pong" }
