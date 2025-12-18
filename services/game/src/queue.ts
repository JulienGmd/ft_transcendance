// ============================================
// MATCHMAKING QUEUES
// Normal (1v1) and Tournament (4 players) modes
// ============================================

import { broadcastTournamentResult, broadcastTournamentWaiting, ISocket, sendGameFound } from "./communication.js"
import { createGame } from "./engine.js"
import { GameManager } from "./gameManager.js"
import { GameMode, PlayerSide, QueueEntry, TournamentRanking } from "./types.js"

// ============================================
// NORMAL QUEUE (1v1)
// ============================================

class NormalQueue {
  private queue: QueueEntry[] = []
  private playerSockets: Map<string, ISocket> = new Map()

  constructor(private gameManager: GameManager) {}

  join(playerId: string, username: string, socket: ISocket): { position: number; matched: boolean } {
    if (this.isInQueue(playerId))
      return { position: this.getPosition(playerId), matched: false }
    if (this.gameManager.getPlayerGame(playerId))
      return { position: -1, matched: false }

    const entry: QueueEntry = { playerId, username, joinedAt: Date.now(), socket }
    this.queue.push(entry)
    this.playerSockets.set(playerId, socket)

    console.log(`[NormalQueue] Player ${playerId} joined. Queue size: ${this.queue.length}`)

    if (this.queue.length >= 2) {
      this.matchPlayers()
      return { position: 0, matched: true }
    }

    return { position: this.queue.length, matched: false }
  }

  leave(playerId: string): boolean {
    const index = this.queue.findIndex((e) => e.playerId === playerId)
    if (index === -1)
      return false
    this.queue.splice(index, 1)
    this.playerSockets.delete(playerId)
    console.log(`[NormalQueue] Player ${playerId} left. Queue size: ${this.queue.length}`)
    return true
  }

  getPosition(playerId: string): number {
    const index = this.queue.findIndex((e) => e.playerId === playerId)
    return index === -1 ? -1 : index + 1
  }

