// ============================================
// GAME PAGE - Pong Client
// ============================================

import { getUser } from "../utils.js"

// --- Types ( same as backend ) ---

interface Vector2D {
  x: number
  y: number
}

interface BallSync {
  position: Vector2D
  velocity: Vector2D
  timestamp: number
}

interface GameStateSnapshot {
  gameId: string
  state: string
  ball: BallSync
  paddles: {
    left: { y: number; direction: -1 | 0 | 1 }
    right: { y: number; direction: -1 | 0 | 1 }
  }
  score: { left: number; right: number }
  timestamp: number
}

type GameMode = "normal" | "tournament"

interface TournamentRanking {
  rank: number
  username: string
}

type ServerMessage =
  | { type: "queue_joined"; position: number; mode: GameMode }
  | { type: "queue_left" }
  | { type: "game_found"; gameId: string; side: "left" | "right"; opponentName: string; mode: GameMode }
  | { type: "countdown"; seconds: number }
  | { type: "game_start" }
  | { type: "game_state"; state: GameStateSnapshot }
  | { type: "ball_sync"; ball: BallSync }
  | { type: "paddle_update"; side: "left" | "right"; y: number; direction: -1 | 0 | 1 }
  | { type: "score_update"; left: number; right: number }
  | { type: "game_over"; finalScore: { left: number; right: number }; mode: GameMode }
  | { type: "tournament_waiting"; message: string }
  | { type: "tournament_result"; rankings: TournamentRanking[] }
  | { type: "opponent_disconnected" }
  | { type: "opponent_reconnected" }
  | { type: "error"; message: string }
  | { type: "pong" }

// --- Constants (same as backend) ---

const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 100,
  PADDLE_SPEED: 400,
  PADDLE_MARGIN: 30,
  BALL_RADIUS: 10,
} as const

// --- State ---

let ws: WebSocket | null = null
let myUsername: string | null = null
let mySide: "left" | "right" | null = null
let gameId: string | null = null
let currentMode: GameMode | null = null
let animationFrameId: number | null = null
let lastFrameTime = 0

// Game state
const gameState = {
  ball: { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 },
  ballVelocity: { x: 0, y: 0 },
  ballLastSync: 0,
  paddles: {
    left: { y: CONFIG.HEIGHT / 2, direction: 0 as -1 | 0 | 1 },
    right: { y: CONFIG.HEIGHT / 2, direction: 0 as -1 | 0 | 1 },
  },
  score: { left: 0, right: 0 },
  isPlaying: false,
  isCountdown: false,
}

// Key states
const keysPressed = {
  up: false,
  down: false,
}

// --- DOM Elements ---

let statusText: HTMLElement | null = null
let queuePosition: HTMLElement | null = null
let positionNumber: HTMLElement | null = null
let countdownOverlay: HTMLElement | null = null
let countdownNumber: HTMLElement | null = null
let gameContainer: HTMLElement | null = null
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let scoreLeft: HTMLElement | null = null
let scoreRight: HTMLElement | null = null
let playerLeft: HTMLElement | null = null
let playerRight: HTMLElement | null = null
let gameOverOverlay: HTMLElement | null = null
let winnerText: HTMLElement | null = null
let finalScore: HTMLElement | null = null
let playAgainBtn: HTMLElement | null = null
let joinNormalBtn: HTMLElement | null = null
let joinTournamentBtn: HTMLElement | null = null
let queueButtons: HTMLElement | null = null
let leaveQueueBtn: HTMLElement | null = null
let disconnectLeft: HTMLElement | null = null
let disconnectRight: HTMLElement | null = null
let gameStatus: HTMLElement | null = null
let tournamentResultOverlay: HTMLElement | null = null
let tournamentRankings: HTMLElement | null = null
let tournamentDoneBtn: HTMLElement | null = null

// ============================================
// LIFECYCLE
// ============================================

export function onGuard(route: string): boolean {
  return !!getUser()
}

