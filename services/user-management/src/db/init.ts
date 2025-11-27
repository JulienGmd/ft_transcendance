import Database from 'better-sqlite3';

export function initDb() {
    const db = new Database('auth.db');

    // Migration 1: Create users table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            avatar TEXT,
            google_id TEXT UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            twofa_secret TEXT,
            twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            twofa_method TEXT DEFAULT 'none',
            phone_number TEXT,
            sms_2fa_code TEXT,
            sms_2fa_expires_at INTEGER,
            email_2fa_code TEXT,
            email_2fa_expires_at INTEGER,
            created_at DATETIME NOT NULL DEFAULT CURRENT_timestamp,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Migration 2: Create tokens table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            refresh_token TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `).run();

    // Migration 3: Create match_history table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS match_history (
            match_id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_player1 INTEGER NOT NULL,
            id_player2 INTEGER NOT NULL,
            precision_player1 REAL NOT NULL DEFAULT 0,
            precision_player2 REAL NOT NULL DEFAULT 0,
            score_p1 INTEGER NOT NULL DEFAULT 0,
            score_p2 INTEGER NOT NULL DEFAULT 0,
            winner_id INTEGER,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_player1) REFERENCES users (id),
            FOREIGN KEY (id_player2) REFERENCES users (id),
            FOREIGN KEY (winner_id) REFERENCES users (id)
        )
    `).run();

    console.log('Database migrated successfully');
    return (db);
}
