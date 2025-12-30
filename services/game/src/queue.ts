// ============================================
// MATCHMAKING QUEUES
// Normal (1v1) and Tournament (4 players) modes
// ============================================

import { broadcastTournamentResult, broadcastTournamentWaiting, ISocket, sendGameFound } from "./communication"
import { createGame } from "./engine"
import { GameManager } from "./gameManager"
import { GameMode, PlayerSide, QueueEntry, TournamentRanking } from "./types"

// ============================================
// NORMAL QUEUE (1v1)
// ============================================

class NormalQueue {
  private queue: QueueEntry[] = []

  constructor(private gameManager: GameManager) {}

  join(playerId: string, username: string, socket: ISocket): { position: number; matched: boolean } {
    if (this.isInQueue(playerId))
      return { position: this.getPosition(playerId), matched: false }
    if (this.gameManager.getPlayerGame(playerId))
      return { position: -1, matched: false }

    this.queue.push({ playerId, username, joinedAt: Date.now(), socket })
    console.log(`[NormalQueue] Player ${username} joined. Queue size: ${this.queue.length}`)

    if (this.queue.length >= 2) {
      this.matchPlayers()
      return { position: 0, matched: true }
    }
    return { position: this.queue.length, matched: false }
  }

  leave(playerId: string): boolean {
    const idx = this.queue.findIndex((e) => e.playerId === playerId)
    if (idx === -1)
      return false
    this.queue.splice(idx, 1)
    return true
  }

  getPosition(playerId: string): number {
    const idx = this.queue.findIndex((e) => e.playerId === playerId)
    return idx === -1 ? -1 : idx + 1
  }

  private matchPlayers(): void {
    const p1 = this.queue.shift()!
    const p2 = this.queue.shift()!

    const game = createGame(p1.playerId, p1.username, p2.playerId, p2.username, GameMode.NORMAL)
    this.gameManager.addGame(game, p1.socket, p2.socket)

    sendGameFound(p1.socket, game.id, PlayerSide.LEFT, p2.username, GameMode.NORMAL)
    sendGameFound(p2.socket, game.id, PlayerSide.RIGHT, p1.username, GameMode.NORMAL)

    this.gameManager.startCountdown(game.id)
  }

  handleDisconnect(playerId: string): void {
    this.leave(playerId)
  }

  get size(): number {
    return this.queue.length
  }

  isInQueue(playerId: string): boolean {
    return this.queue.some((e) => e.playerId === playerId)
  }
}

// ============================================
// TOURNAMENT QUEUE (4 players)
// Simple state machine: SEMIFINALS -> FINALS -> DONE
// ============================================

interface TournamentPlayer {
  playerId: string
  username: string
}

interface Tournament {
  id: string
  players: TournamentPlayer[] // [0,1] = semi1, [2,3] = semi2
  sockets: Map<string, ISocket> // playerId -> socket, updated when semifinal ends
  semi1GameId: string
  semi2GameId: string
  finalsGameId: string | null
  thirdGameId: string | null
  // Results: winner index (0-3)
  semi1Winner: number | null
  semi2Winner: number | null
  finalsWinner: number | null
  thirdWinner: number | null
}

class TournamentQueue {
  private queue: QueueEntry[] = []
  private tournaments: Map<string, Tournament> = new Map()
  private gameToTournament: Map<string, string> = new Map()

  constructor(private gameManager: GameManager) {}

  join(playerId: string, username: string, socket: ISocket): { position: number; matched: boolean } {
    if (this.isInQueue(playerId))
      return { position: this.getPosition(playerId), matched: false }
    if (this.gameManager.getPlayerGame(playerId))
      return { position: -1, matched: false }

    this.queue.push({ playerId, username, joinedAt: Date.now(), socket })
    console.log(`[TournamentQueue] Player ${username} joined. Queue size: ${this.queue.length}`)

    if (this.queue.length >= 4) {
      this.startTournament()
      return { position: 0, matched: true }
    }
    return { position: this.queue.length, matched: false }
  }

  leave(playerId: string): boolean {
    const idx = this.queue.findIndex((e) => e.playerId === playerId)
    if (idx === -1)
      return false
    this.queue.splice(idx, 1)
    return true
  }

  getPosition(playerId: string): number {
    const idx = this.queue.findIndex((e) => e.playerId === playerId)
    return idx === -1 ? -1 : idx + 1
  }

