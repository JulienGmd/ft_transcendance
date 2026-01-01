// ============================================
// GAME PAGE - Pong Client
// ============================================

// TODO tournament waiting

import { ClientMessage, SerializedEngine, ServerMessage, Side, Vector2D } from "../gameSharedTypes.js"
import { checkEls, getUser } from "../utils.js"

// ============================================
// DOM ELEMENTS
// ============================================

let els: {
  canvas: HTMLCanvasElement

  menuOverlay: HTMLElement
  menuJoinNormalBtn: HTMLElement
  menuJoinTournamentBtn: HTMLElement

  queueOverlay: HTMLElement
  queuePosition: HTMLElement
  queueLeaveBtn: HTMLElement

  countdownOverlay: HTMLElement
  countdownNumber: HTMLElement

  gameOverOverlay: HTMLElement
  gameOverText: HTMLElement
  gameOverScore: HTMLElement
  gameOverPlayAgainBtn: HTMLElement

  tournamentResultOverlay: HTMLElement
  tournamentResultRankings: HTMLElement
  tournamentResultPlayAgainBtn: HTMLElement

  disconnectedOverlay: HTMLElement

  leftPlayerName: HTMLElement
  rightPlayerName: HTMLElement
  scoreLeft: HTMLElement
  scoreRight: HTMLElement
}

let ctx: CanvasRenderingContext2D

// ============================================
// CONSTANTS (same as backend)
// ============================================

// TODO GET request to retrieve
const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 100,
  PADDLE_SPEED: 400,
  PADDLE_MARGIN: 30,
  BALL_RADIUS: 10,
} as const

// ============================================
// STATE
// ============================================

let ws: WebSocket | undefined
let shouldReconnect = true
let reconnectInterval: number | undefined
let animationFrameId: number | undefined
let lastFrameTime = 0

let state = defaultState()

function defaultState(): {
  game: SerializedEngine
  side: Side
  clientBallPrediction: Vector2D
} {
  return {
    game: {
      ball: {
        time: 0, // Time since last bounce/launch
        pos: { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 }, // Pos at last bounce/launch
        velocity: { x: 0, y: 0 }, // Velocity at last bounce/launch
      },
      paddles: {
        left: { y: CONFIG.HEIGHT / 2, direction: 0 },
        right: { y: CONFIG.HEIGHT / 2, direction: 0 },
      },
      score: { left: 0, right: 0 },
    },
    side: Side.LEFT,
    // Ball position simulated by the client based on last bounce pos/velocity
    clientBallPrediction: { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 },
  }
}

// ============================================
// LIFECYCLE
// ============================================

export function onGuard(route: string): boolean {
  return !!getUser()
}

export function onMount(): void {
  // Get DOM elements
  els = {
    canvas: document.querySelector("#canvas")!,

    menuOverlay: document.querySelector("#menu-overlay")!,
    menuJoinNormalBtn: document.querySelector("#menu-join-normal-btn")!,
    menuJoinTournamentBtn: document.querySelector("#menu-join-tournament-btn")!,

    queueOverlay: document.querySelector("#queue-overlay")!,
    queuePosition: document.querySelector("#queue-position")!,
    queueLeaveBtn: document.querySelector("#queue-leave-btn")!,

    countdownOverlay: document.querySelector("#countdown-overlay")!,
    countdownNumber: document.querySelector("#countdown-number")!,

    gameOverOverlay: document.querySelector("#game-over-overlay")!,
    gameOverText: document.querySelector("#game-over-text")!,
    gameOverScore: document.querySelector("#game-over-score")!,
    gameOverPlayAgainBtn: document.querySelector("#game-over-play-again-btn")!,

    tournamentResultOverlay: document.querySelector("#tournament-result-overlay")!,
    tournamentResultRankings: document.querySelector("#tournament-result-rankings")!,
    tournamentResultPlayAgainBtn: document.querySelector("#tournament-result-play-again-btn")!,

    disconnectedOverlay: document.querySelector("#disconnected-overlay")!,

    leftPlayerName: document.querySelector("#left-player-name")!,
    rightPlayerName: document.querySelector("#right-player-name")!,
    scoreLeft: document.querySelector("#score-left")!,
    scoreRight: document.querySelector("#score-right")!,
  }
  checkEls(els)

  ctx = els.canvas.getContext("2d")!

  // Event listeners
  els.menuJoinNormalBtn.addEventListener("click", joinNormal)
  els.menuJoinTournamentBtn.addEventListener("click", joinTournament)
  els.queueLeaveBtn.addEventListener("click", leaveQueue)
  els.gameOverPlayAgainBtn.addEventListener("click", playAgain)
  els.tournamentResultPlayAgainBtn.addEventListener("click", playAgain)
  document.addEventListener("keydown", onKeyDown)
  document.addEventListener("keyup", onKeyUp)

  connectWebSocket()
  startTick()
}

