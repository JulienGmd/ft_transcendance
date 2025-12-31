// ============================================
// GAME MANAGER - Handles active games
// Uses communication layer for messaging
// ============================================

import {
  broadcastCountdown,
  broadcastGameOver,
  broadcastGameStart,
  broadcastGameSync,
  broadcastPaddleUpdate,
  broadcastScoreUpdate,
  sendGameFound,
} from "./communication"
import { Engine } from "./engine"
import { COUNTDOWN_SECONDS, SYNC_RATE_MS, TICK_RATE_MS } from "./gameConfig"
import { sendMatchResult } from "./nats"
import { InputAction, InputKey, Player, Side } from "./types"

export enum GameMode {
  NORMAL = "normal",
  TOURNAMENT = "tournament",
}

export enum GameState {
  WAITING = "waiting",
  COUNTDOWN = "countdown",
  PLAYING = "playing",
  FINISHED = "finished",
}

export interface Game {
  p1: Player
  p2: Player
  mode: GameMode
  engine: Engine
  state: GameState
  countdownInterval?: NodeJS.Timeout
}

export class GameManager {
  private games: Game[] = []
  private playerIdToGame: Map<number, Game> = new Map()
  private tickInterval: NodeJS.Timeout
  private syncInterval: NodeJS.Timeout

  constructor() {
    this.tickInterval = setInterval(() => this.tick(), TICK_RATE_MS)
    this.syncInterval = setInterval(() => this.sync(), SYNC_RATE_MS)
  }

  dispose(): void {
    clearInterval(this.tickInterval)
    clearInterval(this.syncInterval)
    this.games.forEach((game) => clearInterval(game.countdownInterval))
  }

  // ===== GAMES MANAGEMENT ===================

  addGame(p1: Player, p2: Player, mode: GameMode): void {
    if (this.getPlayerGame(p1) || this.getPlayerGame(p2))
      return

    const game: Game = {
      p1,
      p2,
      engine: new Engine(),
      state: GameState.WAITING,
      mode,
    }
    this.games.push(game)
    this.playerIdToGame.set(p1.id, game)
    this.playerIdToGame.set(p2.id, game)
    console.log("[GameManager] Game added")
  }

  removeGame(game: Game): void {
    clearInterval(game.countdownInterval)

    const index = this.games.indexOf(game)
    if (index !== -1) {
      this.games.splice(index, 1)
      this.playerIdToGame.delete(game.p1.id)
      this.playerIdToGame.delete(game.p2.id)
      console.log("[GameManager] Game removed")
    }
  }

  getPlayerGame(player: Player): Game | undefined {
    return this.playerIdToGame.get(player.id)
  }

  // TODO
  // // Callback for tournament queue to be notified of game endings
  // private onGameEndCallback: ((gameId: string, winnerId: string) => void) | null = null
  // setOnGameEndCallback(callback: (gameId: string, winnerId: string) => void): void {
  //   this.onGameEndCallback = callback
  // }

  // ===== GAMES LIFECYCLE ====================

  startCountdown(game: Game): void {
    game.state = GameState.COUNTDOWN

    let countdown = COUNTDOWN_SECONDS
    const sockets = [game.p1.socket, game.p2.socket]
    broadcastCountdown(sockets, countdown)

    clearInterval(game.countdownInterval)
    game.countdownInterval = setInterval(() => {
      countdown--
      broadcastCountdown(sockets, countdown) // Send even when 0 to hide overlay

      if (countdown <= 0 && game.countdownInterval) {
        clearInterval(game.countdownInterval)
        game.countdownInterval = undefined
        this.startGame(game)
      }
    }, 1000)
  }

  private startGame(game: Game): void {
    game.state = GameState.PLAYING

    game.engine.reset()
    this.syncGame(game)

    const sockets = [game.p1.socket, game.p2.socket]
    broadcastGameStart(sockets)
    console.log("[GameManager] Game started")
  }

  private endGame(game: Game): void {
    game.state = GameState.FINISHED

    // TODO
    // // Notify tournament queue if this is a tournament game
    // if (this.onGameEndCallback)
    //   this.onGameEndCallback(gameId, winnerId)

    // Send match result to user-management via NATS
    const score = game.engine.getScore()
    sendMatchResult({
      p1_id: game.p1.id,
      p2_id: game.p2.id,
      p1_score: score.left,
      p2_score: score.right,
      p1_precision: 0,
      p2_precision: 0,
    })

    const sockets = [game.p1.socket, game.p2.socket]
    broadcastGameOver(sockets)
    console.log("[GameManager] Game ended")
  }

  private tick(): void {
    const gamesToRemove: Game[] = []

    this.games.forEach((game) => {
      // Only process game tick during COUNTDOWN and PLAYING
      // gameTick handles paddle updates and (during PLAYING) ball physics
      if (game.state !== GameState.COUNTDOWN && game.state !== GameState.PLAYING)
        return

      const result = game.engine.tick(game.state === GameState.PLAYING)

      // Send immediate sync if ball bounced on paddle (for responsive feel)
      if (result.paddleBounce)
        this.syncGame(game)

      if (result.scorer) {
        const sockets = [game.p1.socket, game.p2.socket]
        broadcastScoreUpdate(sockets, game.engine.getScore())

        if (result.gameOver) {
          this.endGame(game)
          gamesToRemove.push(game)
          return
        }

        game.engine.reset()
        this.startCountdown(game)
      }
    })

    // Remove games after to not interfere with iteration
    gamesToRemove.forEach((game) => this.removeGame(game))
  }

  private sync(): void {
    this.games.forEach((game) => this.syncGame(game))
  }

  private syncGame(game: Game): void {
    const sockets = [game.p1.socket, game.p2.socket]
    broadcastGameSync(sockets, game.engine.serialize())
  }

  // ====== PLAYER INTERACTIONS ===============

  handleInput(player: Player, key: InputKey, action: InputAction): void {
    const game = this.getPlayerGame(player)
    if (!game)
      return

    // Allow inputs during COUNTDOWN and PLAYING states
    if (game.state !== GameState.COUNTDOWN && game.state !== GameState.PLAYING)
      return

    const side = player.id === game.p1.id ? Side.LEFT : Side.RIGHT
    const paddle = game.engine.handleInput(side, key, action)

    const sockets = [game.p1.socket, game.p2.socket]
    broadcastPaddleUpdate(sockets, side, paddle)
  }

  handleDisconnect(player: Player): void {
    // Le jeu continue même si le joueur est déconnecté
    console.log(`[GameManager] Player ${player.username} disconnected from game (game continues)`)
  }

  handleReconnect(player: Player): boolean {
    const game = this.getPlayerGame(player)
    if (!game)
      return false

    const side = player.id === game.p1.id ? Side.LEFT : Side.RIGHT
    const opponent = side === Side.LEFT ? game.p2 : game.p1

    // Update socket reference
    if (side === Side.LEFT)
      game.p1 = player
    else
      game.p2 = player

    sendGameFound(player.socket, side, opponent.username, game.mode)
    this.syncGame(game)

    console.log(`[GameManager] Player ${player.username} reconnected to game`)
    return true
  }
}