export function onMount(): void {
  // Get DOM elements
  statusText = document.getElementById("status-text")
  queuePosition = document.getElementById("queue-position")
  positionNumber = document.getElementById("position-number")
  countdownOverlay = document.getElementById("countdown-overlay")
  countdownNumber = document.getElementById("countdown-number")
  gameContainer = document.getElementById("game-container")
  canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null
  ctx = canvas?.getContext("2d") ?? null
  scoreLeft = document.getElementById("score-left")
  scoreRight = document.getElementById("score-right")
  playerLeft = document.getElementById("player-left")
  playerRight = document.getElementById("player-right")
  gameOverOverlay = document.getElementById("game-over-overlay")
  winnerText = document.getElementById("winner-text")
  finalScore = document.getElementById("final-score")
  playAgainBtn = document.getElementById("play-again-btn")
  joinNormalBtn = document.getElementById("join-normal-btn")
  joinTournamentBtn = document.getElementById("join-tournament-btn")
  queueButtons = document.getElementById("queue-buttons")
  leaveQueueBtn = document.getElementById("leave-queue-btn")
  disconnectLeft = document.getElementById("disconnect-left")
  disconnectRight = document.getElementById("disconnect-right")
  gameStatus = document.getElementById("game-status")
  tournamentResultOverlay = document.getElementById("tournament-result-overlay")
  tournamentRankings = document.getElementById("tournament-rankings")
  tournamentDoneBtn = document.getElementById("tournament-done-btn")

  // Event listeners
  joinNormalBtn?.addEventListener("click", onJoinNormal)
  joinTournamentBtn?.addEventListener("click", onJoinTournament)
  leaveQueueBtn?.addEventListener("click", onLeaveQueue)
  playAgainBtn?.addEventListener("click", onPlayAgain)
  tournamentDoneBtn?.addEventListener("click", onTournamentDone)
  document.addEventListener("keydown", onKeyDown)
  document.addEventListener("keyup", onKeyUp)

  // Check user is authenticated
  const user = getUser()
  if (!user) {
    setStatus("Please login to play")
    return
  }
  myUsername = user.username

  // Connect WebSocket
  connectWebSocket()
}

// Clean
export function onDestroy(): void {
  document.removeEventListener("keydown", onKeyDown)
  document.removeEventListener("keyup", onKeyUp)

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (ws) {
    ws.close()
    ws = null
  }
}

// ============================================
// WEBSOCKET
// ============================================

function connectWebSocket(): void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const wsUrl = `${protocol}//${window.location.host}/api/game/ws`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log("[WS] Connected")
    setStatus("Ready to play!")
    showElement(queueButtons)
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as ServerMessage
      handleServerMessage(message)
    } catch (err) {
      console.error("[WS] Parse error:", err)
    }
  }

  ws.onclose = () => {
    console.log("[WS] Disconnected")
    setStatus("Disconnected. Reconnecting...")
    setTimeout(connectWebSocket, 2000)
  }

  ws.onerror = (err) => {
    console.error("[WS] Error:", err)
  }
}

function send(message: object): void {
  if (ws?.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(message))
}

