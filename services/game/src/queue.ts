// ============================================
// MATCHMAKING QUEUES
// Normal (1v1) and Tournament (4 players) modes
// ============================================

import { broadcastTournamentResult, sendGameFound, sendQueueJoined, sendQueueLeft } from "./communication"
import { GameEndResult, GameManager } from "./gameManager"
import { GameMode, Side } from "./sharedTypes"
import { Player } from "./types"

class Queue {
  private readonly gameManager: GameManager
  private readonly mode: GameMode

  private readonly queue: Player[] = []

  matchPlayers?: () => void

  constructor(gameManager: GameManager, mode: GameMode) {
    this.gameManager = gameManager
    this.mode = mode
  }

  join(player: Player): boolean {
    if (this.isInQueue(player) || this.gameManager.getPlayerGame(player))
      return false

    this.queue.push(player)
    sendQueueJoined(player.socket, this.length, this.mode)
    console.log(`[Queue:${this.mode}] Player ${player.username} joined at position: ${this.queue.length}`)

    this.matchPlayers?.()
    return true
  }

  leave(player: Player): boolean {
    const idx = this.queue.findIndex((p) => p.id === player.id)
    if (idx === -1)
      return false

    this.queue.splice(idx, 1)
    sendQueueLeft(player.socket)
    console.log(`[Queue:${this.mode}] Player ${player.username} left`)

    return true
  }

  shift(): Player | undefined {
    return this.queue.shift()
  }

  isInQueue(player: Player): boolean {
    return this.queue.some((p) => p.id === player.id)
  }

  get length(): number {
    return this.queue.length
  }
}

async function createGame(
  gameManager: GameManager,
  p1: Player,
  p2: Player,
  mode: GameMode,
): Promise<GameEndResult> {
  sendGameFound(p1.socket, Side.LEFT, p2.username, mode)
  sendGameFound(p2.socket, Side.RIGHT, p1.username, mode)
  return gameManager.addGame(p1, p2, mode)
}

export class NormalMatchmaking {
  private readonly gameManager: GameManager
  private readonly queue: Queue

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager
    this.queue = new Queue(gameManager, GameMode.NORMAL)
    this.queue.matchPlayers = () => this.tryCreateGame()
  }

  join(player: Player): boolean {
    return this.queue.join(player)
  }

  leave(player: Player): boolean {
    return this.queue.leave(player)
  }

  isInQueue(player: Player): boolean {
    return this.queue.isInQueue(player)
  }

  private tryCreateGame(): void {
    if (this.queue.length < 2)
      return

    const p1 = this.queue.shift()!
    const p2 = this.queue.shift()!
    console.log(`[NormalMatchmaking] Creating game: ${p1.username} vs ${p2.username}`)
    createGame(this.gameManager, p1, p2, GameMode.NORMAL)
  }
}

export class TournamentMatchmaking {
  private readonly gameManager: GameManager
  private readonly queue: Queue

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager
    this.queue = new Queue(gameManager, GameMode.TOURNAMENT)
    this.queue.matchPlayers = () => this.tryStartTournament()
  }

  join(player: Player): boolean {
    return this.queue.join(player)
  }

  leave(player: Player): boolean {
    return this.queue.leave(player)
  }

  isInQueue(player: Player): boolean {
    return this.queue.isInQueue(player)
  }

  private async tryStartTournament(): Promise<void> {
    if (this.queue.length < 4)
      return

    const players = [this.queue.shift()!, this.queue.shift()!, this.queue.shift()!, this.queue.shift()!]
    console.log(`[TournamentMatchmaking] Starting: ${players.map((p) => p.username).join(", ")}`)

    // Note: since objects are passed by reference, even if a player reconnect to his game
    // during the tournament, their socket will be updated and reflected here.

    const semi1Promise = createGame(this.gameManager, players[0], players[1], GameMode.TOURNAMENT)
    const semi2Promise = createGame(this.gameManager, players[2], players[3], GameMode.TOURNAMENT)
    const [semi1, semi2] = await Promise.all([semi1Promise, semi2Promise])
    console.log(`[TournamentMatchmaking] Semifinals winners: ${semi1.winner.username}, ${semi2.winner.username}`)

    const finalPromise = createGame(this.gameManager, semi1.winner, semi2.winner, GameMode.TOURNAMENT)
    const thirdPromise = createGame(this.gameManager, semi1.loser, semi2.loser, GameMode.TOURNAMENT)
    const [final, third] = await Promise.all([finalPromise, thirdPromise])
    console.log(`[TournamentMatchmaking] Finals winners: ${final.winner.username}, 3rd place: ${third.winner.username}`)

    const rankings = [final.winner, final.loser, third.winner, third.loser]
    console.log(`[TournamentMatchmaking] Complete! Rankings:`)
    rankings.forEach((r, i) => console.log(`  ${i + 1}. ${r.username}`))

    const sockets = rankings.map((r) => r.socket)
    const rankingsUsernames = rankings.map((r) => r.username)
    broadcastTournamentResult(sockets, rankingsUsernames)
  }
}
