import Database from "better-sqlite3"
import { mkdirSync } from "fs"

// Singleton pattern
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db)
    throw new Error("Database not initialized. Call initDb() first.")
  return db
}

export function initDb(): Database.Database {
  if (db)
    throw new Error("Database already initialized.")

  mkdirSync("/app/data", { recursive: true })
  db = new Database("/app/data/auth.db")

  // users table
  db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
            avatar TEXT,
            twofa_secret TEXT,
            twofa_verify_time DATETIME,
            last_active_time DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `).run()

  db.prepare(`
        CREATE TABLE IF NOT EXISTS friendships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE (user_id, friend_id)
        )
    `).run()

  const columns = db.prepare(`PRAGMA table_info(friendships)`).all() as { name: string }[]
  if (!columns.some(col => col.name === "status")) {
    db.prepare(`ALTER TABLE friendships ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted'`).run()
    console.log("✅ Migration: added status column to friendships table")
  }

  // match_history table
  db.prepare(`
        CREATE TABLE IF NOT EXISTS match_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            p1_id INTEGER NOT NULL,
            p2_id INTEGER NOT NULL,
            p1_score INTEGER NOT NULL DEFAULT 0,
            p2_score INTEGER NOT NULL DEFAULT 0,
            p1_precision REAL NOT NULL DEFAULT 0,
            p2_precision REAL NOT NULL DEFAULT 0,
            winner_id INTEGER,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (p1_id) REFERENCES users (id),
            FOREIGN KEY (p2_id) REFERENCES users (id),
            FOREIGN KEY (winner_id) REFERENCES users (id)
        )
    `).run()

  console.log("✅ Database initialized")
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}

export type User = {
  id: number
  email: string
  password_hash: string | null
  google_id: string | null
  username: string
  avatar: string | null
  twofa_secret: string | null
  twofa_verify_time: string | null
  last_active_time: string | null
  created_at: string
}

export type Friendship = {
  id: number
  user_id: number
  friend_id: number
  status: "pending" | "accepted"
  created_at: string
}

export type Match = {
  id: number
  p1_id: number
  p2_id: number
  p1_score: number
  p2_score: number
  p1_precision: number
  p2_precision: number
  winner_id: number | null
  created_at: string
}
