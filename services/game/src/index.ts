// ============================================
// GAME SERVICE - Main Entry Point
// Backend only, no static files
// ============================================

import Fastify from "fastify"
import { readFileSync } from "fs"
import { connectNats } from "./nats.js"

// ============================================
// INITIALIZE
// ============================================

// Connect to NATS for communication with user-management
try {
  await connectNats()
} catch (err) {
  console.warn("⚠️ NATS connection failed, match results won't be recorded:", err)
}

// ============================================
// CREATE SERVER
// ============================================

const fastify = Fastify({
  https: {
    key: readFileSync("/certs/key.pem"),
    cert: readFileSync("/certs/cert.pem"),
  },
})

// ============================================
// HEALTH CHECK
// ============================================

fastify.get("/health", async () => {
  return {
    status: "ok",
  }
})

// ============================================
// START SERVER
// ============================================

try {
  await fastify.listen({ port: 3000, host: "0.0.0.0" })
  console.log("🎮 Game service listening on https://0.0.0.0:3000")
} catch (err) {
  console.error("Error starting game service:", err)
  process.exit(1)
}
