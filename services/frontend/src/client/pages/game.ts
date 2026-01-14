// ============================================
// GAME PAGE - Pong Client
// ============================================

import {
  ClientMessage,
  GameMode,
  SerializedEngine,
  ServerMessage,
  Side,
  TournamentResult,
  Vector2D,
} from "../gameSharedTypes.js"
import { checkEls, getUser } from "../utils.js"

// ============================================
// DOM ELEMENTS
// ============================================

let els: {
  gameCanvas: HTMLCanvasElement

  menuOverlay: HTMLElement
  menuJoinLocalBtn: HTMLElement
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
  tournamentResultWaiting: HTMLElement
  tournamentResultPlayAgainBtn: HTMLElement

  disconnectedOverlay: HTMLElement

  gameLeftPlayerName: HTMLElement
  gameRightPlayerName: HTMLElement
  gameScoreLeft: HTMLElement
  gameScoreRight: HTMLElement
}

let ctx: CanvasRenderingContext2D

// ============================================
// CONSTANTS (same as backend)
// ============================================

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
let inputs = {
  upPressed: false,
  downPressed: false,
}
let guestInputs = {
  upPressed: false,
  downPressed: false,
}
const touchIdToInfo: Map<number, { side: Side; dir: -1 | 1 }> = new Map()

function defaultState(): {
  game: SerializedEngine
  mode: GameMode
  side: Side
  interpolatedBallPos: Vector2D
  interpolatedPaddlesY: { left: number; right: number }
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
    mode: GameMode.NORMAL,
    side: Side.LEFT,
    interpolatedBallPos: { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 },
    interpolatedPaddlesY: {
      left: CONFIG.HEIGHT / 2,
      right: CONFIG.HEIGHT / 2,
    },
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
    gameCanvas: document.querySelector("#game-canvas")!,

    menuOverlay: document.querySelector("#menu-overlay")!,
    menuJoinLocalBtn: document.querySelector("#menu-join-local-btn")!,
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
    tournamentResultWaiting: document.querySelector("#tournament-result-waiting")!,
    tournamentResultPlayAgainBtn: document.querySelector("#tournament-result-play-again-btn")!,

    disconnectedOverlay: document.querySelector("#disconnected-overlay")!,

    gameLeftPlayerName: document.querySelector("#game-left-player-name")!,
    gameRightPlayerName: document.querySelector("#game-right-player-name")!,
    gameScoreLeft: document.querySelector("#game-score-left")!,
    gameScoreRight: document.querySelector("#game-score-right")!,
  }
  checkEls(els)

  ctx = els.gameCanvas.getContext("2d")!

  // Event listeners
  els.menuJoinLocalBtn.addEventListener("click", joinLocal)
  els.menuJoinNormalBtn.addEventListener("click", joinNormal)
  els.menuJoinTournamentBtn.addEventListener("click", joinTournament)
  els.queueLeaveBtn.addEventListener("click", leaveQueue)
  els.gameOverPlayAgainBtn.addEventListener("click", playAgain)
  els.tournamentResultPlayAgainBtn.addEventListener("click", playAgain)
  document.addEventListener("keydown", onKeyDown)
  document.addEventListener("keyup", onKeyUp)
  document.addEventListener("touchstart", onTouchStart)
  document.addEventListener("touchend", onTouchEnd)

  connectWebSocket()
  startTick()
}

