import { MatchCreatePayload } from "@ft_transcendence/shared"
import { PublicMatch, PublicStats } from "../auth/schemas.js"
import { getDb, Match, User } from "../db.js"

export function createMatch(matchPayload: MatchCreatePayload): Match {
  const db = getDb()

  const { p1_id, p2_id, p1_score, p2_score, p1_precision, p2_precision } = matchPayload

  const winnerId = p1_score > p2_score ? p1_id : p2_score > p1_score ? p2_id : null
  const stmt = db.prepare(`
    INSERT INTO match_history (p1_id, p2_id, p1_score, p2_score, p1_precision, p2_precision, winner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const info = stmt.run(p1_id, p2_id, p1_score, p2_score, p1_precision, p2_precision, winnerId)

  return db.prepare("SELECT * FROM match_history WHERE id = ?").get(info.lastInsertRowid) as Match
}

export function getPlayerMatches(username: string, limit: number = 10): Match[] {
  const db = getDb()

  limit = Math.floor(Math.max(1, Math.min(limit, 100)))

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User
  if (!user)
    return []

  const stmt = db.prepare(`
    SELECT * FROM match_history WHERE p1_id = ? OR p2_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `)
  return stmt.all(user.id, user.id, limit) as Match[]
}

export function getPlayerStats(username: string): PublicStats {
  const db = getDb()

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User
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

  const p1 = db.prepare("SELECT * FROM users WHERE id = ?").get(match.p1_id) as User | undefined
  const p2 = db.prepare("SELECT * FROM users WHERE id = ?").get(match.p2_id) as User | undefined
  const winner_username = match.winner_id === p1?.id ? p1?.username : match.winner_id === p2?.id ? p2?.username : null

  return {
    p1_username: p1?.username || "Anonymous",
    p2_username: p2?.username || "Unknown",
    p1_score: match.p1_score,
    p2_score: match.p2_score,
    p1_precision: match.p1_precision,
    p2_precision: match.p2_precision,
    winner_username,
    created_at: match.created_at,
  }
}