// ============================================
// MESSAGE HANDLERS
// ============================================

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case "queue_joined":
      currentMode = msg.mode
      setStatus(`In ${msg.mode} queue...`)
      positionNumber!.textContent = String(msg.position)
      showElement(queuePosition)
      showElement(leaveQueueBtn)
      hideElement(queueButtons)
      break

    case "queue_left":
      currentMode = null
      setStatus("Ready to play!")
      hideElement(queuePosition)
      hideElement(leaveQueueBtn)
      showElement(queueButtons)
      break

    case "game_found":
      gameId = msg.gameId
      mySide = msg.side
      currentMode = msg.mode
      resetGameState()
      setStatus(msg.mode === "tournament" ? "Tournament match found!" : "Game found!")
      hideElement(queuePosition)
      hideElement(leaveQueueBtn)
      hideElement(queueButtons)
      hideElement(gameOverOverlay)
      playerLeft!.textContent = mySide === "left" ? "You" : msg.opponentName
      playerRight!.textContent = mySide === "right" ? "You" : msg.opponentName
      break

    case "countdown":
      if (countdownNumber)
        countdownNumber.textContent = String(msg.seconds)
      if (msg.seconds === 0) {
        if (countdownOverlay)
          hideElement(countdownOverlay)
      } else {
        if (countdownOverlay)
          showElement(countdownOverlay)
        gameState.ballVelocity = { x: 0, y: 0 }
        gameState.ball = { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 }
      }
      showElement(gameContainer)
      hideElement(gameStatus)
      gameState.isPlaying = true
      gameState.isCountdown = true
      if (!animationFrameId)
        startGameLoop()
      break

    case "game_start":
      if (countdownOverlay)
        hideElement(countdownOverlay)
      gameState.isPlaying = true
      gameState.isCountdown = false
      startGameLoop()
      break

    case "game_state":
      applyGameState(msg.state)
      break

    case "ball_sync":
      syncBall(msg.ball)
      break

    case "paddle_update":
      gameState.paddles[msg.side].y = msg.y
      gameState.paddles[msg.side].direction = msg.direction
      break

    case "score_update":
      gameState.score = { left: msg.left, right: msg.right }
      updateScoreDisplay()
      break

    case "game_over":
      gameState.isPlaying = false
      showGameOver(msg.finalScore, msg.mode)
      break

    case "tournament_waiting":
      setStatus(msg.message)
      break

    case "tournament_result":
      showTournamentResult(msg.rankings)
      break

    case "opponent_disconnected":
      const opponentSide = mySide === "left" ? "right" : "left"
      if (opponentSide === "left")
        showElement(disconnectLeft)
      else
        showElement(disconnectRight)
      break

    case "opponent_reconnected":
      const reconnectedSide = mySide === "left" ? "right" : "left"
      if (reconnectedSide === "left")
        hideElement(disconnectLeft)
      else
        hideElement(disconnectRight)
      break

    case "error":
      console.error("[Game] Server error:", msg.message)
      setStatus(`Error: ${msg.message}`)
      break

    case "pong":
      break
  }
}

// ============================================
// GAME STATE
// ============================================

function resetGameState(): void {
  gameState.ball = { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 }
  gameState.ballVelocity = { x: 0, y: 0 }
  gameState.paddles.left.y = CONFIG.HEIGHT / 2
  gameState.paddles.left.direction = 0
  gameState.paddles.right.y = CONFIG.HEIGHT / 2
  gameState.paddles.right.direction = 0
  gameState.score = { left: 0, right: 0 }
  gameState.isCountdown = false
  updateScoreDisplay()
}

function applyGameState(state: GameStateSnapshot): void {
  syncBall(state.ball)
  gameState.paddles.left.y = state.paddles.left.y
  gameState.paddles.left.direction = state.paddles.left.direction
  gameState.paddles.right.y = state.paddles.right.y
  gameState.paddles.right.direction = state.paddles.right.direction
  gameState.score = state.score
  updateScoreDisplay()
}

function syncBall(ball: BallSync): void {
  // Interpolate ball position based on time since sync
  const now = Date.now()
  const elapsed = (now - ball.timestamp) / 1000

  gameState.ball.x = ball.position.x + ball.velocity.x * elapsed
  gameState.ball.y = ball.position.y + ball.velocity.y * elapsed
  gameState.ballVelocity = { ...ball.velocity }
  gameState.ballLastSync = now
}

// ============================================
// INPUT HANDLING
// ============================================

function onKeyDown(e: KeyboardEvent): void {
  if (!gameState.isPlaying)
    return

  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    if (!keysPressed.up) {
      keysPressed.up = true
      send({ type: "input", key: "up", action: "press" })
    }
    e.preventDefault()
  }

  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    if (!keysPressed.down) {
      keysPressed.down = true
      send({ type: "input", key: "down", action: "press" })
    }
    e.preventDefault()
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (!gameState.isPlaying)
    return

  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    if (keysPressed.up) {
      keysPressed.up = false
      send({ type: "input", key: "up", action: "release" })
    }
  }

  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    if (keysPressed.down) {
      keysPressed.down = false
      send({ type: "input", key: "down", action: "release" })
    }
  }
}