  private startTournament(): void {
    const entries = [this.queue.shift()!, this.queue.shift()!, this.queue.shift()!, this.queue.shift()!]
    const players = entries.map((e) => ({ playerId: e.playerId, username: e.username }))

    const id = `t-${Date.now()}`
    console.log(`[Tournament] Starting ${id}: ${players.map((p) => p.username).join(", ")}`)

    // Create both semifinals
    const game1 = createGame(
      players[0].playerId,
      players[0].username,
      players[1].playerId,
      players[1].username,
      GameMode.TOURNAMENT,
    )
    const game2 = createGame(
      players[2].playerId,
      players[2].username,
      players[3].playerId,
      players[3].username,
      GameMode.TOURNAMENT,
    )

    this.gameManager.addGame(game1, entries[0].socket, entries[1].socket)
    this.gameManager.addGame(game2, entries[2].socket, entries[3].socket)

    // Initialize sockets map with initial sockets from queue entries
    const socketsMap = new Map<string, ISocket>()
    entries.forEach((e) => socketsMap.set(e.playerId, e.socket))

    const tournament: Tournament = {
      id,
      players,
      sockets: socketsMap,
      semi1GameId: game1.id,
      semi2GameId: game2.id,
      finalsGameId: null,
      thirdGameId: null,
      semi1Winner: null,
      semi2Winner: null,
      finalsWinner: null,
      thirdWinner: null,
    }

    this.tournaments.set(id, tournament)
    this.gameToTournament.set(game1.id, id)
    this.gameToTournament.set(game2.id, id)

    // Send game_found and start
    sendGameFound(entries[0].socket, game1.id, PlayerSide.LEFT, players[1].username, GameMode.TOURNAMENT)
    sendGameFound(entries[1].socket, game1.id, PlayerSide.RIGHT, players[0].username, GameMode.TOURNAMENT)
    sendGameFound(entries[2].socket, game2.id, PlayerSide.LEFT, players[3].username, GameMode.TOURNAMENT)
    sendGameFound(entries[3].socket, game2.id, PlayerSide.RIGHT, players[2].username, GameMode.TOURNAMENT)

    this.gameManager.startCountdown(game1.id)
    this.gameManager.startCountdown(game2.id)
  }

  onGameEnd(gameId: string, winnerId: string): void {
    const tournamentId = this.gameToTournament.get(gameId)
    if (!tournamentId)
      return
    const t = this.tournaments.get(tournamentId)
    if (!t)
      return

    // Semifinals phase
    if (gameId === t.semi1GameId || gameId === t.semi2GameId)
      this.onSemifinalEnd(t, gameId, winnerId)
    // Finals phase
    else if (gameId === t.finalsGameId || gameId === t.thirdGameId)
      this.onFinalEnd(t, gameId, winnerId)
  }

  private onSemifinalEnd(t: Tournament, gameId: string, winnerId: string): void {
    const session = this.gameManager.getGameSession(gameId)

    // Update sockets from the session (most up-to-date)
    if (session) {
      for (const [playerId, socket] of session.sockets)
        t.sockets.set(playerId, socket)
    }

    if (gameId === t.semi1GameId) {
      t.semi1Winner = t.players[0].playerId === winnerId ? 0 : 1
      console.log(`[Tournament] Semi1 done. Winner: ${t.players[t.semi1Winner].username}`)
    } else {
      t.semi2Winner = t.players[2].playerId === winnerId ? 2 : 3
      console.log(`[Tournament] Semi2 done. Winner: ${t.players[t.semi2Winner].username}`)
    }

    // Send waiting message
    if (session) {
      for (const socket of session.sockets.values())
        broadcastTournamentWaiting([socket], "Waiting for other match...")
    }

    // Both done? Start finals
    if (t.semi1Winner !== null && t.semi2Winner !== null)
      this.startFinals(t)
  }

