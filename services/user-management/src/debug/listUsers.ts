// To execute:
// docker exec -it fr-transcendence-1 /bin/sh
// cd services/user-management
// npx tsx src/debug/listUsers.ts

import { initDb } from "../db"

const db = initDb()

const users = db.prepare("SELECT id, email, username FROM users").all()
console.log("Users in database:")
console.table(users)
