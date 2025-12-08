import Database from "better-sqlite3"

// Singleton pattern
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db)
    throw new Error("Database not initialized. Call initDb() first.")
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}
// End Singleton pattern

export function initDb(): Database.Database {
  const db = new Database("auth.db")

  // users table
  db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
            username TEXT UNIQUE,
            avatar TEXT,
            twofa_secret TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `).run()

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

export type User = {
  id: number
  email: string
  password_hash: string | null
  google_id: string | null
  username: string | null
  avatar: string | null
  twofa_secret: string | null
  created_at: string
  updated_at: string
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
