// ============================================
// GAME MANAGER - Handles active games
// Uses communication layer for messaging
// ============================================

import {
  broadcastBallSync,
  broadcastCountdown,
  broadcastGameOver,
  broadcastGameStart,
  broadcastGameState,
  broadcastPaddleUpdate,
  broadcastScoreUpdate,
  ISocket,
  isSocketOpen,
  sendGameFound,
  sendGameState,
  sendOpponentDisconnected,
  sendOpponentReconnected,
} from "./communication"
import {
  createBallSync,
  createGameSnapshot,
  gameTick,
  getOpponent,
  getPlayerBySide,
  predictBallArrival,
} from "./engine"
import { sendMatchResult } from "./nats"
import { Game, GAME_CONFIG, GameMode, GameState, InputAction, InputKey, PlayerSide } from "./types"

export interface GameSession {
  game: Game
  sockets: Map<string, ISocket>
  tickInterval: ReturnType<typeof setInterval> | null
  syncInterval: ReturnType<typeof setInterval> | null
  countdownInterval: ReturnType<typeof setInterval> | null
}

function getSessionSockets(session: GameSession): ISocket[] {
  return [...session.sockets.values()]
}

function getOpponentSocket(session: GameSession, playerId: string): ISocket | undefined {
  const opponentEntry = [...session.sockets.entries()].find(([id]) => id !== playerId)
  return opponentEntry?.[1]
}

class GameManager {
  private games: Map<string, GameSession> = new Map()
  private playerToGame: Map<string, string> = new Map()

