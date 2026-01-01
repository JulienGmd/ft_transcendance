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
import { Side } from "./sharedTypes"
import { Player } from "./types"

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
  readonly p1: Player
  readonly p2: Player
  engine: Engine
  state: GameState
  countdownInterval?: NodeJS.Timeout
  onEndCallback: (result: GameEndResult) => void
}

export interface GameEndResult {
  readonly p1: Player
  readonly p2: Player
  score: { left: number; right: number }
  winner: Player
  loser: Player
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

  addGame(p1: Player, p2: Player): Promise<GameEndResult> {
    return new Promise((resolve) => {
      if (this.getPlayerGame(p1) || this.getPlayerGame(p2))
        return

      const game: Game = {
        p1,
        p2,
        engine: new Engine(),
        state: GameState.WAITING,
        onEndCallback: (result) => resolve(result), // Resolve promise on game end
      }
      this.games.push(game)
      this.playerIdToGame.set(p1.id, game)
      this.playerIdToGame.set(p2.id, game)
      console.log("[GameManager] Game added")

      this.syncGame(game)
      this.startCountdown(game)
    })
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

    const sockets = [game.p1.socket, game.p2.socket]
    broadcastGameStart(sockets)
    console.log("[GameManager] Game started")
  }

  private endGame(game: Game): void {
    game.state = GameState.FINISHED

    const sockets = [game.p1.socket, game.p2.socket]
    broadcastGameOver(sockets)
    console.log("[GameManager] Game ended")

    const score = game.engine.getScore()

    // Send match result to user-management via NATS
    sendMatchResult({
      p1_id: game.p1.id,
      p2_id: game.p2.id,
      p1_score: score.left,
      p2_score: score.right,
      p1_precision: 0,
      p2_precision: 0,
    })

    game.onEndCallback({
      p1: game.p1,
      p2: game.p2,
      score,
      winner: score.left > score.right ? game.p1 : game.p2,
      loser: score.left > score.right ? game.p2 : game.p1,
    })
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
        this.syncGame(game)
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

  handleInput(player: Player, direction: -1 | 0 | 1): void {
    const game = this.getPlayerGame(player)
    if (!game)
      return

    // Allow inputs during COUNTDOWN and PLAYING states
    if (game.state !== GameState.COUNTDOWN && game.state !== GameState.PLAYING)
      return

    const side = player.id === game.p1.id ? Side.LEFT : Side.RIGHT
    const paddle = game.engine.setPaddleDirection(side, direction)

    const sockets = [game.p1.socket, game.p2.socket]
    broadcastPaddleUpdate(sockets, side, paddle)
  }

  handleDisconnect(player: Player): void {
    // Le jeu continue même si le joueur est déconnecté
    console.log(`[GameManager] Player ${player.username} disconnect from game (game continues)`)
  }

  handleReconnect(player: Player): boolean {
    const game = this.getPlayerGame(player)
    if (!game)
      return false

    const side = player.id === game.p1.id ? Side.LEFT : Side.RIGHT
    const opponent = side === Side.LEFT ? game.p2 : game.p1

    // Update socket reference
    if (side === Side.LEFT)
      game.p1.socket = player.socket
    else
      game.p2.socket = player.socket

    sendGameFound(player.socket, side, opponent.username)
    this.syncGame(game)

    console.log(`[GameManager] Player ${player.username} reconnected to game`)
    return true
  }
}
