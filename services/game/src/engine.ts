// ============================================
// GAME ENGINE - Physics & Logic
// ============================================

import { ulid } from "ulid"
import {
  Ball,
  BallSync,
  Game,
  GAME_CONFIG,
  GameMode,
  GameState,
  GameStateSnapshot,
  Paddle,
  Player,
  PlayerSide,
  Vector2D,
} from "./types"

// ============================================
// UTILITY
// ============================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getBallSpeed(velocity: Vector2D): number {
  return Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
}

// ============================================
// BALL TRAJECTORY (SEPARATED FUNCTIONS)
// ============================================

export function calculateTimeToReachPaddle(ball: Ball): number | null {
  const { position, velocity } = ball
  const { WIDTH, PADDLE_MARGIN, PADDLE_WIDTH, BALL_RADIUS } = GAME_CONFIG
  if (velocity.x === 0)
    return null
  const targetX = velocity.x < 0
    ? PADDLE_MARGIN + PADDLE_WIDTH + BALL_RADIUS
    : WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_RADIUS
  const timeToReach = (targetX - position.x) / velocity.x
  return timeToReach > 0 ? timeToReach : null
}

export function getBallTargetSide(velocity: Vector2D): PlayerSide | null {
  if (velocity.x === 0)
    return null
  return velocity.x < 0 ? PlayerSide.LEFT : PlayerSide.RIGHT
}

/**
 * Calculate Y position at arrival using mathematical formula (no loop)
 * Uses triangle wave / ping-pong formula to handle reflections
 *
 * Principle: unfold the reflections into a straight line, then fold back
 * with modulo and absolute value to simulate bounces
 */