  private startFinals(t: Tournament): void {
    console.log(`[Tournament] Starting finals...`)

    const p = t.players
    const w1 = t.semi1Winner!
    const l1 = w1 === 0 ? 1 : 0
    const w2 = t.semi2Winner!
    const l2 = w2 === 2 ? 3 : 2

    // Get sockets from tournament (updated during onSemifinalEnd)
    const w1Socket = t.sockets.get(p[w1].playerId)!
    const l1Socket = t.sockets.get(p[l1].playerId)!
    const w2Socket = t.sockets.get(p[w2].playerId)!
    const l2Socket = t.sockets.get(p[l2].playerId)!

    // Finals: winner vs winner
    const finals = createGame(p[w1].playerId, p[w1].username, p[w2].playerId, p[w2].username, GameMode.TOURNAMENT)
    t.finalsGameId = finals.id
    this.gameToTournament.set(finals.id, t.id)
    this.gameManager.addGame(finals, w1Socket, w2Socket)

    // Third place: loser vs loser
    const third = createGame(p[l1].playerId, p[l1].username, p[l2].playerId, p[l2].username, GameMode.TOURNAMENT)
    t.thirdGameId = third.id
    this.gameToTournament.set(third.id, t.id)
    this.gameManager.addGame(third, l1Socket, l2Socket)

    // Send game_found using tournament sockets
    sendGameFound(w1Socket, finals.id, PlayerSide.LEFT, p[w2].username, GameMode.TOURNAMENT)
    sendGameFound(w2Socket, finals.id, PlayerSide.RIGHT, p[w1].username, GameMode.TOURNAMENT)
    sendGameFound(l1Socket, third.id, PlayerSide.LEFT, p[l2].username, GameMode.TOURNAMENT)
    sendGameFound(l2Socket, third.id, PlayerSide.RIGHT, p[l1].username, GameMode.TOURNAMENT)

    this.gameManager.startCountdown(finals.id)
    this.gameManager.startCountdown(third.id)
  }

  private onFinalEnd(t: Tournament, gameId: string, winnerId: string): void {
    const session = this.gameManager.getGameSession(gameId)
    const p = t.players

    // Update sockets from the session (most up-to-date)
    if (session) {
      for (const [playerId, socket] of session.sockets)
        t.sockets.set(playerId, socket)
    }

    if (gameId === t.finalsGameId) {
      const w1 = t.semi1Winner!
      const w2 = t.semi2Winner!
      t.finalsWinner = p[w1].playerId === winnerId ? w1 : w2
      console.log(`[Tournament] Finals done. Winner: ${p[t.finalsWinner].username}`)
    } else {
      const l1 = t.semi1Winner === 0 ? 1 : 0
      const l2 = t.semi2Winner === 2 ? 3 : 2
      t.thirdWinner = p[l1].playerId === winnerId ? l1 : l2
      console.log(`[Tournament] 3rd place done. Winner: ${p[t.thirdWinner].username}`)
    }

    // Send waiting
    if (session) {
      for (const socket of session.sockets.values())
        broadcastTournamentWaiting([socket], "Waiting for other match...")
    }

    // Both done? End tournament
    if (t.finalsWinner !== null && t.thirdWinner !== null)
      this.endTournament(t)
  }

  private endTournament(t: Tournament): void {
    const p = t.players
    const w1 = t.semi1Winner!
    const w2 = t.semi2Winner!
    const l1 = w1 === 0 ? 1 : 0
    const l2 = w2 === 2 ? 3 : 2

    const first = t.finalsWinner!
    const second = first === w1 ? w2 : w1
    const third = t.thirdWinner!
    const fourth = third === l1 ? l2 : l1

    const rankings: TournamentRanking[] = [
      { rank: 1, username: p[first].username },
      { rank: 2, username: p[second].username },
      { rank: 3, username: p[third].username },
      { rank: 4, username: p[fourth].username },
    ]

    console.log(`[Tournament] ${t.id} complete!`)
    rankings.forEach((r) => console.log(`  ${r.rank}. ${r.username}`))

    // Get all sockets from tournament (up-to-date)
    const allSockets = [...t.sockets.values()]

    broadcastTournamentResult(allSockets, rankings)

    // Cleanup
    this.gameToTournament.delete(t.semi1GameId)
    this.gameToTournament.delete(t.semi2GameId)
    if (t.finalsGameId)
      this.gameToTournament.delete(t.finalsGameId)
    if (t.thirdGameId)
      this.gameToTournament.delete(t.thirdGameId)
    this.tournaments.delete(t.id)
  }

  handleDisconnect(playerId: string): void {
    this.leave(playerId)
  }

  get size(): number {
    return this.queue.length
  }

  isInQueue(playerId: string): boolean {
    return this.queue.some((e) => e.playerId === playerId)
  }

  isTournamentGame(gameId: string): boolean {
    return this.gameToTournament.has(gameId)
  }
}

export { NormalQueue, TournamentQueue }
