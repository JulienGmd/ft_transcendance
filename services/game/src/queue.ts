// ============================================
// MATCHMAKING QUEUES
// Normal (1v1) and Tournament (4 players) modes
// ============================================

import { broadcastTournamentResult, sendGameFound, sendQueueJoined, sendQueueLeft, sendTournamentResult } from "./communication.js"
import { GameEndResult, GameManager } from "./gameManager.js"
import { GameMode, Side, TournamentResult } from "./sharedTypes.js"
import { Player } from "./types.js"
import { sleep } from "./utils.js"

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
    sendQueueJoined(player.socket, this.mode, this.length)
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
  sendGameFound(p1.socket, mode, Side.LEFT, p2.username)
  sendGameFound(p2.socket, mode, Side.RIGHT, p1.username)
  return gameManager.addGame(mode, p1, p2)
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

interface Tournament {
  semi1: { p1: Player; p2: Player; winner?: Player; loser?: Player }
  semi2: { p1: Player; p2: Player; winner?: Player; loser?: Player }
  final?: { p1: Player; p2: Player; winner?: Player }
  third?: { p1: Player; p2: Player; winner?: Player }
}

interface ActiveTournament {
  id: string
  tournament: Tournament
  players: Player[]
}

export class TournamentMatchmaking {
  private readonly gameManager: GameManager
  private readonly queue: Queue
  private readonly activeTournaments: Map<string, ActiveTournament> = new Map()
  private tournamentIdCounter = 0

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

  /**
   * Find the active tournament a player is in
   */
  findPlayerTournament(player: Player): ActiveTournament | undefined {
    for (const activeTournament of this.activeTournaments.values()) {
      if (activeTournament.players.some((p) => p.id === player.id))
        return activeTournament
    }
    return undefined
  }

  /**
   * Handle player reconnection to their tournament
   * Updates the player's socket reference and sends current tournament state
   */
  handleReconnect(player: Player): boolean {
    const activeTournament = this.findPlayerTournament(player)
    if (!activeTournament)
      return false

    // Update socket reference for the player
    const tournamentPlayer = activeTournament.players.find((p) => p.id === player.id)
    if (tournamentPlayer) {
      tournamentPlayer.socket = player.socket
      console.log(`[TournamentMatchmaking] Player ${player.username} reconnected to tournament ${activeTournament.id}`)

      // Send current tournament state to the reconnected player
      sendTournamentResult(player.socket, this.tournamentToTournamentResult(activeTournament.tournament))
    }

    return true
  }

  private async tryStartTournament(): Promise<void> {
    if (this.queue.length < 4)
      return

    const players = [this.queue.shift()!, this.queue.shift()!, this.queue.shift()!, this.queue.shift()!]
    const playersInGame = new Set<Player>()
    console.log(`[TournamentMatchmaking] Starting: ${players.map((p) => p.username).join(", ")}`)

    // Note: since objects are passed by reference, even if a player reconnect to his game
    // during the tournament, their socket will be updated and reflected here.

    const tournament: Tournament = {
      semi1: { p1: players[0], p2: players[1] },
      semi2: { p1: players[2], p2: players[3] },
    }

    // Register this tournament in the active tournaments map
    const tournamentId = `tournament_${++this.tournamentIdCounter}`
    const activeTournament: ActiveTournament = { id: tournamentId, tournament, players }
    this.activeTournaments.set(tournamentId, activeTournament)
    console.log(`[TournamentMatchmaking] Registered tournament ${tournamentId}`)

    this.broadcastTournamentState(activeTournament)
    await sleep(5000)

    // Play semis
    playersInGame.add(tournament.semi1.p1).add(tournament.semi1.p2).add(tournament.semi2.p1).add(tournament.semi2.p2)
    const semi1Promise = createGame(this.gameManager, tournament.semi1.p1, tournament.semi1.p2, GameMode.TOURNAMENT)
    const semi2Promise = createGame(this.gameManager, tournament.semi2.p1, tournament.semi2.p2, GameMode.TOURNAMENT)

    // Update tournament and send results as games finish (only to players not in game)
    semi1Promise.then((gameResult) => {
      playersInGame.delete(tournament.semi1.p1)
      playersInGame.delete(tournament.semi1.p2)
      tournament.semi1.winner = gameResult.winner
      tournament.semi1.loser = gameResult.loser
      this.broadcastTournamentState(activeTournament, playersInGame)
    })
    semi2Promise.then((gameResult) => {
      playersInGame.delete(tournament.semi2.p1)
      playersInGame.delete(tournament.semi2.p2)
      tournament.semi2.winner = gameResult.winner
      tournament.semi2.loser = gameResult.loser
      this.broadcastTournamentState(activeTournament, playersInGame)
    })

    // Wait for both semis to finish to determine finals matchups
    await Promise.all([semi1Promise, semi2Promise])
    tournament.final = { p1: tournament.semi1.winner!, p2: tournament.semi2.winner! }
    tournament.third = { p1: tournament.semi1.loser!, p2: tournament.semi2.loser! }
    this.broadcastTournamentState(activeTournament)
    await sleep(5000)

    // Play finals
    playersInGame.add(tournament.final.p1).add(tournament.final.p2).add(tournament.third.p1).add(tournament.third.p2)
    const finalPromise = createGame(this.gameManager, tournament.final.p1!, tournament.final.p2!, GameMode.TOURNAMENT)
    const thirdPromise = createGame(this.gameManager, tournament.third.p1!, tournament.third.p2!, GameMode.TOURNAMENT)

    // Send results as games finish (only to players not in game)
    finalPromise.then((gameResult) => {
      playersInGame.delete(tournament.final!.p1)
      playersInGame.delete(tournament.final!.p2)
      tournament.final!.winner = gameResult.winner
      this.broadcastTournamentState(activeTournament, playersInGame)
    })
    thirdPromise.then((gameResult) => {
      playersInGame.delete(tournament.third!.p1)
      playersInGame.delete(tournament.third!.p2)
      tournament.third!.winner = gameResult.winner
      this.broadcastTournamentState(activeTournament, playersInGame)
    })

    // Wait for finals to finish and cleanup
    await Promise.all([finalPromise, thirdPromise])
    console.log(`[TournamentMatchmaking] Tournament ${tournamentId} finished, cleaning up`)
    this.activeTournaments.delete(tournamentId)
  }

  /**
   * Broadcast current tournament state to all players
   * Uses current socket references to handle reconnections
   */
  private broadcastTournamentState(activeTournament: ActiveTournament, excludePlayers?: Set<Player>): void {
    const players = excludePlayers
      ? activeTournament.players.filter((p) => !excludePlayers.has(p))
      : activeTournament.players
    const sockets = players.map((p) => p.socket)
    broadcastTournamentResult(sockets, this.tournamentToTournamentResult(activeTournament.tournament))
  }

  private tournamentToTournamentResult(tournament: Tournament): TournamentResult {
    const result: TournamentResult = {
      semi1: {
        p1: tournament.semi1.p1.username,
        p2: tournament.semi1.p2.username,
        winner: tournament.semi1.winner?.username,
      },
      semi2: {
        p1: tournament.semi2.p1.username,
        p2: tournament.semi2.p2.username,
        winner: tournament.semi2.winner?.username,
      },
    }

    if (tournament.final) {
      result.final = {
        p1: tournament.final.p1.username,
        p2: tournament.final.p2.username,
        winner: tournament.final.winner?.username,
      }
    }

    if (tournament.third) {
      result.third = {
        p1: tournament.third.p1.username,
        p2: tournament.third.p2.username,
        winner: tournament.third.winner?.username,
      }
    }

    return result
  }
}
