// Canvas dimensions (logical units)
export const WIDTH = 800
export const HEIGHT = 600

// Paddle
export const PADDLE_WIDTH = 15
export const PADDLE_HEIGHT = 100
export const PADDLE_SPEED = 400 // pixels per second
export const PADDLE_MARGIN = 30 // distance from edge

// Ball
export const BALL_RADIUS = 10
export const BALL_INITIAL_SPEED = 300 // pixels per second
export const BALL_SPEED_INCREMENT = 20 // increase on each hit
export const BALL_MAX_SPEED = 600

// Game
export const WINNING_SCORE = 3
export const COUNTDOWN_SECONDS = 3
export const SYNC_RATE_MS = 300 // sync ball every 300ms
export const TICK_RATE_MS = 32 // ~30 FPS for server tick