// Clean
export function onDestroy(): void {
  document.removeEventListener("keydown", onKeyDown)
  document.removeEventListener("keyup", onKeyUp)

  disconnectWebSocket()
  stopTick()
}

// ============================================
// WEBSOCKET
// ============================================

function connectWebSocket(): void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const wsUrl = `${protocol}//${window.location.host}/api/game/ws`

  shouldReconnect = true
  ws = new WebSocket(wsUrl)

  ws.onopen = () => onWsOpen()
  ws.onclose = () => onWsClose()
  ws.onmessage = (e) => onWsMessage(e)
  ws.onerror = (err) => console.error("[WS] Error:", err)
}

function disconnectWebSocket(): void {
  clearInterval(reconnectInterval)
  reconnectInterval = undefined

  shouldReconnect = false // prevent reconnect (ws.close triggers ws.onclose)
  ws?.close()
  ws = undefined
}

function send(message: ClientMessage): void {
  if (ws?.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(message))
}

// ============================================
// MESSAGE HANDLERS
// ============================================

function onWsOpen(): void {
  console.log("[WS] Connected")

  clearInterval(reconnectInterval)
  reconnectInterval = undefined

  switchOverlay(els.menuOverlay)
  hideElement(els.disconnectedOverlay)
}

function onWsClose(): void {
  console.log("[WS] Disconnected")

  if (shouldReconnect && !reconnectInterval) {
    // @ts-ignore return type is number but we have @types/tsnode installed so it thinks it's NodeJS.Timeout
    reconnectInterval = setInterval(connectWebSocket, 5000)
    showElement(els.disconnectedOverlay)
  }
}

function parseMessage(e: MessageEvent<any>): ServerMessage | undefined {
  try {
    return JSON.parse(e.data) as ServerMessage
  } catch (err) {
    console.error("[WS] Parse error:", err)
    return
  }
}

function onWsMessage(e: MessageEvent<any>): void {
  const msg = parseMessage(e)
  if (!msg)
    return

  switch (msg.type) {
    case "queue_joined":
      els.queuePosition.textContent = `${msg.position}`
      switchOverlay(els.queueOverlay)
      break

    case "queue_left":
      switchOverlay(els.menuOverlay)
      break

    case "game_found":
      state = defaultState()
      state.side = msg.side
      els.leftPlayerName.textContent = state.side === Side.LEFT ? getUser()!.username : msg.opponentName
      els.rightPlayerName.textContent = state.side === Side.RIGHT ? getUser()!.username : msg.opponentName
      break

    case "countdown":
      if (msg.seconds > 0) {
        els.countdownNumber.textContent = `${msg.seconds}`
        switchOverlay(els.countdownOverlay)
      }
      break

    case "game_start":
      hideOverlays()
      break

    case "game_sync":
      state.game = msg.state
      // Note: no need to update state.clientBallPrediction because it's based on pos/velocity since last bounce
      break

    case "paddle_update":
      state.game.paddles[msg.side] = msg.paddle
      break

    case "score_update":
      state.game.score = msg.score
      els.scoreLeft.textContent = `${msg.score.left}`
      els.scoreRight.textContent = `${msg.score.right}`
      break

    case "game_over":
      updateGameOverOverlay()
      switchOverlay(els.gameOverOverlay)
      break

    case "tournament_result":
      updateTournamentOverlay(msg.rankings)
      switchOverlay(els.tournamentResultOverlay)
      break

    case "error":
      console.error("[Game] Server error:", msg.message)
      break
  }
}

