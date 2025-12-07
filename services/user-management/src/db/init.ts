import Database from "better-sqlite3"

export function initDb() {
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
            twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
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
            p1_precision REAL NOT NULL DEFAULT 0,
            p2_precision REAL NOT NULL DEFAULT 0,
            p1_score INTEGER NOT NULL DEFAULT 0,
            p2_score INTEGER NOT NULL DEFAULT 0,
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
