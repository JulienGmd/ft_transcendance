// Add fake matches for testing purposes

import { MatchCreatePayload } from "@ft_transcendence/shared"
import { createUser } from "../auth/auth.service.js"
import { getDb } from "../db/db.js"
import { createMatch } from "./match.service.js"

const db = getDb()

const p1Id = 2 // Change this
const p2Id = p1Id + 1
const p3Id = p1Id + 2
const p4Id = p1Id + 3

function ensureOpponents() {
  const opponents = [
    { id: p2Id, username: "p2", email: "p1@example.com" },
    { id: p3Id, username: "p3", email: "p2@example.com" },
    { id: p4Id, username: "p4", email: "p3@example.com" },
  ]

  for (const opp of opponents) {
    const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(opp.id)
    if (!existing) {
      createUser(opp.username, opp.email, "password123")
      console.log(`Created opponent: ${opp.username}`)
    }
  }
}

function addMockMatches() {
  const matches: MatchCreatePayload[] = [
    // Wins
    { p1_id: p1Id, p2_id: p2Id, p1_score: 10, p2_score: 8, p1_precision: 85.5, p2_precision: 72.3 },
    { p1_id: p1Id, p2_id: p3Id, p1_score: 10, p2_score: 5, p1_precision: 92.1, p2_precision: 68.9 },

    { p1_id: p4Id, p2_id: p1Id, p1_score: 9, p2_score: 10, p1_precision: 81.2, p2_precision: 78.4 },

    // Loses
    { p1_id: p1Id, p2_id: p2Id, p1_score: 8, p2_score: 10, p1_precision: 88.0, p2_precision: 90.5 },
    { p1_id: p1Id, p2_id: p3Id, p1_score: 5, p2_score: 10, p1_precision: 91.3, p2_precision: 89.7 },

    { p1_id: p4Id, p2_id: p1Id, p1_score: 10, p2_score: 9, p1_precision: 85.0, p2_precision: 80.0 },
  ]

  for (const m of matches)
    createMatch(m)

  console.log(`Added ${matches.length} matches for users ids: ${p1Id}, ${p2Id}, ${p3Id}, ${p4Id}`)
}

ensureOpponents()
addMockMatches()