// ============================================
// GAME LOOP & RENDERING
// ============================================

function startGameLoop(): void {
  if (animationFrameId)
    return
  lastFrameTime = performance.now()
  gameLoop()
}

function gameLoop(): void {
  if (!gameState.isPlaying) {
    animationFrameId = null // Reset so startGameLoop can restart it
    return
  }

  const now = performance.now()
  const deltaTime = (now - lastFrameTime) / 1000
  lastFrameTime = now

  update(deltaTime)
  render()

  animationFrameId = requestAnimationFrame(gameLoop)
}

function update(deltaTime: number): void {
  if (!gameState.isCountdown)
    updateBallWithBounces(deltaTime)

  for (const side of ["left", "right"] as const) {
    const paddle = gameState.paddles[side]
    if (paddle.direction !== 0) {
      paddle.y += paddle.direction * CONFIG.PADDLE_SPEED * deltaTime
      paddle.y = clamp(paddle.y, CONFIG.PADDLE_HEIGHT / 2, CONFIG.HEIGHT - CONFIG.PADDLE_HEIGHT / 2)
    }
  }
}

/**
 * Update ball position with wall and paddle bounce handling
 */
function updateBallWithBounces(deltaTime: number): void {
  // Update X position
  gameState.ball.x += gameState.ballVelocity.x * deltaTime

  // Update Y position
  gameState.ball.y += gameState.ballVelocity.y * deltaTime

  // Simple wall bounce
  const minY = CONFIG.BALL_RADIUS
  const maxY = CONFIG.HEIGHT - CONFIG.BALL_RADIUS

  if (gameState.ball.y <= minY) {
    gameState.ball.y = minY
    gameState.ballVelocity.y = Math.abs(gameState.ballVelocity.y)
  }
  if (gameState.ball.y >= maxY) {
    gameState.ball.y = maxY
    gameState.ballVelocity.y = -Math.abs(gameState.ballVelocity.y)
  }
  checkClientPaddleCollision()
}

/**
 * Client paddle collision, waiting for server to bounce
 */
function checkClientPaddleCollision(): void {
  const ballX = gameState.ball.x
  const ballY = gameState.ball.y
  const ballRadius = CONFIG.BALL_RADIUS

  const leftPaddleX = CONFIG.PADDLE_MARGIN + CONFIG.PADDLE_WIDTH
  const leftPaddleY = gameState.paddles.left.y

  if (
    ballX - ballRadius <= leftPaddleX
    && ballX > CONFIG.PADDLE_MARGIN
    && Math.abs(ballY - leftPaddleY) <= CONFIG.PADDLE_HEIGHT / 2 + ballRadius
  ) {
    gameState.ball.x = leftPaddleX + ballRadius
  }

  const rightPaddleX = CONFIG.WIDTH - CONFIG.PADDLE_MARGIN - CONFIG.PADDLE_WIDTH
  const rightPaddleY = gameState.paddles.right.y

  if (
    ballX + ballRadius >= rightPaddleX
    && ballX < CONFIG.WIDTH - CONFIG.PADDLE_MARGIN
    && Math.abs(ballY - rightPaddleY) <= CONFIG.PADDLE_HEIGHT / 2 + ballRadius
  ) {
    gameState.ball.x = rightPaddleX - ballRadius
  }
}

