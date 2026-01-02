// ============================================
// GAME ENGINE - Physics & Logic
// ============================================

import {
  BALL_INITIAL_SPEED,
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BALL_SPEED_INCREMENT,
  HEIGHT,
  PADDLE_HEIGHT,
  PADDLE_MARGIN,
  PADDLE_SPEED,
  PADDLE_WIDTH,
  WIDTH,
  WINNING_SCORE,
} from "./gameConfig"
import { SerializedBall, SerializedEngine, SerializedPaddle, Side, Vector2D } from "./sharedTypes"

// ============================================
// TYPES
// ============================================

interface GameTickResult {
  scorer?: Side // If gameOver is true, this is also the winner
  gameOver?: boolean
  launched?: boolean
  paddleBounce?: boolean // True if ball bounced off a paddle this tick
}

// ============================================
// UTILITY
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function magnitude(v: Vector2D): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2)
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// ============================================
// PADDLE
// ============================================

class Paddle {
  readonly isLeft: boolean
  readonly x: number = 0

  private y: number = HEIGHT / 2
  private direction: -1 | 0 | 1 = 0

  private readonly minY = PADDLE_HEIGHT / 2
  private readonly maxY = HEIGHT - PADDLE_HEIGHT / 2

  getY(): number {
    return this.y
  }

  getDirection(): -1 | 0 | 1 {
    return this.direction
  }

  constructor(isLeft: boolean) {
    this.isLeft = isLeft
    this.x = isLeft ? PADDLE_MARGIN + PADDLE_WIDTH / 2 : WIDTH - PADDLE_MARGIN - PADDLE_WIDTH / 2
  }

  // ===== MOVEMENT ===========================

  updateDirection(direction: -1 | 0 | 1): void {
    this.direction = direction
  }

  updatePosition(deltaTime: number): void {
    this.y += this.direction * PADDLE_SPEED * deltaTime
    this.y = clamp(this.y, this.minY, this.maxY)
  }

  // ===== SERIALIZATION ======================

  serialize(): SerializedPaddle {
    return { y: this.y, direction: this.direction }
  }
}

// ============================================
// BALL
// ============================================

class Ball {
  private time: number = 0 // Time from last paddle bounce/launch
  private pos: Vector2D = { x: 0, y: 0 } // Pos from last paddle bounce/launch
  private velocity: Vector2D = { x: 0, y: 0 } // Velocity from last paddle bounce/launch
  private prediction?: { time: number; pos: Vector2D } // Predicted arrival at paddle

  constructor() {
    this.reset()
  }

  reset(): void {
    this.time = Date.now()
    this.pos = { x: WIDTH / 2, y: HEIGHT / 2 }
    this.velocity = { x: 0, y: 0 }
    this.prediction = undefined
  }

  // ===== LAUNCH =============================

  launch(goingLeft: boolean = Math.random() < 0.5): void {
    // angle = deg / 360 * 2PI
    let angle = randomInRange(-45, 45) * (Math.PI / 180) // -45 <-> 45 degrees
    if (goingLeft)
      angle += Math.PI // 135 <-> 225 degrees

    this.time = Date.now()
    this.velocity = this.createVelocityFromAngle(angle, BALL_INITIAL_SPEED)
    this.prediction = this.predictArrivalAtPaddle()
  }

  private createVelocityFromAngle(angle: number, speed: number): Vector2D {
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
  }

  // ===== TRAJECTORY ===========================

  /**
   * Predict ball arrival at paddle from last bounce/launch
   */
  private predictArrivalAtPaddle(): Ball["prediction"] | undefined {
    const x = this.velocity.x < 0
      ? PADDLE_MARGIN + PADDLE_WIDTH + BALL_RADIUS
      : WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_RADIUS

    const duration = this.calculateDurationToReachX(x)
    if (!duration)
      return
    const y = this.calculateYAfterDuration(duration)

    return { time: Date.now() + duration * 1000, pos: { x, y } }
  }

  /**
   * Calculate duration to reach given X from last bounce/launch
   * @returns duration in seconds, or undefined if not reachable
   */
  private calculateDurationToReachX(x: number): number | undefined {
    if (this.velocity.x === 0)
      return
    const duration = (x - this.pos.x) / this.velocity.x // v = d/t -> t = d/v
    if (duration < 0)
      return
    return duration
  }

  /**
   * Calculate Y position after duration from last bounce/launch
   * using mathematical formula (no loop)
   *
   * Uses triangle wave / ping-pong formula to handle reflections
   *
   * Principle: unfold the reflections into a straight line, then fold back
   * with modulo and absolute value to simulate bounces
   *
   * @param duration duration in seconds
   */
  private calculateYAfterDuration(duration: number): number {
    const minY = BALL_RADIUS
    const maxY = HEIGHT - BALL_RADIUS
    const playableHeight = maxY - minY // zone where ball center can travel

    // Total displacement in Y
    const deltaY = this.velocity.y * duration

    // Position relative to minY (normalize to 0-based)
    const relativeY = this.pos.y - minY + deltaY

    // Use triangle wave formula: ping-pong between 0 and playableHeight
    // First, get position modulo (2 * playableHeight) for full bounce cycle
    const cycleLength = 2 * playableHeight
    let normalized = relativeY % cycleLength

    // Handle negative modulo (JS behavior)
    if (normalized < 0)
      normalized += cycleLength

    // Triangle wave: if in second half of cycle, reflect back
    const finalRelativeY = normalized <= playableHeight
      ? normalized
      : cycleLength - normalized

    return minY + finalRelativeY
  }