export function calculateYAtArrival(startY: number, velocityY: number, travelTime: number): number {
  const { HEIGHT, BALL_RADIUS } = GAME_CONFIG
  const minY = BALL_RADIUS
  const maxY = HEIGHT - BALL_RADIUS
  const playableHeight = maxY - minY // zone where ball center can travel

  if (playableHeight <= 0)
    return startY
  if (velocityY === 0)
    return startY

  // Total displacement in Y
  const deltaY = velocityY * travelTime

  // Position relative to minY (normalize to 0-based)
  const relativeY = startY - minY + deltaY

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

export function predictBallArrival(ball: Ball): Ball["predictedArrival"] {
  const timeToReach = calculateTimeToReachPaddle(ball)
  if (timeToReach === null)
    return null
  const side = getBallTargetSide(ball.velocity)
  if (side === null)
    return null
  const arrivalY = calculateYAtArrival(ball.position.y, ball.velocity.y, timeToReach)
  return { time: Date.now() + timeToReach * 1000, y: arrivalY, side }
}

// ============================================
// BALL CREATION
// ============================================

export function generateRandomAngle(): number {
  return (Math.random() * 90 - 45) * (Math.PI / 180)
}

export function createVelocityFromAngle(angle: number, speed: number, goingLeft: boolean): Vector2D {
  const direction = goingLeft ? -1 : 1
  return { x: Math.cos(angle) * speed * direction, y: Math.sin(angle) * speed }
}

export function createBall(towardsLeft: boolean = Math.random() < 0.5): Ball {
  const { WIDTH, HEIGHT, BALL_RADIUS, BALL_INITIAL_SPEED } = GAME_CONFIG
  const angle = generateRandomAngle()
  const velocity = createVelocityFromAngle(angle, BALL_INITIAL_SPEED, towardsLeft)
  const ball: Ball = {
    position: { x: WIDTH / 2, y: HEIGHT / 2 },
    velocity,
    radius: BALL_RADIUS,
    predictedArrival: null,
  }
  ball.predictedArrival = predictBallArrival(ball)
  return ball
}

export function resetBallToCenter(ball: Ball, towardsLeft: boolean): void {
  const { WIDTH, HEIGHT, BALL_INITIAL_SPEED } = GAME_CONFIG
  ball.position.x = WIDTH / 2
  ball.position.y = HEIGHT / 2
  const angle = generateRandomAngle()
  ball.velocity = createVelocityFromAngle(angle, BALL_INITIAL_SPEED, towardsLeft)
  ball.predictedArrival = predictBallArrival(ball)
}

// ============================================
// PADDLE
// ============================================

export function createPaddle(): Paddle {
  const { HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED } = GAME_CONFIG
  return { y: HEIGHT / 2, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, speed: PADDLE_SPEED, direction: 0 }
}

export function getPaddleBounds(): { minY: number; maxY: number } {
  const { HEIGHT, PADDLE_HEIGHT } = GAME_CONFIG
  return { minY: PADDLE_HEIGHT / 2, maxY: HEIGHT - PADDLE_HEIGHT / 2 }
}

export function updatePaddlePosition(paddle: Paddle, deltaTime: number): void {
  const { minY, maxY } = getPaddleBounds()
  paddle.y += paddle.direction * paddle.speed * deltaTime
  paddle.y = clamp(paddle.y, minY, maxY)
}

export function getPaddleX(side: PlayerSide): number {
  const { WIDTH, PADDLE_MARGIN, PADDLE_WIDTH } = GAME_CONFIG
  return side === PlayerSide.LEFT
    ? PADDLE_MARGIN + PADDLE_WIDTH / 2
    : WIDTH - PADDLE_MARGIN - PADDLE_WIDTH / 2
}

// ============================================
// COLLISION
// ============================================

export function checkBallPaddleCollision(
  ballX: number,
  ballY: number,
  ballRadius: number,
  paddleX: number,
  paddleY: number,
  paddleWidth: number,
  paddleHeight: number,
): boolean {
  const dx = Math.abs(ballX - paddleX)
  const dy = Math.abs(ballY - paddleY)
  return dx <= paddleWidth / 2 + ballRadius && dy <= paddleHeight / 2 + ballRadius
}

export function checkPaddleCollision(ball: Ball, paddle: Paddle, side: PlayerSide): boolean {
  const paddleX = getPaddleX(side)
  return checkBallPaddleCollision(
    ball.position.x,
    ball.position.y,
    ball.radius,
    paddleX,
    paddle.y,
    paddle.width,
    paddle.height,
  )
}

// ============================================
// BOUNCE
// ============================================

export function calculateBounceAngle(ballY: number, paddleY: number, paddleHeight: number): number {
  const relativeIntersectY = paddleY - ballY
  const normalizedIntersect = relativeIntersectY / (paddleHeight / 2)
  return normalizedIntersect * (Math.PI / 4)
}

export function calculateNewSpeed(currentSpeed: number): number {
  const { BALL_SPEED_INCREMENT, BALL_MAX_SPEED } = GAME_CONFIG
  return Math.min(currentSpeed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED)
}

export function bounceBallOnPaddle(ball: Ball, paddle: Paddle, side: PlayerSide, game?: Game): void {
  const bounceAngle = calculateBounceAngle(ball.position.y, paddle.y, paddle.height)
  const currentSpeed = getBallSpeed(ball.velocity)
  const newSpeed = calculateNewSpeed(currentSpeed)
  const direction = side === PlayerSide.LEFT ? 1 : -1
  ball.velocity.x = Math.cos(bounceAngle) * newSpeed * direction
  ball.velocity.y = -Math.sin(bounceAngle) * newSpeed
  ball.predictedArrival = predictBallArrival(ball)
  // Incrémente ballsReturned pour le joueur qui a renvoyé la balle
  if (game) {
    const player = getPlayerBySide(game, side)
    if (player)
      player.ballsReturned++
  }
}

// ============================================
// BALL MOVEMENT
// ============================================

export function moveBall(ball: Ball, deltaTime: number): void {
  ball.position.x += ball.velocity.x * deltaTime
  ball.position.y += ball.velocity.y * deltaTime
}

export function handleWallBounce(ball: Ball): void {
  const { HEIGHT, BALL_RADIUS } = GAME_CONFIG
  const minY = BALL_RADIUS
  const maxY = HEIGHT - BALL_RADIUS
  if (ball.position.y <= minY) {
    ball.position.y = minY
    ball.velocity.y = Math.abs(ball.velocity.y)
  } else if (ball.position.y >= maxY) {
    ball.position.y = maxY
    ball.velocity.y = -Math.abs(ball.velocity.y)
  }
}

export function updateBallPosition(ball: Ball, deltaTime: number): void {
  moveBall(ball, deltaTime)
  handleWallBounce(ball)
}

// ============================================
// SCORING
// ============================================

export function checkGoal(ball: Ball): PlayerSide | null {
  const { WIDTH, BALL_RADIUS } = GAME_CONFIG
  if (ball.position.x - BALL_RADIUS <= 0)
    return PlayerSide.RIGHT
  if (ball.position.x + BALL_RADIUS >= WIDTH)
    return PlayerSide.LEFT
  return null
}

export function checkWin(score: number): boolean {
  return score >= GAME_CONFIG.WINNING_SCORE
}

// ============================================
// PLAYER
// ============================================

export function createPlayer(id: string, username: string, side: PlayerSide): Player {
  return {
    id,
    username,
    side,
    paddle: createPaddle(),
    score: 0,
    ballsReturned: 0,
    connected: true,
    lastInputTime: Date.now(),
  }
}

export function incrementScore(player: Player): void {
  player.score++
}

// ============================================
// GAME
// ============================================

export function generateGameId(): string {
  return ulid()
}

export function createGame(
  player1Id: string,
  player1Username: string,
  player2Id: string,
  player2Username: string,
  mode: GameMode = GameMode.NORMAL,
): Game {
  const game: Game = {
    id: generateGameId(),
    mode,
    state: GameState.COUNTDOWN,
    players: new Map(),
    ball: createBall(),
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    winnerId: null,
    lastUpdateTime: Date.now(),
    countdownEnd: Date.now() + GAME_CONFIG.COUNTDOWN_SECONDS * 1000,
  }
  game.players.set(player1Id, createPlayer(player1Id, player1Username, PlayerSide.LEFT))
  game.players.set(player2Id, createPlayer(player2Id, player2Username, PlayerSide.RIGHT))
  return game
}

export function getPlayerBySide(game: Game, side: PlayerSide): Player | undefined {
  return [...game.players.values()].find((p) => p.side === side)
}

export function getOpponent(game: Game, playerId: string): Player | undefined {
  return [...game.players.values()].find((p) => p.id !== playerId)
}

// ============================================
// SNAPSHOTS
// ============================================

export function createBallSync(ball: Ball): BallSync {
  return { position: { ...ball.position }, velocity: { ...ball.velocity }, timestamp: Date.now() }
}

export function createGameSnapshot(game: Game): GameStateSnapshot {
  const leftPlayer = getPlayerBySide(game, PlayerSide.LEFT)
  const rightPlayer = getPlayerBySide(game, PlayerSide.RIGHT)
  return {
    gameId: game.id,
    state: game.state,
    ball: createBallSync(game.ball),
    paddles: {
      left: { y: leftPlayer?.paddle.y ?? GAME_CONFIG.HEIGHT / 2, direction: leftPlayer?.paddle.direction ?? 0 },
      right: { y: rightPlayer?.paddle.y ?? GAME_CONFIG.HEIGHT / 2, direction: rightPlayer?.paddle.direction ?? 0 },
    },
    score: { left: leftPlayer?.score ?? 0, right: rightPlayer?.score ?? 0 },
    timestamp: Date.now(),
  }
}

// ============================================
// GAME TICK
// ============================================

export interface GameTickResult {
  scored: PlayerSide | null
  gameOver: boolean
  winnerId: string | null
  paddleBounce: boolean // True if ball bounced off a paddle this tick
}

export function gameTick(game: Game): GameTickResult {
  const now = Date.now()
  const deltaTime = (now - game.lastUpdateTime) / 1000
  game.lastUpdateTime = now

  const result: GameTickResult = { scored: null, gameOver: false, winnerId: null, paddleBounce: false }

  // Always update paddle positions
  for (const player of game.players.values())
    updatePaddlePosition(player.paddle, deltaTime)

  // Only update ball and check scoring during PLAYING
  if (game.state !== GameState.PLAYING)
    return result

  // Check if paddle bounce
  const ball = game.ball
  if (ball.predictedArrival && now >= ball.predictedArrival.time) {
    const side = ball.predictedArrival.side
    const player = getPlayerBySide(game, side)!
    const { WIDTH, PADDLE_MARGIN, PADDLE_WIDTH, BALL_RADIUS } = GAME_CONFIG
    ball.position.x = side === PlayerSide.LEFT
      ? PADDLE_MARGIN + PADDLE_WIDTH + BALL_RADIUS
      : WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_RADIUS
    ball.position.y = ball.predictedArrival.y
    if (checkPaddleCollision(ball, player.paddle, side)) {
      bounceBallOnPaddle(ball, player.paddle, side, game)
      result.paddleBounce = true
    } else {
      const scorer = side === PlayerSide.LEFT ? PlayerSide.RIGHT : PlayerSide.LEFT
      const scoringPlayer = getPlayerBySide(game, scorer)!
      incrementScore(scoringPlayer)
      result.scored = scorer
      if (checkWin(scoringPlayer.score)) {
        game.state = GameState.FINISHED
        game.finishedAt = now
        game.winnerId = scoringPlayer.id
        result.gameOver = true
        result.winnerId = scoringPlayer.id
      } else {
        resetBallToCenter(ball, scorer === PlayerSide.LEFT)
      }
    }
  }
  updateBallPosition(ball, deltaTime)

  return result
}
