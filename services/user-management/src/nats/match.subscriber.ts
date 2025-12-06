import type Database from "better-sqlite3"
import { createMatch } from "../match/match.service"
import { getCodec, getNatsClient } from "./connection"
import { Topics } from "./topics"

interface MatchCreatePayload {
  player1Id: number
  player2Id: number
  precisionPlayer1: number
  precisionPlayer2: number
  scoreP1: number
  scoreP2: number
}

interface MatchHistoryRequest {
  playerId: number
  limit?: number
}

interface MatchStatsRequest {
  playerId: number
}

export function setupMatchSubscribers(db: Database.Database): void {
  const nc = getNatsClient()
  const codec = getCodec()

  console.log("🎮 Setting up NATS match subscribers...")

  // Subscriber pour créer un match
  ;(async () => {
    const sub = nc.subscribe(Topics.MATCH.CREATE)
    console.log(`📡 Listening on ${Topics.MATCH.CREATE}`)

    for await (const msg of sub) {
      try {
        const payload: MatchCreatePayload = JSON.parse(codec.decode(msg.data))
        console.log(`📥 Received match create request:`, payload)

        // Valider les données
        if (
          !payload.player1Id || !payload.player2Id
          || payload.scoreP1 === undefined || payload.scoreP2 === undefined
          || payload.precisionPlayer1 === undefined || payload.precisionPlayer2 === undefined
        ) {
          const errorResponse = {
            success: false,
            error: "Missing required fields",
          }
          msg.respond(codec.encode(JSON.stringify(errorResponse)))
          continue
        }

        // Créer le match dans la base de données
        const match = createMatch(
          db,
          payload.player1Id,
          payload.player2Id,
          payload.precisionPlayer1,
          payload.precisionPlayer2,
          payload.scoreP1,
          payload.scoreP2,
        )

        // Répondre avec succès
        const response = {
          success: true,
          match: {
            id: match.match_id,
            player1_id: match.id_player1,
            player2_id: match.id_player2,
            player1_score: match.score_p1,
            player2_score: match.score_p2,
            winner_id: match.winner_id,
            created_at: match.created_at,
          },
        }
        msg.respond(codec.encode(JSON.stringify(response)))

        // Publier un événement "match created" pour notifier d'autres services
        nc.publish(Topics.MATCH.CREATED, codec.encode(JSON.stringify(response.match)))
        console.log(`✅ Match created: ${match.match_id}`)
      } catch (error) {
        console.error("Error creating match:", error)
        const errorResponse = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        msg.respond(codec.encode(JSON.stringify(errorResponse)))
      }
    }
  })()

  console.log("✅ Match subscribers initialized")
}
