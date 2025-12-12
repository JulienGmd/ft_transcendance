// --- Enums ---

export enum GameState {
  WAITING = 'waiting',
  COUNTDOWN = 'countdown',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

export enum PlayerSide {
  LEFT = 'left',
  RIGHT = 'right',
}

export enum InputKey {
  UP = 'up',
  DOWN = 'down',
}

export enum InputAction {
  PRESS = 'press',
  RELEASE = 'release',
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
  COUNTDOWN_SECONDS: 5,
  SYNC_INTERVAL_MS: 100, // sync ball every 100ms
  TICK_RATE_MS: 16, // ~60 FPS for paddle updates
} as const;

// --- Interfaces ---

export interface Vector2D {
  x: number;
  y: number;
}

export interface Ball {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  predictedArrival: {
    time: number;
    y: number;
    side: PlayerSide;
  } | null;
}

export interface Paddle {
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: -1 | 0 | 1;
}

export interface Player {
  id: string;
  side: PlayerSide;
  paddle: Paddle;
  score: number;
  connected: boolean;
  lastInputTime: number;
}

export interface Game {
  id: string;
  state: GameState;
  players: Map<string, Player>;
  ball: Ball;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  winnerId: string | null;
  lastUpdateTime: number;
  countdownEnd: number | null;
}


// --- WebSocket Messages ---

// Client -> Server
export type ClientMessage =
  | { type: 'join_queue'; playerId: string }
  | { type: 'leave_queue'; playerId: string }
  | { type: 'input'; key: InputKey; action: InputAction }
  | { type: 'ping' };

// Server -> Client
export type ServerMessage =
  | { type: 'queue_joined'; position: number }
  | { type: 'queue_left' }
  | { type: 'game_found'; gameId: string; side: PlayerSide; opponent: string }
  | { type: 'countdown'; seconds: number }
  | { type: 'game_start' }
  | { type: 'game_state'; state: GameState }
  | { type: 'ball_sync'; ball: BallSync }
  | { type: 'paddle_update'; side: PlayerSide; y: number; direction: -1 | 0 | 1 }
  | { type: 'score_update'; left: number; right: number }
  | { type: 'game_over'; winnerId: string; finalScore: { left: number; right: number } }
  | { type: 'opponent_disconnected' }
  | { type: 'opponent_reconnected' }
  | { type: 'error'; message: string }
  | { type: 'pong' };

// Snapshot for full state sync
export interface GameStateSnapshot {
  gameId: string;
  state: GameState;
  ball: BallSync;
  paddles: {
    left: { y: number; direction: -1 | 0 | 1 };
    right: { y: number; direction: -1 | 0 | 1 };
  };
  score: { left: number; right: number };
  timestamp: number;
}

// Ball sync data
export interface BallSync {
  position: Vector2D;
  velocity: Vector2D;
  timestamp: number;
}
