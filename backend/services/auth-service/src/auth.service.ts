import Database from 'better-sqlite3';

export interface User {
  id: number;
  google_id: string;
  email: string;
  password_hash: string | null;
  twofa_secret?: string | null;
  twofa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function findOrCreateGoogleUser(profile: { id: string; email: string; }): User {
  const db = new Database('auth.db');
  let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id) as User;
  if (!user) {
    // Check if a classic account exists with the same email
    let classicUser = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email) as User;
    if (classicUser && !classicUser.google_id) {
      // Merge: set google_id on the classic account
      db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.id, classicUser.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(classicUser.id) as User;
    } else {
      // No user exists, create new Google user
      const stmt = db.prepare(`INSERT INTO users (google_id, email, password_hash, twofa_enabled) VALUES (?, ?, NULL, FALSE)`);
      const info = stmt.run(profile.id, profile.email);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
    }
  }
  db.close();
  return user as User;
}

export function findOrCreateClassicUser(email: string, passwordHash: string): User {
  const db = new Database('auth.db');
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User;
  if (!user) {
    // No user exists, create new classic user
    const stmt = db.prepare(`INSERT INTO users (google_id, email, password_hash, twofa_enabled) VALUES (NULL, ?, ?, FALSE)`);
    const info = stmt.run(email, passwordHash);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as User;
  } else {
    // User exists: check if it's a Google-only account (no password)
    if (!user.password_hash && user.google_id) {
      // Merge: set password_hash, keep google_id
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      user.password_hash = passwordHash;
    }
  }
  db.close();
  return user as User;
}
