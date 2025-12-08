import { PublicMatch, PublicStats } from "../auth/schemas.js"
import { getDb, Match, User } from "../db/db.js"

export function createMatch(
  p1_id: number,
  p2_id: number,
  p1_precision: number,
  p2_precision: number,
  p1_score: number,
  p2_score: number,
): Match {
  const db = getDb()

  const winnerId = p1_score > p2_score ? p1_id : p2_score > p1_score ? p2_id : null
  const stmt = db.prepare(`
    INSERT INTO match_history (p1_id, p2_id, p1_precision, p2_precision, p1_score, p2_score, winner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(p1_id, p2_id, p1_precision, p2_precision, p1_score, p2_score, winnerId)

  return db.prepare("SELECT * FROM match_history WHERE id = ?").get(info.lastInsertRowid) as Match
}

export function getPlayerMatches(email: string, limit: number = 10): Match[] {
  const db = getDb()

  limit = Math.floor(Math.max(1, Math.min(limit, 100)))

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User
  if (!user)
    return []

  const stmt = db.prepare(`
    SELECT * FROM match_history WHERE p1_id = ? OR p2_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `)
  return stmt.all(user.id, user.id, limit) as Match[]
}

export function getPlayerStats(email: string): PublicStats {
  const db = getDb()

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User
  if (!user)
    return { numMatches: 0, numWins: 0, precision: 0 }

  const numMatchesStmt = db.prepare(`SELECT COUNT(*) as count FROM match_history WHERE p1_id = ? OR p2_id = ?`)
  const numMatches = (numMatchesStmt.get(user.id, user.id) as { count: number }).count as number

  const numWinsStmt = db.prepare(`SELECT COUNT(*) as count FROM match_history WHERE winner_id = ?`)
  const numWins = (numWinsStmt.get(user.id) as { count: number }).count as number

  const precisionStmt = db.prepare(`
    SELECT AVG(
      CASE
        WHEN p1_id = ? THEN p1_precision
        WHEN p2_id = ? THEN p2_precision
        ELSE 0
      END
    ) as avg_precision
    FROM match_history
    WHERE p1_id = ? OR p2_id = ?
  `)
  const precisionRow = precisionStmt.get(user.id, user.id, user.id, user.id) as { avg_precision: number | null }
  const precision = precisionRow.avg_precision || 0

  return { numMatches, numWins, precision }
}

export function matchToPublicMatch(match: Match): PublicMatch {
  const db = getDb()

  const p1 = db.prepare("SELECT username FROM users WHERE id = ?").get(match.p1_id) as { username: string } | undefined
  const p2 = db.prepare("SELECT username FROM users WHERE id = ?").get(match.p2_id) as { username: string } | undefined

  return {
    p1_id: match.p1_id,
    p2_id: match.p2_id,
    p1_precision: match.p1_precision,
    p2_precision: match.p2_precision,
    p1_score: match.p1_score,
    p2_score: match.p2_score,
    winner_id: match.winner_id,
    p1_username: p1?.username || "Unknown",
    p2_username: p2?.username || "Unknown",
    created_at: match.created_at,
  }
}