  private matchPlayers(): void {
    if (this.queue.length < 2)
      return

    const player1 = this.queue.shift()!
    const player2 = this.queue.shift()!

    console.log(`[NormalQueue] Matching ${player1.playerId} vs ${player2.playerId}`)

    const game = createGame(player1.playerId, player2.playerId, GameMode.NORMAL)

    this.gameManager.addGame(game, player1.socket, player2.socket)

    sendGameFound(player1.socket, game.id, PlayerSide.LEFT, player2.username, GameMode.NORMAL)
    sendGameFound(player2.socket, game.id, PlayerSide.RIGHT, player1.username, GameMode.NORMAL)

    this.playerSockets.delete(player1.playerId)
    this.playerSockets.delete(player2.playerId)

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
// ============================================

interface TournamentBracket {
  id: string
  players: QueueEntry[] // 4 players
  round: 1 | 2 // Round 1: semifinals, Round 2: finals
  match1GameId: string | null // Player 0 vs 1
  match2GameId: string | null // Player 2 vs 3
  match1Winner: QueueEntry | null
  match1Loser: QueueEntry | null
  match2Winner: QueueEntry | null
  match2Loser: QueueEntry | null
  finalsGameId: string | null // Winner vs Winner
  thirdPlaceGameId: string | null // Loser vs Loser
  finalsWinner: QueueEntry | null
  finalsLoser: QueueEntry | null
  thirdPlaceWinner: QueueEntry | null
  thirdPlaceLoser: QueueEntry | null
}

class TournamentQueue {
  private queue: QueueEntry[] = []
  private playerSockets: Map<string, ISocket> = new Map()
  private brackets: Map<string, TournamentBracket> = new Map()
  private gameToTournament: Map<string, string> = new Map() // gameId -> bracketId

  constructor(private gameManager: GameManager) {}

  join(playerId: string, username: string, socket: ISocket): { position: number; matched: boolean } {
    if (this.isInQueue(playerId))
      return { position: this.getPosition(playerId), matched: false }
    if (this.gameManager.getPlayerGame(playerId))
      return { position: -1, matched: false }

    const entry: QueueEntry = { playerId, username, joinedAt: Date.now(), socket }
    this.queue.push(entry)
    this.playerSockets.set(playerId, socket)

    console.log(`[TournamentQueue] Player ${playerId} joined. Queue size: ${this.queue.length}`)

    if (this.queue.length >= 4) {
      this.startTournament()
      return { position: 0, matched: true }
    }

    return { position: this.queue.length, matched: false }
  }

  leave(playerId: string): boolean {
    const index = this.queue.findIndex((e) => e.playerId === playerId)
    if (index === -1)
      return false
    this.queue.splice(index, 1)
    this.playerSockets.delete(playerId)
    console.log(`[TournamentQueue] Player ${playerId} left. Queue size: ${this.queue.length}`)
    return true
  }

  getPosition(playerId: string): number {
    const index = this.queue.findIndex((e) => e.playerId === playerId)
    return index === -1 ? -1 : index + 1
  }

  private startTournament(): void {
    if (this.queue.length < 4)
      return

    const players = [
      this.queue.shift()!,
      this.queue.shift()!,
      this.queue.shift()!,
      this.queue.shift()!,
    ]

    const bracketId = `tournament-${Date.now()}`
    const bracket: TournamentBracket = {
      id: bracketId,
      players,
      round: 1,
      match1GameId: null,
      match2GameId: null,
      match1Winner: null,
      match1Loser: null,
      match2Winner: null,
      match2Loser: null,
      finalsGameId: null,
      thirdPlaceGameId: null,
      finalsWinner: null,
      finalsLoser: null,
      thirdPlaceWinner: null,
      thirdPlaceLoser: null,
    }

    console.log(
      `[TournamentQueue] Starting tournament ${bracketId} with players: ${players.map((p) => p.username).join(", ")}`,
    )

    // Create Match 1: Player 0 vs Player 1
    const game1 = createGame(players[0].playerId, players[1].playerId, GameMode.TOURNAMENT)
    bracket.match1GameId = game1.id
    this.gameToTournament.set(game1.id, bracketId)
    this.gameManager.addGame(game1, players[0].socket, players[1].socket)
    sendGameFound(players[0].socket, game1.id, PlayerSide.LEFT, players[1].username, GameMode.TOURNAMENT)
    sendGameFound(players[1].socket, game1.id, PlayerSide.RIGHT, players[0].username, GameMode.TOURNAMENT)

    // Create Match 2: Player 2 vs Player 3
    const game2 = createGame(players[2].playerId, players[3].playerId, GameMode.TOURNAMENT)
    bracket.match2GameId = game2.id
    this.gameToTournament.set(game2.id, bracketId)
    this.gameManager.addGame(game2, players[2].socket, players[3].socket)
    sendGameFound(players[2].socket, game2.id, PlayerSide.LEFT, players[3].username, GameMode.TOURNAMENT)
    sendGameFound(players[3].socket, game2.id, PlayerSide.RIGHT, players[2].username, GameMode.TOURNAMENT)

    this.brackets.set(bracketId, bracket)

    // Clean up player sockets
    for (const p of players)
      this.playerSockets.delete(p.playerId)

    // Start both games
    this.gameManager.startCountdown(game1.id)
    this.gameManager.startCountdown(game2.id)
  }

  // Called by GameManager when a tournament game ends
  onGameEnd(gameId: string, winnerId: string): void {
    const bracketId = this.gameToTournament.get(gameId)
    if (!bracketId)
      return

    const bracket = this.brackets.get(bracketId)
    if (!bracket)
      return

    const session = this.gameManager.getGameSession(gameId)
    if (!session)
      return

    if (bracket.round === 1)
      this.handleSemifinalEnd(bracket, gameId, winnerId, session.sockets)
    else
      this.handleFinalEnd(bracket, gameId, winnerId, session.sockets)
  }

  private handleSemifinalEnd(
    bracket: TournamentBracket,
    gameId: string,
    winnerId: string,
    sockets: Map<string, ISocket>,
  ): void {
    const isMatch1 = gameId === bracket.match1GameId
    const players = bracket.players

    if (isMatch1) {
      // Match 1: players[0] vs players[1]
      bracket.match1Winner = players.find((p) => p.playerId === winnerId)!
      bracket.match1Loser = players.find((p) => (p === players[0] || p === players[1]) && p.playerId !== winnerId)!

      // Update sockets from game session
      if (bracket.match1Winner)
        bracket.match1Winner.socket = sockets.get(bracket.match1Winner.playerId) || bracket.match1Winner.socket
      if (bracket.match1Loser)
        bracket.match1Loser.socket = sockets.get(bracket.match1Loser.playerId) || bracket.match1Loser.socket

      console.log(`[Tournament] Match 1 ended. Winner: ${bracket.match1Winner?.username}`)
    } else {
      // Match 2: players[2] vs players[3]
      bracket.match2Winner = players.find((p) => p.playerId === winnerId)!
      bracket.match2Loser = players.find((p) => (p === players[2] || p === players[3]) && p.playerId !== winnerId)!

      // Update sockets from game session
      if (bracket.match2Winner)
        bracket.match2Winner.socket = sockets.get(bracket.match2Winner.playerId) || bracket.match2Winner.socket
      if (bracket.match2Loser)
        bracket.match2Loser.socket = sockets.get(bracket.match2Loser.playerId) || bracket.match2Loser.socket

      console.log(`[Tournament] Match 2 ended. Winner: ${bracket.match2Winner?.username}`)
    }

    // Send waiting message to finished players
    for (const [, socket] of sockets)
      broadcastTournamentWaiting([socket], "Waiting for other match to finish...")

    // Check if both semifinals are done
    if (bracket.match1Winner && bracket.match2Winner && bracket.match1Loser && bracket.match2Loser) {
      console.log(`[Tournament] Both semifinals done. Starting finals...`)
      bracket.round = 2
      this.startFinals(bracket)
    }
  }

  private startFinals(bracket: TournamentBracket): void {
    // Finals: Winner vs Winner
    const finalsGame = createGame(
      bracket.match1Winner!.playerId,
      bracket.match2Winner!.playerId,
      GameMode.TOURNAMENT,
    )
    bracket.finalsGameId = finalsGame.id
    this.gameToTournament.set(finalsGame.id, bracket.id)
    this.gameManager.addGame(finalsGame, bracket.match1Winner!.socket, bracket.match2Winner!.socket)
    sendGameFound(
      bracket.match1Winner!.socket,
      finalsGame.id,
      PlayerSide.LEFT,
      bracket.match2Winner!.username,
      GameMode.TOURNAMENT,
    )
    sendGameFound(
      bracket.match2Winner!.socket,
      finalsGame.id,
      PlayerSide.RIGHT,
      bracket.match1Winner!.username,
      GameMode.TOURNAMENT,
    )

    // Third place: Loser vs Loser
    const thirdPlaceGame = createGame(
      bracket.match1Loser!.playerId,
      bracket.match2Loser!.playerId,
      GameMode.TOURNAMENT,
    )
    bracket.thirdPlaceGameId = thirdPlaceGame.id
    this.gameToTournament.set(thirdPlaceGame.id, bracket.id)
    this.gameManager.addGame(thirdPlaceGame, bracket.match1Loser!.socket, bracket.match2Loser!.socket)
    sendGameFound(
      bracket.match1Loser!.socket,
      thirdPlaceGame.id,
      PlayerSide.LEFT,
      bracket.match2Loser!.username,
      GameMode.TOURNAMENT,
    )
    sendGameFound(
      bracket.match2Loser!.socket,
      thirdPlaceGame.id,
      PlayerSide.RIGHT,
      bracket.match1Loser!.username,
      GameMode.TOURNAMENT,
    )

    // Start both games
    this.gameManager.startCountdown(finalsGame.id)
    this.gameManager.startCountdown(thirdPlaceGame.id)
  }

  private handleFinalEnd(
    bracket: TournamentBracket,
    gameId: string,
    winnerId: string,
    sockets: Map<string, ISocket>,
  ): void {
    const isFinals = gameId === bracket.finalsGameId

    if (isFinals) {
      bracket.finalsWinner = winnerId === bracket.match1Winner!.playerId ? bracket.match1Winner : bracket.match2Winner
      bracket.finalsLoser = winnerId === bracket.match1Winner!.playerId ? bracket.match2Winner : bracket.match1Winner

      // Update sockets
      if (bracket.finalsWinner)
        bracket.finalsWinner.socket = sockets.get(bracket.finalsWinner.playerId) || bracket.finalsWinner.socket
      if (bracket.finalsLoser)
        bracket.finalsLoser.socket = sockets.get(bracket.finalsLoser.playerId) || bracket.finalsLoser.socket

      console.log(`[Tournament] Finals ended. Winner: ${bracket.finalsWinner?.username}`)
    } else {
      bracket.thirdPlaceWinner = winnerId === bracket.match1Loser!.playerId ? bracket.match1Loser : bracket.match2Loser
      bracket.thirdPlaceLoser = winnerId === bracket.match1Loser!.playerId ? bracket.match2Loser : bracket.match1Loser

      // Update sockets
      if (bracket.thirdPlaceWinner) {
        bracket.thirdPlaceWinner.socket = sockets.get(bracket.thirdPlaceWinner.playerId)
          || bracket.thirdPlaceWinner.socket
      }
      if (bracket.thirdPlaceLoser)
        bracket.thirdPlaceLoser.socket = sockets.get(bracket.thirdPlaceLoser.playerId) || bracket.thirdPlaceLoser.socket

      console.log(`[Tournament] Third place match ended. Winner: ${bracket.thirdPlaceWinner?.username}`)
    }

    // Send waiting message to finished players
    for (const [, socket] of sockets)
      broadcastTournamentWaiting([socket], "Waiting for other match to finish...")

    // Check if tournament is complete
    if (bracket.finalsWinner && bracket.thirdPlaceWinner)
      this.endTournament(bracket)
  }

  private endTournament(bracket: TournamentBracket): void {
    const rankings: TournamentRanking[] = [
      { rank: 1, username: bracket.finalsWinner!.username },
      { rank: 2, username: bracket.finalsLoser!.username },
      { rank: 3, username: bracket.thirdPlaceWinner!.username },
      { rank: 4, username: bracket.thirdPlaceLoser!.username },
    ]

    console.log(`[Tournament] Tournament ${bracket.id} complete!`)
    console.log(`  1st: ${rankings[0].username}`)
    console.log(`  2nd: ${rankings[1].username}`)
    console.log(`  3rd: ${rankings[2].username}`)
    console.log(`  4th: ${rankings[3].username}`)

    // Broadcast results to all players
    const allSockets = [
      bracket.finalsWinner!.socket,
      bracket.finalsLoser!.socket,
      bracket.thirdPlaceWinner!.socket,
      bracket.thirdPlaceLoser!.socket,
    ]
    broadcastTournamentResult(allSockets, rankings)

    // Cleanup
    if (bracket.match1GameId)
      this.gameToTournament.delete(bracket.match1GameId)
    if (bracket.match2GameId)
      this.gameToTournament.delete(bracket.match2GameId)
    if (bracket.finalsGameId)
      this.gameToTournament.delete(bracket.finalsGameId)
    if (bracket.thirdPlaceGameId)
      this.gameToTournament.delete(bracket.thirdPlaceGameId)
    this.brackets.delete(bracket.id)
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