function render(): void {
  if (!ctx || !canvas)
    return

  // Clear canvas
  ctx.fillStyle = "#111827"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw center line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(canvas.width / 2, 0)
  ctx.lineTo(canvas.width / 2, canvas.height)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw paddles
  const leftPaddleX = CONFIG.PADDLE_MARGIN
  const rightPaddleX = CONFIG.WIDTH - CONFIG.PADDLE_MARGIN - CONFIG.PADDLE_WIDTH

  // Left paddle (cyan)
  ctx.fillStyle = "#22d3ee"
  ctx.fillRect(
    leftPaddleX,
    gameState.paddles.left.y - CONFIG.PADDLE_HEIGHT / 2,
    CONFIG.PADDLE_WIDTH,
    CONFIG.PADDLE_HEIGHT,
  )

  // Right paddle (fuchsia)
  ctx.fillStyle = "#d946ef"
  ctx.fillRect(
    rightPaddleX,
    gameState.paddles.right.y - CONFIG.PADDLE_HEIGHT / 2,
    CONFIG.PADDLE_WIDTH,
    CONFIG.PADDLE_HEIGHT,
  )

  // Draw ball
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(gameState.ball.x, gameState.ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
}

// ============================================
// UI HELPERS
// ============================================

function setStatus(text: string): void {
  if (statusText)
    statusText.textContent = text
}

function showElement(el: HTMLElement | null): void {
  el?.classList.remove("hidden")
}

function hideElement(el: HTMLElement | null): void {
  el?.classList.add("hidden")
}

function updateScoreDisplay(): void {
  if (scoreLeft)
    scoreLeft.textContent = String(gameState.score.left)
  if (scoreRight)
    scoreRight.textContent = String(gameState.score.right)
}

function showGameOver(score: { left: number; right: number }, mode: GameMode): void {
  hideElement(gameContainer)
  // Determine if we won based on score and our side
  const iWon = mySide === "left" ? score.left > score.right : score.right > score.left
  if (winnerText)
    winnerText.textContent = iWon ? "You Win!" : "You Lose"
  if (finalScore)
    finalScore.textContent = `${score.left} - ${score.right}`

  // In tournament mode, hide play again button until tournament is fully over
  if (mode === "tournament")
    hideElement(playAgainBtn)
  else
    showElement(playAgainBtn)

  showElement(gameOverOverlay)
}

function showTournamentResult(rankings: TournamentRanking[]): void {
  hideElement(gameOverOverlay)
  hideElement(gameContainer)

  if (tournamentRankings) {
    const medals: Record<number, string> = {
      1: "🥇",
      2: "🥈",
      3: "🥉",
      4: "💩",
    }
    const medalColors: Record<number, string> = {
      1: "text-yellow-400", // Gold
      2: "text-gray-300", // Silver
      3: "text-amber-600", // Bronze
      4: "text-gray-500", // 4th
    }
    tournamentRankings.innerHTML = rankings.map((r) => {
      const isMe = r.username === myUsername
      const medal = medals[r.rank] || ""
      const color = medalColors[r.rank] || "text-white"
      const meTag = isMe ? " (You)" : ""
      const highlight = isMe ? "bg-fuchsia-900/50 rounded px-2" : ""
      return `<div class="${color} ${isMe ? "font-bold" : ""} ${highlight} py-1">${medal} ${r.username}${meTag}</div>`
    }).join("")
  }

  showElement(tournamentResultOverlay)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ============================================
// BUTTON HANDLERS
// ============================================

function onJoinNormal(): void {
  send({ type: "join_normal" })
}

function onJoinTournament(): void {
  send({ type: "join_tournament" })
}

function onLeaveQueue(): void {
  send({ type: "leave_queue" })
}

function onPlayAgain(): void {
  resetToMainMenu()
}

function onTournamentDone(): void {
  resetToMainMenu()
}

function resetToMainMenu(): void {
  // Reset game state
  resetGameState()
  gameState.isPlaying = false
  currentMode = null

  // Cancel any running animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // Reset UI
  hideElement(gameOverOverlay)
  hideElement(tournamentResultOverlay)
  hideElement(gameContainer)
  hideElement(disconnectLeft)
  hideElement(disconnectRight)
  showElement(gameStatus)
  showElement(queueButtons)
  setStatus("Ready to play!")

  // Reset game session
  gameId = null
  mySide = null
}
