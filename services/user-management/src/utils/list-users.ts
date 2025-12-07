import { initDb } from "../db/db.js"

const db = initDb()

const users = db.prepare("SELECT id, username, email FROM users").all()
console.log("Users in database:")
console.table(users)