// ============================================
// INPUT HANDLING
// ============================================

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    state.game.paddles[state.side].direction = -1
    send({ type: "move", direction: -1 })
    e.preventDefault()
  }

  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    state.game.paddles[state.side].direction = 1
    send({ type: "move", direction: 1 })
    e.preventDefault()
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    // Prevent stop movement if opposite key is still pressed
    if (state.game.paddles[state.side].direction === -1) {
      state.game.paddles[state.side].direction = 0
      send({ type: "move", direction: 0 })
      e.preventDefault()
    }
  }

  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    // Prevent stop movement if opposite key is still pressed
    if (state.game.paddles[state.side].direction === 1) {
      state.game.paddles[state.side].direction = 0
      send({ type: "move", direction: 0 })
      e.preventDefault()
    }
  }
}

// ============================================
// GAME LOOP & RENDERING
// ============================================

function startTick(): void {
  if (animationFrameId)
    return
  tick()
}

function stopTick(): void {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = undefined
  }
}

function tick(): void {
  animationFrameId = requestAnimationFrame(tick) // Recall this function next frame

  if (lastFrameTime <= 0) {
    lastFrameTime = performance.now()
    return
  }

  const now = performance.now()
  const deltaTime = (now - lastFrameTime) / 1000
  lastFrameTime = now

  updateBall()
  updatePaddles(deltaTime)
  render()
}

/**
 * Update ball position with wall and paddle bounce handling based on
 * position/velocity since last bounce
 */
function updateBall(): void {
  // TODO interpolation

  // Wall bounce simulation
  const elapsed = (Date.now() - state.game.ball.time) / 1000
  state.clientBallPrediction.x = calculateXAfterDuration(elapsed)
  state.clientBallPrediction.y = calculateYAfterDuration(elapsed)

  // Paddle bounce simulation
  state.clientBallPrediction.x = simulatePaddleBounce(state.clientBallPrediction)
}

/**
 * @param duration Duration in seconds since last bounce/launch
 */
function calculateXAfterDuration(duration: number): number {
  return state.game.ball.pos.x + state.game.ball.velocity.x * duration
}

/**
 * Same function as backend to predict Y position after duration
 *
 * Calculate Y position after duration from last bounce/launch
 * using mathematical formula (no loop)
 *
 * Uses triangle wave / ping-pong formula to handle reflections
 *
 * Principle: unfold the reflections into a straight line, then fold back
 * with modulo and absolute value to simulate bounces
 *
 * @param duration Duration in seconds since last bounce/launch
 */