  isPredictionTimeElapsed(): boolean {
    const now = Date.now()
    return !!this.prediction && now >= this.prediction.time
  }

  getDirection(): Side {
    return this.velocity.x < 0 ? Side.LEFT : Side.RIGHT
  }

  isMoving(): boolean {
    return this.velocity.x !== 0 || this.velocity.y !== 0
  }

  // ===== COLLISION ==========================

  checkPaddleCollision(paddle: Paddle): boolean {
    if (!this.prediction)
      return false

    // There can't be a collision if predicted time not reached
    if (!this.isPredictionTimeElapsed())
      return false

    // Note: don't check X overlap because lag can make ball skip over paddle
    const dy = Math.abs(this.prediction.pos.y - paddle.getY())
    return dy <= PADDLE_HEIGHT / 2 + BALL_RADIUS
  }

  // ===== BOUNCE =============================

  bounceOnPaddle(paddle: Paddle): void {
    if (!this.prediction)
      return

    const bounceAngle = this.calculateBounceAngle(paddle)
    const newSpeed = this.calculateNewSpeed()
    const direction = this.getDirection() === Side.LEFT ? 1 : -1
    this.time = Date.now()
    this.pos = { ...this.prediction.pos }
    this.velocity = {
      x: Math.cos(bounceAngle) * newSpeed * direction,
      y: Math.sin(bounceAngle) * newSpeed,
    }
    this.prediction = this.predictArrivalAtPaddle()
  }

  private calculateBounceAngle(paddle: Paddle): number {
    const ballY = this.prediction?.pos.y ?? this.pos.y
    const normalizedRelativeY = (ballY - paddle.getY()) / (PADDLE_HEIGHT / 2)
    return normalizedRelativeY * (Math.PI / 4)
  }

  private calculateNewSpeed(): number {
    return Math.min(magnitude(this.velocity) + BALL_SPEED_INCREMENT, BALL_MAX_SPEED)
  }

  // ===== SERIALIZATION ======================

  serialize(): SerializedBall {
    return { time: this.time, pos: { ...this.pos }, velocity: { ...this.velocity } }
  }
}

// ============================================
// ENGINE CLASS
// ============================================

export class Engine {
  private ball = new Ball()
  private paddles = { left: new Paddle(true), right: new Paddle(false) }
  private score = { left: 0, right: 0 }
  private lastUpdateTime: number = -1
  private needReset: boolean = false

  getScore(): { left: number; right: number } {
    return { ...this.score }
  }

  constructor() {
    this.reset()
  }

  reset(): void {
    this.ball.reset()
    // Don't reset paddles to allow continuous movement between rounds
    // Don't reset score to allow match continuation
    this.lastUpdateTime = -1
    this.needReset = false
  }

  // ===== UTILITY ============================

  private getPaddleInBallDirection(): Paddle {
    return this.ball.getDirection() === Side.LEFT ? this.paddles.left : this.paddles.right
  }

  // ===== TICK ==============================

  tick(updateBall: boolean): GameTickResult {
    const result: GameTickResult = {}

    if (this.needReset)
      return result

    if (this.lastUpdateTime === -1) {
      this.lastUpdateTime = Date.now()
      return result
    }

    const now = Date.now()
    const deltaTime = (now - this.lastUpdateTime) / 1000
    this.lastUpdateTime = now

    // Always update paddle positions
    this.paddles.left.updatePosition(deltaTime)
    this.paddles.right.updatePosition(deltaTime)

    if (updateBall) {
      if (!this.ball.isMoving()) {
        this.ball.launch()
        result.launched = true
      }

      const paddle = this.getPaddleInBallDirection()

      // Check for paddle collision
      if (this.ball.checkPaddleCollision(paddle)) {
        this.ball.bounceOnPaddle(paddle)
        result.paddleBounce = true
        return result
      }

      // Check for score
      if (this.ball.isPredictionTimeElapsed()) {
        this.needReset = true
        result.scorer = this.ball.getDirection() === Side.LEFT ? Side.RIGHT : Side.LEFT
        this.score[result.scorer]++
        if (this.checkWin(this.score[result.scorer]))
          result.gameOver = true
        return result
      }
    }

    return result
  }

  // ===== SCORE ==============================

  private checkWin(playerScore: number): boolean {
    return playerScore >= WINNING_SCORE
  }

  // ===== INPUT ==============================

  setPaddleDirection(side: Side, direction: -1 | 0 | 1): SerializedPaddle {
    const paddle = side === Side.LEFT ? this.paddles.left : this.paddles.right
    paddle.updateDirection(direction)
    return paddle.serialize()
  }

  // ===== SERIALIZATION ======================

  serialize(): SerializedEngine {
    return {
      ball: this.ball.serialize(),
      paddles: {
        left: this.paddles.left.serialize(),
        right: this.paddles.right.serialize(),
      },
      score: { ...this.score },
    }
  }
}
