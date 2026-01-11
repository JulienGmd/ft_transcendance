// ============================================
// GAME MANAGER - Handles active games
// Uses communication layer for messaging
// ============================================

import WebSocket from "ws"
import {
  broadcastCountdown,
  broadcastGameOver,
  broadcastGameStart,
  broadcastGameSync,
  broadcastPaddleUpdate,
  broadcastScoreUpdate,
  sendGameFound,
  sendGameStart,
  sendScoreUpdate,
} from "./communication.js"
import { Engine } from "./engine.js"
import { COUNTDOWN_SECONDS, SYNC_RATE_MS, TICK_RATE_MS } from "./gameConfig.js"
import { sendMatchResult } from "./nats.js"
import { GameMode, Side } from "./sharedTypes.js"
import { Player } from "./types.js"
import { sleep } from "./utils.js"

export enum GameState {
  WAITING = "waiting",
  COUNTDOWN = "countdown",
  PLAYING = "playing",
  FINISHED = "finished",
}

export interface Game {
  readonly p1: Player
  readonly p2?: Player // Undefined if local
  readonly mode: GameMode
  readonly engine: Engine
  state: GameState
  countdownInterval?: NodeJS.Timeout
  onEndCallback: (result: GameEndResult) => void
}

export interface GameEndResult {
  readonly p1: Player
  readonly p2?: Player // Undefined if local
  score: { left: number; right: number }
  winner?: Player // Undefined if local right player
  loser?: Player // Undefined if local right player
}

export class GameManager {
  private games: Game[] = []
  private playerIdToGame: Map<number, Game> = new Map()
  private gamesToRemove: Game[] = []
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

  addGame(mode: GameMode, p1: Player, p2?: Player): Promise<GameEndResult> {
    return new Promise((resolve) => {
      if (this.getPlayerGame(p1) || (p2 && this.getPlayerGame(p2)))
        return

      const game: Game = {
        p1,
        p2,
        mode,
        engine: new Engine(),
        state: GameState.WAITING,
        onEndCallback: (result) => resolve(result), // Resolve promise on game end
      }
      this.games.push(game)
      this.playerIdToGame.set(p1.id, game)
      if (p2)
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
      if (game.p2)
        this.playerIdToGame.delete(game.p2.id)
      console.log("[GameManager] Game removed")
    }
  }

  // ===== GAMES LIFECYCLE ====================

  startCountdown(game: Game): void {
    game.state = GameState.COUNTDOWN

    let countdown = COUNTDOWN_SECONDS
    broadcastCountdown(this.getSockets(game), countdown)

    clearInterval(game.countdownInterval)
    game.countdownInterval = setInterval(() => {
      countdown--
      broadcastCountdown(this.getSockets(game), countdown) // Send even when 0 to hide overlay

      if (countdown <= 0 && game.countdownInterval) {
        clearInterval(game.countdownInterval)
        game.countdownInterval = undefined
        this.startGame(game)
      }
    }, 1000)
  }

  private startGame(game: Game): void {
    game.state = GameState.PLAYING

    broadcastGameStart(this.getSockets(game))
    console.log("[GameManager] Game started")
  }

  private endGame(game: Game): void {
    game.state = GameState.FINISHED

    broadcastGameOver(this.getSockets(game))
    console.log("[GameManager] Game ended")

    const score = game.engine.getScore()

    // Send match result to user-management via NATS

    if (game.p2) {
      sendMatchResult({
        p1_id: game.p1.id,
        p2_id: game.p2.id,
        p1_score: score.left,
        p2_score: score.right,
        p1_precision: 0,
        p2_precision: 0,
      })
    }

    game.onEndCallback({
      p1: game.p1,
      p2: game.p2,
      score,
      winner: score.left > score.right ? game.p1 : game.p2,
      loser: score.left > score.right ? game.p2 : game.p1,
    })
  }

  private tick(): void {
    this.games.forEach(async (game) => {
      if (game.state === GameState.FINISHED)
        return

      const result = game.engine.tick(game.state === GameState.PLAYING)

      // Send immediate sync if ball launched or bounced on paddle (for responsive feel)
      if (result.launched || result.paddleBounce)
        this.syncGame(game)

      if (result.scorer) {
        broadcastScoreUpdate(this.getSockets(game), game.engine.getScore())

        // Brief pause to let the ball goes out of screen client side
        game.state = GameState.WAITING
        await sleep(500)

        if (result.gameOver) {
          this.endGame(game)
          this.gamesToRemove.push(game)
          return
        }

        game.engine.reset()
        this.syncGame(game)
        this.startCountdown(game)
      }
    })

    // Remove games after to not interfere with iteration
    this.gamesToRemove.forEach((game) => this.removeGame(game))
    this.gamesToRemove = []
  }

  private sync(): void {
    this.games.forEach((game) => this.syncGame(game))
  }

  private syncGame(game: Game): void {
    broadcastGameSync(this.getSockets(game), game.engine.serialize())
  }

  // ====== PLAYER INTERACTIONS ===============

  handleInput(player: Player, direction: -1 | 0 | 1, isGuest = false): void {
    const game = this.getPlayerGame(player)
    if (!game)
      return

    if (game.state === GameState.FINISHED)
      return

    const side = isGuest ? Side.RIGHT : (player.id === game.p1.id ? Side.LEFT : Side.RIGHT)
    const paddle = game.engine.setPaddleDirection(side, direction)

    broadcastPaddleUpdate(this.getSockets(game), side, paddle)
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
    else if (game.p2)
      game.p2.socket = player.socket

    sendGameFound(player.socket, game.mode, side, opponent?.username)
    sendGameStart(player.socket)
    sendScoreUpdate(player.socket, game.engine.getScore())
    this.syncGame(game)

    console.log(`[GameManager] Player ${player.username} reconnected to game`)
    return true
  }

  // ===== UTILS ==============================

  getPlayerGame(player: Player): Game | undefined {
    return this.playerIdToGame.get(player.id)
  }

  getSockets(game: Game): WebSocket[] {
    const sockets = [game.p1.socket]
    if (game.p2)
      sockets.push(game.p2.socket)
    return sockets
  }
}