function calculateYAfterDuration(duration: number): number {
  const minY = CONFIG.BALL_RADIUS
  const maxY = CONFIG.HEIGHT - CONFIG.BALL_RADIUS
  const playableHeight = maxY - minY // zone where ball center can travel

  // Total displacement in Y
  const deltaY = state.game.ball.velocity.y * duration

  // Position relative to minY (normalize to 0-based)
  const relativeY = state.game.ball.pos.y - minY + deltaY

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

/**
 * Client paddle collision, waiting for server to bounce
 * @return new ball X position after paddle bounce
 */
function simulatePaddleBounce(ballPos: Vector2D): number {
  const isWithinPaddleYRange = (y: number, padY: number) =>
    Math.abs(y - padY) <= CONFIG.PADDLE_HEIGHT / 2 + CONFIG.BALL_RADIUS

  const ballLeft = ballPos.x - CONFIG.BALL_RADIUS
  const lPadSurfX = CONFIG.PADDLE_MARGIN + CONFIG.PADDLE_WIDTH
  const lPadY = state.game.paddles.left.y
  const lDelta = ballLeft - lPadSurfX
  if (lDelta <= 0 && isWithinPaddleYRange(ballPos.y, lPadY))
    return lPadSurfX - lDelta

  const ballRight = ballPos.x + CONFIG.BALL_RADIUS
  const rPadSurfX = CONFIG.WIDTH - CONFIG.PADDLE_MARGIN - CONFIG.PADDLE_WIDTH
  const rPadY = state.game.paddles.right.y
  const rDelta = ballRight - rPadSurfX
  if (rDelta >= 0 && isWithinPaddleYRange(ballPos.y, rPadY))
    return rPadSurfX - rDelta

  return ballPos.x
}

function updatePaddles(deltaTime: number): void {
  // TODO interpolation

  for (const side of [Side.LEFT, Side.RIGHT] as const) {
    const paddle = state.game.paddles[side]
    paddle.y += paddle.direction * CONFIG.PADDLE_SPEED * deltaTime
    paddle.y = clamp(paddle.y, CONFIG.PADDLE_HEIGHT / 2, CONFIG.HEIGHT - CONFIG.PADDLE_HEIGHT / 2)
  }
}

function render(): void {
  let styles = getComputedStyle(document.documentElement)

  // Clear canvas
  ctx.fillStyle = styles.getPropertyValue("--color-game-background")
  ctx.fillRect(0, 0, els.canvas.width, els.canvas.height)

  // Draw center line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(els.canvas.width / 2, 0)
  ctx.lineTo(els.canvas.width / 2, els.canvas.height)
  ctx.stroke()
  ctx.setLineDash([])

  // Left paddle (cyan)
  const lPadTLCorner = {
    x: CONFIG.PADDLE_MARGIN,
    y: state.game.paddles.left.y - CONFIG.PADDLE_HEIGHT / 2,
  }
  ctx.fillStyle = styles.getPropertyValue("--color-game-player1")
  ctx.fillRect(
    lPadTLCorner.x,
    lPadTLCorner.y,
    CONFIG.PADDLE_WIDTH,
    CONFIG.PADDLE_HEIGHT,
  )

  // Right paddle (fuchsia)
  const rPadTLCorner = {
    x: CONFIG.WIDTH - CONFIG.PADDLE_MARGIN - CONFIG.PADDLE_WIDTH,
    y: state.game.paddles.right.y - CONFIG.PADDLE_HEIGHT / 2,
  }
  ctx.fillStyle = styles.getPropertyValue("--color-game-player2")
  ctx.fillRect(
    rPadTLCorner.x,
    rPadTLCorner.y,
    CONFIG.PADDLE_WIDTH,
    CONFIG.PADDLE_HEIGHT,
  )

  // Draw ball
  ctx.fillStyle = "#dedede"
  ctx.beginPath()
  ctx.arc(state.clientBallPrediction.x, state.clientBallPrediction.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Return all overlays except disconnected overlay
 */
function getOverlays(): HTMLElement[] {
  return [
    els.menuOverlay,
    els.queueOverlay,
    els.countdownOverlay,
    els.gameOverOverlay,
    els.tournamentResultOverlay,
  ]
}

function switchOverlay(overlay: HTMLElement): void {
  showElement(overlay)
  getOverlays().forEach((el) => el !== overlay && hideElement(el))
}

/**
 * Hide all overlays except the ones provided and the disconnected overlay
 */
function hideOverlays(): void {
  getOverlays().forEach((el) => hideElement(el))
}

function showElement(el: HTMLElement): void {
  el.classList.remove("hidden")
}

function hideElement(el: HTMLElement): void {
  el.classList.add("hidden")
}

function updateGameOverOverlay(): void {
  const won = state.side === Side.LEFT
    ? state.game.score.left > state.game.score.right
    : state.game.score.right > state.game.score.left
  els.gameOverText.textContent = won ? "You Win!" : "You Lose"
  els.gameOverScore.textContent = `${state.game.score.left} - ${state.game.score.right}`
}

function updateTournamentOverlay(rankings: string[]): void {
  const medals = ["🥇", "🥈", "🥉", "💩"]
  const colors = ["#ffd700", "#c0c0c0", "#cd7f32", "#8b4513"]
  const myUsername = getUser()!.username
  els.tournamentResultRankings.innerHTML = rankings.map((username, i) => {
    const isMe = username === myUsername
    const colorClass = `text-[${colors[i]}]`
    const boldClass = isMe ? "font-bold" : ""
    const meTag = isMe ? " (You)" : ""
    return `<div class="${colorClass} ${boldClass}">${medals[i]} ${username}${meTag}</div>`
  }).join("")
}

// ============================================
// BUTTON HANDLERS
// ============================================

const joinNormal = () => send({ type: "join_normal" })
const joinTournament = () => send({ type: "join_tournament" })
const leaveQueue = () => send({ type: "leave_queue" })
const playAgain = () => switchOverlay(els.menuOverlay)

// ============================================
// UTILS
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
