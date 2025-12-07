import Database from "better-sqlite3"
import { getDb } from "../db/db.js"

// Script pour ajouter des données de match factices
const db = getDb()

// ID de l'utilisateur Coco
const cocoId = 2

// Créer quelques utilisateurs adversaires fictifs si nécessaire
function ensureOpponents() {
  const opponents = [
    { id: 3, username: "Player1", email: "player1@example.com" },
    { id: 4, username: "Player2", email: "player2@example.com" },
    { id: 5, username: "Player3", email: "player3@example.com" },
  ]

  for (const opp of opponents) {
    const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(opp.id)
    if (!existing) {
      db.prepare("INSERT INTO users (id, username, email) VALUES (?, ?, ?)").run(
        opp.id,
        opp.username,
        opp.email,
      )
      console.log(`Created opponent: ${opp.username}`)
    }
  }
}

// Ajouter des matchs factices
function addMockMatches() {
  const matches = [
    // Victoires de Coco
    { player1: cocoId, player2: 3, precision1: 85.5, precision2: 72.3, score1: 10, score2: 8 },
    { player1: cocoId, player2: 4, precision1: 92.1, precision2: 68.9, score1: 10, score2: 5 },
    { player1: cocoId, player2: 5, precision1: 78.4, precision2: 81.2, score1: 10, score2: 9 },

    // Défaites de Coco
    { player1: 3, player2: cocoId, precision1: 88.7, precision2: 75.3, score1: 10, score2: 7 },
    { player1: 4, player2: cocoId, precision1: 91.2, precision2: 79.8, score1: 10, score2: 6 },

    // Matches plus anciens
    { player1: cocoId, player2: 3, precision1: 82.3, precision2: 76.5, score1: 10, score2: 8 },
    { player1: 5, player2: cocoId, precision1: 86.4, precision2: 84.1, score1: 10, score2: 9 },
    { player1: cocoId, player2: 4, precision1: 89.6, precision2: 71.2, score1: 10, score2: 4 },
  ]

  const stmt = db.prepare(`
    INSERT INTO match_history (id_player1, id_player2, precision_player1, precision_player2, score_p1, score_p2, winner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  for (const match of matches) {
    const winnerId = match.score1 > match.score2 ? match.player1 : match.player2
    stmt.run(
      match.player1,
      match.player2,
      match.precision1,
      match.precision2,
      match.score1,
      match.score2,
      winnerId,
    )
  }

  console.log(`Added ${matches.length} mock matches for user Coco (ID: ${cocoId})`)
}

// Exécuter le script
try {
  ensureOpponents()
  addMockMatches()
  console.log("Mock data added successfully!")
} catch (error) {
  console.error("Error adding mock data:", error)
} finally {
}
