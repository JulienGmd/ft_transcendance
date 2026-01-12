import { getDb, type User } from "../db.js"
import { PublicFriendship, PublicUser } from "./schemas.js"

export function getUser(email: string): User | null {
  const db = getDb()
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email)
  return user as User || null
}

export function getUserByUsername(username: string): User | null {
  const db = getDb()
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username)
  return user as User || null
}

export function createUser(email: string, passwordHash: string, username: string): User {
  const db = getDb()
  const stmt = db.prepare(`INSERT INTO users (email, password_hash, username, last_active_time) VALUES (?, ?, ?, ?)`)
  const currentTime = new Date().toISOString()
  const info = stmt.run(email, passwordHash, username, currentTime)
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as User
}

export function createGoogleUser(email: string, googleId: string): User {
  const db = getDb()
  // username is NOT NULL so we create a temporary one and update it right after
  const stmt = db.prepare(`INSERT INTO users (email, google_id, username, last_active_time) VALUES (?, ?, ?, ?)`)
  const currentTime = new Date().toISOString()
  const info = stmt.run(email, googleId, `temp_${googleId}`, currentTime)
  db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(`user${info.lastInsertRowid}`, info.lastInsertRowid)
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as User
}

export function updateUser(user: User): void {
  const db = getDb()
  const stmt = db.prepare(
    `UPDATE users SET username = ?, avatar = ?, twofa_secret = ?, twofa_verify_time = ?, last_active_time = ? WHERE email = ?`,
  )
  const currentTime = new Date().toISOString()
  stmt.run(user.username, user.avatar, user.twofa_secret, user.twofa_verify_time, currentTime, user.email)
}

export function userToPublicUser(user: User): PublicUser {
  return {
    email: user.email,
    username: user.username,
    avatar: user.avatar || null,
    twofa_enabled: !!user.twofa_secret,
  }
}

export function addFriend(userId: number, friendId: number): void {
  const db = getDb()
  const stmt = db.prepare(`INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)`)
  stmt.run(userId, friendId)
}

export function removeFriend(userId: number, friendId: number): void {
  const db = getDb()
  const stmt = db.prepare(`DELETE FROM friendships WHERE user_id = ? AND friend_id = ?`)
  stmt.run(userId, friendId)
}

export function getFriends(userId: number): PublicFriendship[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT users.username, users.last_active_time
    FROM friendships
    JOIN users ON friendships.friend_id = users.id
    WHERE friendships.user_id = ?
  `)
  return stmt.all(userId).map((row: any) => ({
    username: row.username,
    last_active_time: row.last_active_time,
  }))
}