// Clean
export function onDestroy(): void {
  document.removeEventListener("keydown", onKeyDown)
  document.removeEventListener("keyup", onKeyUp)
  document.removeEventListener("touchstart", onTouchStart)
  document.removeEventListener("touchend", onTouchEnd)

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
      state.mode = msg.mode
      els.queuePosition.textContent = `${msg.position}`
      switchOverlay(els.queueOverlay)
      break

    case "queue_left":
      switchOverlay(els.menuOverlay)
      break

    case "game_found":
      state = defaultState()
      state.mode = msg.mode
      state.side = msg.side
      els.gameScoreLeft.textContent = "0"
      els.gameScoreRight.textContent = "0"
      els.gameLeftPlayerName.textContent = state.side === Side.LEFT
        ? getUser()!.username
        : msg.opponentName || "Guest"
      els.gameRightPlayerName.textContent = state.side === Side.RIGHT
        ? getUser()!.username
        : msg.opponentName || "Guest"
      break

    case "countdown":
      if (msg.seconds > 0) {
        // Teleport the ball (don't let tick interpolate from last pos)
        state.interpolatedBallPos = { x: CONFIG.WIDTH / 2, y: CONFIG.HEIGHT / 2 }
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
      els.gameScoreLeft.textContent = `${msg.score.left}`
      els.gameScoreRight.textContent = `${msg.score.right}`
      break

    case "game_over":
      updateGameOverOverlay()
      switchOverlay(els.gameOverOverlay)
      break

    case "tournament_result":
      updateTournamentOverlay(msg.result)
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
  if (e.key === "w" || e.key === "W")
    onUpPressed(state.side)
  if (e.key === "s" || e.key === "S")
    onDownPressed(state.side)

  if (e.key === "ArrowUp")
    onUpPressed(state.mode === GameMode.LOCAL ? Side.RIGHT : state.side)
  if (e.key === "ArrowDown")
    onDownPressed(state.mode === GameMode.LOCAL ? Side.RIGHT : state.side)
}

function onKeyUp(e: KeyboardEvent): void {
  if (e.key === "w" || e.key === "W")
    onUpReleased(state.side)
  if (e.key === "s" || e.key === "S")
    onDownReleased(state.side)

  if (e.key === "ArrowUp")
    onUpReleased(state.mode === GameMode.LOCAL ? Side.RIGHT : state.side)
  if (e.key === "ArrowDown")
    onDownReleased(state.mode === GameMode.LOCAL ? Side.RIGHT : state.side)
}

function onTouchStart(e: TouchEvent): void {
  if (!e.touches[0])
    return

  const dir = e.touches[0].clientY < window.innerHeight / 2 ? -1 : 1

  let side = state.side
  if (state.mode === GameMode.LOCAL && e.touches[0].clientX > window.innerWidth / 2)
    side = Side.RIGHT

  touchIdToInfo.set(e.touches[0].identifier, { side, dir })

  if (dir === -1)
    onUpPressed(side)
  else
    onDownPressed(side)
}

function onTouchEnd(e: TouchEvent): void {
  if (!e.changedTouches[0])
    return

  // We can't only rely on where the touch ended because there can be a move from top left to bottom right for example.
  const touchInfo = touchIdToInfo.get(e.changedTouches[0].identifier)
  if (!touchInfo)
    return

  touchIdToInfo.delete(e.changedTouches[0].identifier)

  if (touchInfo.dir === -1)
    onUpReleased(touchInfo.side)
  else
    onDownReleased(touchInfo.side)
}

function onUpPressed(side: Side): void {
  const isGuest = side !== state.side
  const _inputs = isGuest ? inputs : guestInputs
  _inputs.upPressed = true
  const direction = _inputs.downPressed ? 0 : -1 // Stop if opposite key still pressed
  state.game.paddles[side].direction = direction
  send({ type: "move", direction, isGuest })
}

function onDownPressed(side: Side): void {
  const isGuest = side !== state.side
  const _inputs = isGuest ? inputs : guestInputs
  _inputs.downPressed = true
  const direction = _inputs.upPressed ? 0 : 1 // Stop if opposite key still pressed
  state.game.paddles[side].direction = direction
  send({ type: "move", direction, isGuest })
}

function onUpReleased(side: Side): void {
  const isGuest = side !== state.side
  const _inputs = isGuest ? inputs : guestInputs
  _inputs.upPressed = false
  const direction = _inputs.downPressed ? 1 : 0 // Move opposite dir if opposite key still pressed
  state.game.paddles[side].direction = direction
  send({ type: "move", direction, isGuest })
}

function onDownReleased(side: Side): void {
  const isGuest = side !== state.side
  const _inputs = isGuest ? inputs : guestInputs
  _inputs.downPressed = false
  const direction = _inputs.upPressed ? -1 : 0 // Move opposite dir if opposite key still pressed
  state.game.paddles[side].direction = direction
  send({ type: "move", direction, isGuest })
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

  updateBall(deltaTime)
  updatePaddles(deltaTime)
  render()
}

/**
 * Update ball position with wall and paddle bounce handling based on
 * position/velocity since last bounce
 */
function updateBall(deltaTime: number): void {
  // Wall bounce simulation
  const elapsed = (Date.now() - state.game.ball.time) / 1000
  const desiredLocation: Vector2D = {
    x: calculateXAfterDuration(elapsed),
    y: calculateYAfterDuration(elapsed),
  }

  // // Paddle bounce simulation
  // desiredLocation.x = simulatePaddleBounce(desiredLocation)

  state.interpolatedBallPos = interpolateV2(state.interpolatedBallPos, desiredLocation, deltaTime * 50)
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

// /**
//  * Client paddle collision, waiting for server to bounce
//  * @return new ball X position after paddle bounce
//  */
// function simulatePaddleBounce(ballPos: Vector2D): number {
//   const isWithinPaddleYRange = (y: number, padY: number) =>
//     Math.abs(y - padY) <= CONFIG.PADDLE_HEIGHT / 2 + CONFIG.BALL_RADIUS

//   const ballLeft = ballPos.x - CONFIG.BALL_RADIUS
//   const lPadSurfX = CONFIG.PADDLE_MARGIN + CONFIG.PADDLE_WIDTH
//   const lPadY = state.game.paddles.left.y
//   const lDelta = ballLeft - lPadSurfX
//   if (lDelta <= 0 && isWithinPaddleYRange(ballPos.y, lPadY))
//     return lPadSurfX - lDelta

//   const ballRight = ballPos.x + CONFIG.BALL_RADIUS
//   const rPadSurfX = CONFIG.WIDTH - CONFIG.PADDLE_MARGIN - CONFIG.PADDLE_WIDTH
//   const rPadY = state.game.paddles.right.y
//   const rDelta = ballRight - rPadSurfX
//   if (rDelta >= 0 && isWithinPaddleYRange(ballPos.y, rPadY))
//     return rPadSurfX - rDelta

//   return ballPos.x
// }

function updatePaddles(deltaTime: number): void {
  for (const side of [Side.LEFT, Side.RIGHT] as const) {
    const paddle = state.game.paddles[side]
    paddle.y += paddle.direction * CONFIG.PADDLE_SPEED * deltaTime
    paddle.y = clamp(paddle.y, CONFIG.PADDLE_HEIGHT / 2, CONFIG.HEIGHT - CONFIG.PADDLE_HEIGHT / 2)

    state.interpolatedPaddlesY[side] = interpolate(state.interpolatedPaddlesY[side], paddle.y, deltaTime * 50)
  }
}

function render(): void {
  let styles = getComputedStyle(document.documentElement)

  // Clear canvas
  ctx.fillStyle = styles.getPropertyValue("--color-game-background")
  ctx.fillRect(0, 0, els.gameCanvas.width, els.gameCanvas.height)

  // Draw center line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(els.gameCanvas.width / 2, 0)
  ctx.lineTo(els.gameCanvas.width / 2, els.gameCanvas.height)
  ctx.stroke()
  ctx.setLineDash([])

  // Left paddle (cyan)
  const lPadTLCorner = {
    x: CONFIG.PADDLE_MARGIN,
    y: state.interpolatedPaddlesY.left - CONFIG.PADDLE_HEIGHT / 2,
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
    y: state.interpolatedPaddlesY.right - CONFIG.PADDLE_HEIGHT / 2,
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
  ctx.arc(state.interpolatedBallPos.x, state.interpolatedBallPos.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2)
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
  let winText = ""
  if (state.mode === GameMode.LOCAL) {
    const winner = state.game.score.left > state.game.score.right
      ? els.gameLeftPlayerName.textContent
      : els.gameRightPlayerName.textContent
    winText = `${winner} Wins!`
  } else {
    const won = state.side === Side.LEFT
      ? state.game.score.left > state.game.score.right
      : state.game.score.right > state.game.score.left
    winText = won ? "You Win!" : "You Lose"
  }
  els.gameOverText.textContent = winText
  els.gameOverScore.textContent = `${state.game.score.left} - ${state.game.score.right}`
}

function updateTournamentOverlay(result: TournamentResult): void {
  type K = keyof TournamentResult
  type P = "p1" | "p2"

  const color = "var(--color-surface)"
  const textColor = "var(--color-text-muted)"
  const winColor = "var(--color-success)"
  const winTextColor = "var(--color-surface)"

  const updatePlayer = (k: K, p: P) => {
    const rect = document.querySelector<HTMLElement>(`#${k}-${p}-rect`)!
    const text = document.querySelector<HTMLElement>(`#${k}-${p}`)!
    rect.style.fill = (result[k] && result[k]?.winner === result[k]?.[p]) ? winColor : color
    text.style.fill = (result[k] && result[k]?.winner === result[k]?.[p]) ? winTextColor : textColor
    const playerName = result[k]?.[p] ?? ""
    text.textContent = playerName.length > 10 ? playerName.substring(0, 10) + "..." : playerName
  }

  updatePlayer("semi1", "p1")
  updatePlayer("semi1", "p2")

  updatePlayer("semi2", "p1")
  updatePlayer("semi2", "p2")

  updatePlayer("final", "p1")
  updatePlayer("final", "p2")

  updatePlayer("third", "p1")
  updatePlayer("third", "p2")

  if (result.final?.winner && result.third?.winner) {
    showElement(els.tournamentResultPlayAgainBtn)
    hideElement(els.tournamentResultWaiting)
  } else {
    showElement(els.tournamentResultWaiting)
    hideElement(els.tournamentResultPlayAgainBtn)
  }
}

// ============================================
// BUTTON HANDLERS
// ============================================

const joinLocal = () => send({ type: "join_local" })
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

function interpolate(current: number, target: number, factor: number): number {
  return current + (target - current) * clamp(factor, 0, 1)
}

function interpolateV2(current: Vector2D, target: Vector2D, factor: number): Vector2D {
  return {
    x: interpolate(current.x, target.x, factor),
    y: interpolate(current.y, target.y, factor),
  }
}