  addGame(game: Game, socket1: ISocket, socket2: ISocket): void {
    const players = [...game.players.keys()]

    // Clean up any existing game mappings for these players (important for tournament 2nd match)
    for (const playerId of players) {
      const oldGameId = this.playerToGame.get(playerId)
      if (oldGameId && oldGameId !== game.id)
        console.log(`[GameManager] Player ${playerId} was in game ${oldGameId}, moving to new game ${game.id}`)
    }

    const session: GameSession = {
      game,
      sockets: new Map([[players[0], socket1], [players[1], socket2]]),
      tickInterval: null,
      syncInterval: null,
      countdownInterval: null,
    }
    this.games.set(game.id, session)
    players.forEach((playerId) => this.playerToGame.set(playerId, game.id))
    console.log(`[GameManager] Game ${game.id} created`)
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId)?.game
  }

  getGameSession(gameId: string): GameSession | undefined {
    return this.games.get(gameId)
  }

  getPlayerGame(playerId: string): GameSession | undefined {
    const gameId = this.playerToGame.get(playerId)
    if (!gameId)
      return undefined
    const session = this.games.get(gameId)
    if (!session || session.game.state === "finished")
      return undefined
    return session
  }

  // Callback for tournament queue to be notified of game endings
  private onGameEndCallback: ((gameId: string, winnerId: string) => void) | null = null

  setOnGameEndCallback(callback: (gameId: string, winnerId: string) => void): void {
    this.onGameEndCallback = callback
  }

  startCountdown(gameId: string): void {
    const session = this.games.get(gameId)
    if (!session)
      return

    // Set state to COUNTDOWN and start intervals so paddles can move
    session.game.state = GameState.COUNTDOWN
    session.game.lastUpdateTime = Date.now()
    this.startIntervals(session)

    this.startCountdownTimer(gameId)
  }

  private startCountdownTimer(gameId: string): void {
    const session = this.games.get(gameId)
    if (!session)
      return

    // Prevent multiple concurrent countdowns
    if (session.countdownInterval) {
      console.warn(`[GameManager] Countdown already running for game ${gameId}, skipping`)
      return
    }

    let countdown = GAME_CONFIG.COUNTDOWN_SECONDS
    const sockets = getSessionSockets(session)
    broadcastCountdown(sockets, countdown)
    session.countdownInterval = setInterval(() => {
      countdown--
      broadcastCountdown(sockets, countdown) // Send even when 0 to hide overlay
      if (countdown <= 0) {
        // Clear interval BEFORE starting game to prevent race conditions
        this.clearCountdownInterval(session)
        this.startGame(gameId)
      }
    }, 1000)
  }

  private startGame(gameId: string): void {
    const session = this.games.get(gameId)
    if (!session)
      return
    // Prevent starting if already playing (race condition guard)
    if (session.game.state === GameState.PLAYING) {
      console.warn(`[GameManager] Game ${gameId} already playing, skipping startGame`)
      return
    }
    session.game.state = GameState.PLAYING
    session.game.startedAt = Date.now()
    session.game.lastUpdateTime = Date.now()
    // Recalculate ball prediction to ensure it's in the future
    session.game.ball.predictedArrival = predictBallArrival(session.game.ball)
    console.log(`[GameManager] Game ${gameId} started`)
    const sockets = getSessionSockets(session)
    broadcastGameStart(sockets)
    // Send ball sync so client has correct velocity after countdown
    const ballSync = createBallSync(session.game.ball)
    broadcastBallSync(sockets, ballSync)
    // Intervals are already running from startCountdown, no need to restart them
  }

  private tick(gameId: string): void {
    const session = this.games.get(gameId)
    if (!session)
      return

    // Only process game tick during COUNTDOWN and PLAYING
    // gameTick handles paddle updates and (during PLAYING) ball physics
    if (session.game.state !== GameState.COUNTDOWN && session.game.state !== GameState.PLAYING)
      return

    const result = gameTick(session.game)

    // Send immediate sync if ball bounced on paddle (for responsive feel)
    if (result.paddleBounce) {
      const sockets = getSessionSockets(session)
      const ballSync = createBallSync(session.game.ball)
      broadcastBallSync(sockets, ballSync)
    }

    // Only handle scoring if a goal was scored
    if (!result.scored)
      return

    // IMMEDIATELY change state to prevent multiple countdown triggers from concurrent ticks
    // This must happen BEFORE any async operations or broadcasts
    if (!result.gameOver) {
      session.game.state = GameState.COUNTDOWN
      session.game.countdownEnd = Date.now() + GAME_CONFIG.COUNTDOWN_SECONDS * 1000
    }

    const sockets = getSessionSockets(session)
    const leftPlayer = getPlayerBySide(session.game, PlayerSide.LEFT)
    const rightPlayer = getPlayerBySide(session.game, PlayerSide.RIGHT)
    broadcastScoreUpdate(sockets, leftPlayer?.score ?? 0, rightPlayer?.score ?? 0)

    // If game ended, handle it; otherwise start the countdown timer
    if (result.gameOver && result.winnerId)
      this.endGame(gameId, result.winnerId)
    else {
      // State already changed to COUNTDOWN above, just start the timer
      this.clearCountdownInterval(session)
      // Send game state to sync ball position after reset
      const snapshot = createGameSnapshot(session.game)
      broadcastGameState(sockets, snapshot)
      this.startCountdownTimer(gameId)
    }
  }

  private syncBall(gameId: string): void {
    const session = this.games.get(gameId)
    if (!session || session.game.state !== GameState.PLAYING)
      return
    const ballSync = createBallSync(session.game.ball)
    const sockets = getSessionSockets(session)
    broadcastBallSync(sockets, ballSync)
  }

  handleInput(playerId: string, socket: ISocket, key: InputKey, action: InputAction): void {
    const session = this.getPlayerGame(playerId)
    if (!session)
      return
    // Allow inputs during COUNTDOWN and PLAYING states
    if (session.game.state !== GameState.PLAYING && session.game.state !== GameState.COUNTDOWN)
      return
    const player = session.game.players.get(playerId)
    if (!player)
      return

    // Update socket if it has changed (important for tournament 2nd match)
    const currentSocket = session.sockets.get(playerId)
    if (currentSocket !== socket) {
      console.log(`[GameManager] Updating socket for player ${playerId} in game ${session.game.id}`)
      session.sockets.set(playerId, socket)
    }

    player.lastInputTime = Date.now()
    if (action === InputAction.PRESS)
      player.paddle.direction = key === InputKey.UP ? -1 : 1
    else {
      const expectedDir = key === InputKey.UP ? -1 : 1
      if (player.paddle.direction === expectedDir)
        player.paddle.direction = 0
    }
    const sockets = getSessionSockets(session)
    broadcastPaddleUpdate(sockets, player.side, player.paddle.y, player.paddle.direction)
  }

  handleDisconnect(playerId: string): void {
    const session = this.getPlayerGame(playerId)
    if (!session)
      return
    const player = session.game.players.get(playerId)
    if (!player)
      return
    player.connected = false
    const opponentSocket = getOpponentSocket(session, playerId)
    if (opponentSocket && isSocketOpen(opponentSocket))
      sendOpponentDisconnected(opponentSocket)
    // Le jeu continue même si le joueur est déconnecté
    console.log(`[GameManager] Player ${playerId} disconnected from game ${session.game.id} (game continues)`)
  }

  handleReconnect(playerId: string, socket: ISocket): boolean {
    const session = this.getPlayerGame(playerId)
    if (!session)
      return false
    const player = session.game.players.get(playerId)
    if (!player)
      return false
    player.connected = true
    session.sockets.set(playerId, socket)
    const opponentSocket = getOpponentSocket(session, playerId)
    if (opponentSocket && isSocketOpen(opponentSocket))
      sendOpponentReconnected(opponentSocket)
    const opponent = getOpponent(session.game, playerId)
    sendGameFound(socket, session.game.id, player.side, opponent?.username ?? "", session.game.mode)
    const snapshot = createGameSnapshot(session.game)
    sendGameState(socket, snapshot)
    // Le jeu continue pendant la déconnexion, donc pas besoin de redémarrer les intervals
    console.log(`[GameManager] Player ${playerId} reconnected to game ${session.game.id}`)
    return true
  }

  private endGame(gameId: string, winnerId: string): void {
    const session = this.games.get(gameId)
    if (!session)
      return
    session.game.state = GameState.FINISHED
    session.game.finishedAt = Date.now()
    session.game.winnerId = winnerId
    this.stopIntervals(session)
    const leftPlayer = getPlayerBySide(session.game, PlayerSide.LEFT)
    const rightPlayer = getPlayerBySide(session.game, PlayerSide.RIGHT)
    const sockets = getSessionSockets(session)
    broadcastGameOver(sockets, leftPlayer?.score ?? 0, rightPlayer?.score ?? 0, session.game.mode)
    console.log(`[GameManager] Game ${gameId} ended. Winner: ${winnerId}`)

    // Notify tournament queue if this is a tournament game
    if (this.onGameEndCallback)
      this.onGameEndCallback(gameId, winnerId)

    // Send match result to user-management via NATS
    if (leftPlayer && rightPlayer) {
      sendMatchResult({
        p1_id: Number(leftPlayer.id),
        p2_id: Number(rightPlayer.id),
        p1_score: leftPlayer.score,
        p2_score: rightPlayer.score,
        p1_precision: 0,
        p2_precision: 0,
      })
    }

    setTimeout(() => this.cleanup(gameId), 5000)
  }

  private startIntervals(session: GameSession): void {
    // Don't restart intervals if they're already running
    if (!session.tickInterval)
      session.tickInterval = setInterval(() => this.tick(session.game.id), GAME_CONFIG.TICK_RATE_MS)
    if (!session.syncInterval)
      session.syncInterval = setInterval(() => this.syncBall(session.game.id), GAME_CONFIG.SYNC_INTERVAL_MS)
  }

  private stopIntervals(session: GameSession): void {
    this.clearTickInterval(session)
    this.clearSyncInterval(session)
    this.clearCountdownInterval(session)
  }

  private clearTickInterval(session: GameSession): void {
    if (session.tickInterval) {
      clearInterval(session.tickInterval)
      session.tickInterval = null
    }
  }

  private clearSyncInterval(session: GameSession): void {
    if (session.syncInterval) {
      clearInterval(session.syncInterval)
      session.syncInterval = null
    }
  }

  private clearCountdownInterval(session: GameSession): void {
    if (session.countdownInterval) {
      clearInterval(session.countdownInterval)
      session.countdownInterval = null
    }
  }

  private cleanup(gameId: string): void {
    const session = this.games.get(gameId)
    if (!session)
      return
    this.stopIntervals(session)
    // Only delete playerToGame mapping if it still points to this game
    // (important for tournaments where players move to a new game immediately)
    for (const playerId of session.game.players.keys()) {
      if (this.playerToGame.get(playerId) === gameId)
        this.playerToGame.delete(playerId)
    }
    this.games.delete(gameId)
    console.log(`[GameManager] Game ${gameId} cleaned up`)
  }

  get activeGames(): number {
    return this.games.size
  }
}

export { GameManager }
