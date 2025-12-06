import BetterSqlite3 from "better-sqlite3"
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { verifyToken } from "../auth/jwt"
import {
  createMatch,
  getAllMatches,
  getMatchById,
  getPlayerMatchHistory,
  getPlayerStats,
  MatchWithUsernames,
} from "./match.service"

// Mapper les données de la base vers le format attendu par le frontend
function mapMatchForFrontend(match: MatchWithUsernames) {
  return {
    id: match.match_id,
    player1_id: match.id_player1,
    player2_id: match.id_player2,
    player1_score: match.score_p1,
    player2_score: match.score_p2,
    player1_precision: match.precision_player1,
    player2_precision: match.precision_player2,
    winner_id: match.winner_id,
    created_at: match.created_at,
    player1_username: match.player1_username,
    player2_username: match.player2_username,
  }
}

export async function matchRoutes(fastify: FastifyInstance, db: BetterSqlite3.Database) {
  // Créer un nouveau match
  fastify.post("/api/user/matches", async (request: FastifyRequest, reply: FastifyReply) => {
    const { player1Id, player2Id, precisionPlayer1, precisionPlayer2, scoreP1, scoreP2 } = request.body as {
      player1Id: number
      player2Id: number
      precisionPlayer1: number
      precisionPlayer2: number
      scoreP1: number
      scoreP2: number
    }

    if (
      !player1Id || !player2Id || precisionPlayer1 === undefined || precisionPlayer2 === undefined
      || scoreP1 === undefined || scoreP2 === undefined
    ) {
      return reply.status(400).send({ error: "Missing required fields" })
    }

    try {
      const match = createMatch(db, player1Id, player2Id, precisionPlayer1, precisionPlayer2, scoreP1, scoreP2)
      reply.send({ match })
    } catch (error) {
      console.error("Error creating match:", error)
      reply.status(500).send({ error: "Failed to create match" })
    }
  })

  // Récupérer l'historique des matchs d'un joueur
  fastify.get("/api/user/matches/player/:playerId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { playerId } = request.params as { playerId: string }
    const limit = parseInt((request.query as any).limit || "10")

    try {
      const matches = getPlayerMatchHistory(db, parseInt(playerId), limit)
      const mappedMatches = matches.map(mapMatchForFrontend)
      reply.send({ matches: mappedMatches })
    } catch (error) {
      console.error("Error fetching match history:", error)
      reply.status(500).send({ error: "Failed to fetch match history" })
    }
  })

  // Récupérer les statistiques d'un joueur
  fastify.get("/api/user/matches/player/:playerId/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const { playerId } = request.params as { playerId: string }

    try {
      const stats = getPlayerStats(db, parseInt(playerId))
      reply.send({ stats })
    } catch (error) {
      console.error("Error fetching player stats:", error)
      reply.status(500).send({ error: "Failed to fetch player stats" })
    }
  })

  // Récupérer un match par son ID
  fastify.get("/api/user/matches/:matchId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { matchId } = request.params as { matchId: string }

    try {
      const match = getMatchById(db, parseInt(matchId))
      if (!match)
        return reply.status(404).send({ error: "Match not found" })
      reply.send({ match })
    } catch (error) {
      console.error("Error fetching match:", error)
      reply.status(500).send({ error: "Failed to fetch match" })
    }
  })

  // Récupérer tous les matchs
  fastify.get("/api/user/matches", async (request: FastifyRequest, reply: FastifyReply) => {
    const limit = parseInt((request.query as any).limit || "50")

    try {
      const matches = getAllMatches(db, limit)
      const mappedMatches = matches.map(mapMatchForFrontend)
      reply.send({ matches: mappedMatches })
    } catch (error) {
      console.error("Error fetching matches:", error)
      reply.status(500).send({ error: "Failed to fetch matches" })
    }
  })

  // Route protégée : récupérer les matchs de l'utilisateur connecté
  fastify.get("/api/user/my-matches", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.authToken
    if (!token)
      return reply.status(401).send({ error: "Not authenticated" })

    try {
      const decoded = verifyToken(token)
      const limit = parseInt((request.query as any).limit || "10")
      const matches = getPlayerMatchHistory(db, decoded.userId, limit)
      const mappedMatches = matches.map(mapMatchForFrontend)
      reply.send({ matches: mappedMatches })
    } catch (error) {
      console.error("Error fetching user matches:", error)
      reply.status(500).send({ error: "Failed to fetch matches" })
    }
  })

  // Route protégée : récupérer les stats de l'utilisateur connecté
  fastify.get("/api/user/my-stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.authToken
    if (!token)
      return reply.status(401).send({ error: "Not authenticated" })

    try {
      const decoded = verifyToken(token)
      const stats = getPlayerStats(db, decoded.userId)
      reply.send({ stats })
    } catch (error) {
      console.error("Error fetching user stats:", error)
      reply.status(500).send({ error: "Failed to fetch stats" })
    }
  })
}
