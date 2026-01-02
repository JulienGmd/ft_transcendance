import { checkEls, getUser } from "../utils.js"

const CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 100,
  PADDLE_MARGIN: 30,
  BALL_RADIUS: 8,
  BALL_SPEED: 200,
} as const

let els: {
  canvas: HTMLCanvasElement
  login: HTMLElement
  play: HTMLElement
}
let ctx: CanvasRenderingContext2D
let animationFrameId: number | undefined
let lastTimestamp: number | undefined
let state = {
  ball: { pos: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
  paddles: { left: 0, right: 0 },
}
let scaledConfig = {
  width: 0,
  height: 0,
  paddleWidth: 0,
  paddleHeight: 0,
  paddleMargin: 0,
  ballRadius: 0,
  ballSpeed: 0,
}

export function onMount(): void {
  els = {
    canvas: document.querySelector("#home-canvas")!,
    login: document.querySelector("#home-login")!,
    play: document.querySelector("#home-play")!,
  }
  checkEls(els)

  ctx = els.canvas.getContext("2d")!

  if (getUser())
    els.login.classList.add("hidden")
  else
    els.play.classList.add("hidden")

  window.addEventListener("resize", onResize)
  onResize()
  tick()
}

export function onDestroy(): void {
  window.removeEventListener("resize", updateCanvasSize)
  if (animationFrameId)
    cancelAnimationFrame(animationFrameId)
}

function onResize(): void {
  updateCanvasSize()
  updateScaledConfig()
  resetState()
}

function updateCanvasSize(): void {
  els.canvas.width = window.innerWidth
  els.canvas.height = window.innerHeight
}

function updateScaledConfig(): void {
  const w = els.canvas.width
  const h = els.canvas.height
  scaledConfig = {
    width: w,
    height: h,
    paddleWidth: (CONFIG.PADDLE_WIDTH / CONFIG.WIDTH) * w,
    paddleHeight: (CONFIG.PADDLE_HEIGHT / CONFIG.HEIGHT) * h,
    paddleMargin: (CONFIG.PADDLE_MARGIN / CONFIG.WIDTH) * w,
    ballRadius: (CONFIG.BALL_RADIUS / CONFIG.WIDTH) * w,
    ballSpeed: (CONFIG.BALL_SPEED / CONFIG.WIDTH) * w,
  }
}

function resetState(): void {
  const { width, height } = scaledConfig
  state = {
    ball: { pos: { x: width / 2, y: height / 2 }, velocity: { x: 0, y: 0 } },
    paddles: { left: height / 2, right: height / 2 },
  }
}

function tick(): void {
  animationFrameId = requestAnimationFrame(tick)

  if (!lastTimestamp) {
    lastTimestamp = performance.now()
    return
  }

  const now = performance.now()
  const deltaTime = now - lastTimestamp
  lastTimestamp = now

  // Launch
  if (state.ball.velocity.x === 0)
    launchBall()

  state.ball.pos.x += state.ball.velocity.x * (deltaTime / 1000)
  state.ball.pos.y += state.ball.velocity.y * (deltaTime / 1000)

  console.log(state.ball.pos.x, state.ball.pos.y)

  collideX()
  collideY()

  const playingPaddle = state.ball.velocity.x < 0 ? "left" : "right"
  const notPlayingPaddle = playingPaddle === "left" ? "right" : "left"

  const { height } = scaledConfig
  state.paddles[playingPaddle] = interpConstantPaddle(state.paddles[playingPaddle], state.ball.pos.y)
  state.paddles[notPlayingPaddle] = interpConstantPaddle(state.paddles[notPlayingPaddle], height / 2)

  render()
}

function launchBall(): void {
  const { ballSpeed } = scaledConfig

  // 45 or 135 or -45 or -135 degrees
  const rand = Math.random()
  let angle = rand > 0.75
    ? (Math.PI / 4)
    : rand > 0.5
    ? 3 * (Math.PI / 4)
    : rand > 0.25
    ? -(Math.PI / 4)
    : -3 * (Math.PI / 4)

  state.ball.velocity.x = Math.cos(angle) * ballSpeed
  state.ball.velocity.y = Math.sin(angle) * ballSpeed
}

function collideY(): void {
  const { height, ballRadius } = scaledConfig
  const yMin = ballRadius
  const yMax = height - ballRadius
  if (state.ball.pos.y <= yMin) {
    state.ball.pos.y = yMin
    state.ball.velocity.y = -state.ball.velocity.y
  } else if (state.ball.pos.y >= yMax) {
    state.ball.pos.y = yMax
    state.ball.velocity.y = -state.ball.velocity.y
  }
}

function collideX(): void {
  const { width, paddleMargin, paddleWidth, ballRadius } = scaledConfig
  const xMin = paddleMargin + paddleWidth + ballRadius
  const xMax = width - xMin
  if (state.ball.pos.x <= xMin) {
    state.ball.pos.x = xMin
    state.ball.velocity.x = -state.ball.velocity.x
  } else if (state.ball.pos.x >= xMax) {
    state.ball.pos.x = xMax
    state.ball.velocity.x = -state.ball.velocity.x
  }
}

function interpConstantPaddle(paddleY: number, y: number): number {
  const { height, ballSpeed } = scaledConfig
  return interpConstant(
    paddleY,
    clamp(
      y,
      scaledConfig.paddleHeight / 2,
      scaledConfig.height - scaledConfig.paddleHeight / 2,
    ),
    0.000008 * ballSpeed * height,
  )
}

function render(): void {
  const { width, height, paddleWidth, paddleHeight, paddleMargin, ballRadius } = scaledConfig

  let styles = getComputedStyle(document.documentElement)

  ctx.clearRect(0, 0, width, height)

  // Center line
  ctx.strokeStyle = styles.getPropertyValue("--color-surface")
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.stroke()
  ctx.setLineDash([])

  // Left paddle
  const lPadTLCorner = {
    x: paddleMargin,
    y: state.paddles.left - paddleHeight / 2,
  }
  ctx.fillStyle = styles.getPropertyValue("--color-game-player1")
  ctx.fillRect(
    lPadTLCorner.x,
    lPadTLCorner.y,
    paddleWidth,
    paddleHeight,
  )

  // Right paddle
  const rPadTLCorner = {
    x: width - paddleMargin - paddleWidth,
    y: state.paddles.right - paddleHeight / 2,
  }
  ctx.fillStyle = styles.getPropertyValue("--color-game-player2")
  ctx.fillRect(
    rPadTLCorner.x,
    rPadTLCorner.y,
    paddleWidth,
    paddleHeight,
  )

  // Ball
  ctx.fillStyle = "#dedede"
  ctx.beginPath()
  ctx.arc(state.ball.pos.x, state.ball.pos.y, ballRadius, 0, Math.PI * 2)
  ctx.fill()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function interpConstant(value: number, target: number, speed: number): number {
  if (value < target)
    return Math.min(value + speed, target)
  else
    return Math.max(value - speed, target)
}
