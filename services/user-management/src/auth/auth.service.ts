import { getDb, type User } from "../db"
import { PublicUser } from "./schemas"

export function getUser(email: string): User | null {
  const db = getDb()
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email)
  return user as User || null
}

export function createUser(email: string, passwordHash: string, username: string): User {
  const db = getDb()
  const stmt = db.prepare(`INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)`)
  const info = stmt.run(email, passwordHash, username)
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as User
}

export function createGoogleUser(email: string, googleId: string): User {
  const db = getDb()
  // username is NOT NULL so we create a temporary one and update it right after
  const stmt = db.prepare(`INSERT INTO users (email, google_id, username) VALUES (?, ?, ?)`)
  const info = stmt.run(email, googleId, `temp_${googleId}`)
  db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(`user${info.lastInsertRowid}`, info.lastInsertRowid)
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as User
}

export function updateUser(email: string, user: User): void {
  const db = getDb()
  const stmt = db.prepare(
    `UPDATE users SET username = ?, avatar = ?, twofa_secret = ?, twofa_verify_time = ? WHERE email = ?`,
  )
  stmt.run(user.username, user.avatar, user.twofa_secret, user.twofa_verify_time, email)
}

export function userToPublicUser(user: User): PublicUser {
  return {
    email: user.email,
    username: user.username,
    avatar: user.avatar || null,
    twofa_enabled: !!user.twofa_secret,
  }
}
