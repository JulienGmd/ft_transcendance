export function initDb() {
    const Database = require('better-sqlite3');
    const db = new Database('auth.db');

    // Migration 1: Create users table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            twofa_secret TEXT,
            twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            sms_2fa_code TEXT,
            sms_2fa_expires_at INTEGER,
            email_2fa_code TEXT,
            email_2fa_expires_at INTEGER,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

    console.log('Database migrated successfully');
    db.close();
}
