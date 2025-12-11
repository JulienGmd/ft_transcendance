// To execute:
// docker exec -it fr-transcendence-1 /bin/sh
// cd services/user-management
// npx tsx src/debug/createMatches.ts

import { MatchCreatePayload } from "@ft_transcendence/shared"
import { createUser } from "../auth/auth.service"
import { initDb, Match, User } from "../db"
import { createMatch } from "../match/match.service"

const db = initDb()

const userId = 1 // First registered user

const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User
console.log("User:")
console.table([{ id: user.id, username: user.username }])

const opponents = [
  { id: -1, username: "p2", email: "p1@example.com" },
  { id: -1, username: "p3", email: "p2@example.com" },
  { id: -1, username: "p4", email: "p3@example.com" },
]

function createOpponents() {
  const users: User[] = []
  for (const opp of opponents) {
    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(opp.username) as User
    if (!user)
      user = createUser(opp.email, "verysecurepassword", opp.username)
    opp.id = user.id
    users.push(user)
  }
  console.log("Opponents:")
  console.table(users.map((u) => ({ id: u.id, username: u.username })))
}

function createMatches() {
  const matchPayloads: MatchCreatePayload[] = [
    // Wins
    { p1_id: userId, p2_id: opponents[0].id, p1_score: 10, p2_score: 8, p1_precision: 85.5, p2_precision: 72.3 },
    { p1_id: userId, p2_id: opponents[1].id, p1_score: 10, p2_score: 5, p1_precision: 92.1, p2_precision: 68.9 },

    { p1_id: opponents[2].id, p2_id: userId, p1_score: 9, p2_score: 10, p1_precision: 81.2, p2_precision: 78.4 },

    // Loses
    { p1_id: userId, p2_id: opponents[0].id, p1_score: 8, p2_score: 10, p1_precision: 88.0, p2_precision: 90.5 },
    { p1_id: userId, p2_id: opponents[1].id, p1_score: 5, p2_score: 10, p1_precision: 91.3, p2_precision: 89.7 },

    { p1_id: opponents[2].id, p2_id: userId, p1_score: 10, p2_score: 9, p1_precision: 85.0, p2_precision: 80.0 },
  ]

  const matches: Match[] = []
  for (const m of matchPayloads) {
    const match = createMatch(m)
    matches.push(match)
  }
  console.log("Created Matches:")
  console.table(matches)
}

createOpponents()
createMatches()
