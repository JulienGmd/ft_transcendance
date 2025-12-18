// ============================================
// MATCHMAKING QUEUE
// Uses ISocket abstraction for communication
// ============================================

import { ISocket, sendGameFound } from "./communication.js"
import { createGame } from "./engine.js"
import { GameManager } from "./gameManager.js"
import { PlayerSide, QueueEntry } from "./types.js"

// ============================================
// QUEUE CLASS
// ============================================

class MatchmakingQueue {
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

    console.log(`[Queue] Player ${playerId} joined. Queue size: ${this.queue.length}`)

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
    console.log(`[Queue] Player ${playerId} left. Queue size: ${this.queue.length}`)
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

    console.log(`[Queue] Matching ${player1.playerId} vs ${player2.playerId}`)

    const game = createGame(player1.playerId, player2.playerId)

    this.gameManager.addGame(game, player1.socket, player2.socket)

    sendGameFound(player1.socket, game.id, PlayerSide.LEFT, player2.username)
    sendGameFound(player2.socket, game.id, PlayerSide.RIGHT, player1.username)

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

export { MatchmakingQueue }
