import Database from "better-sqlite3"

export interface Match {
  match_id: number
  id_player1: number
  id_player2: number
  precision_player1: number
  precision_player2: number
  score_p1: number
  score_p2: number
  winner_id: number | null
  created_at: string
}

export interface MatchWithUsernames extends Match {
  player1_username: string | null
  player2_username: string | null
}

export interface PlayerStats {
  totalMatches: number
  totalWins: number
  globalPrecision: number
}

// Créer un nouveau match
export function createMatch(
  db: Database.Database,
  player1Id: number,
  player2Id: number,
  precisionPlayer1: number,
  precisionPlayer2: number,
  scoreP1: number,
  scoreP2: number,
): Match {
  // Déterminer le gagnant
  const winnerId = scoreP1 > scoreP2 ? player1Id : scoreP2 > scoreP1 ? player2Id : null

  const stmt = db.prepare(`
    INSERT INTO match_history (id_player1, id_player2, precision_player1, precision_player2, score_p1, score_p2, winner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(player1Id, player2Id, precisionPlayer1, precisionPlayer2, scoreP1, scoreP2, winnerId)

  // Récupérer le match créé
  const match = db.prepare("SELECT * FROM match_history WHERE match_id = ?").get(result.lastInsertRowid) as Match
  return match
}

// Récupérer l'historique des matchs d'un joueur
export function getPlayerMatchHistory(
  db: Database.Database,
  playerId: number,
  limit: number = 10,
): MatchWithUsernames[] {
  const stmt = db.prepare(`
    SELECT
      mh.*,
      u1.username as player1_username,
      u2.username as player2_username
    FROM match_history mh
    LEFT JOIN users u1 ON mh.id_player1 = u1.id
    LEFT JOIN users u2 ON mh.id_player2 = u2.id
    WHERE mh.id_player1 = ? OR mh.id_player2 = ?
    ORDER BY mh.created_at DESC
    LIMIT ?
  `)

  return stmt.all(playerId, playerId, limit) as MatchWithUsernames[]
}

// Récupérer les statistiques d'un joueur
export function getPlayerStats(db: Database.Database, playerId: number): PlayerStats {
  // Total de matchs
  const totalMatchesStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM match_history
    WHERE id_player1 = ? OR id_player2 = ?
  `)
  const totalMatchesResult = totalMatchesStmt.get(playerId, playerId) as { count: number }
  const totalMatches = totalMatchesResult.count

  // Total de victoires
  const totalWinsStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM match_history
    WHERE winner_id = ?
  `)
  const totalWinsResult = totalWinsStmt.get(playerId) as { count: number }
  const totalWins = totalWinsResult.count

  // Précision globale
  const precisionStmt = db.prepare(`
    SELECT
      AVG(CASE
        WHEN id_player1 = ? THEN precision_player1
        WHEN id_player2 = ? THEN precision_player2
      END) as avg_precision
    FROM match_history
    WHERE id_player1 = ? OR id_player2 = ?
  `)
  const precisionResult = precisionStmt.get(playerId, playerId, playerId, playerId) as { avg_precision: number | null }
  const globalPrecision = precisionResult.avg_precision || 0

  return {
    totalMatches,
    totalWins,
    globalPrecision: Number(globalPrecision.toFixed(2)),
  }
}

// Récupérer un match par son ID
export function getMatchById(db: Database.Database, matchId: number): MatchWithUsernames | null {
  const stmt = db.prepare(`
    SELECT
      mh.*,
      u1.username as player1_username,
      u2.username as player2_username
    FROM match_history mh
    LEFT JOIN users u1 ON mh.id_player1 = u1.id
    LEFT JOIN users u2 ON mh.id_player2 = u2.id
    WHERE mh.match_id = ?
  `)

  return stmt.get(matchId) as MatchWithUsernames | null
}

// Récupérer tous les matchs (pour le leaderboard, etc.)
export function getAllMatches(db: Database.Database, limit: number = 50): MatchWithUsernames[] {
  const stmt = db.prepare(`
    SELECT
      mh.*,
      u1.username as player1_username,
      u2.username as player2_username
    FROM match_history mh
    LEFT JOIN users u1 ON mh.id_player1 = u1.id
    LEFT JOIN users u2 ON mh.id_player2 = u2.id
    ORDER BY mh.created_at DESC
    LIMIT ?
  `)

  return stmt.all(limit) as MatchWithUsernames[]
}
