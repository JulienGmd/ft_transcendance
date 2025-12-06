import "dotenv/config"
import cookie from "@fastify/cookie"
import Fastify from "fastify"
import { readFileSync } from "fs"
import { authRoutes } from "./auth/auth.routes"
import { initDb } from "./db/init"
import { matchRoutes } from "./match/match.routes"
import { closeNats, initNats, setupMatchSubscribers } from "./nats"

try {
  // Create HTTPS server (/certs mounted from ./certs in docker-compose.yml)
  const fastify = Fastify({
    https: {
      key: readFileSync("/certs/key.pem"),
      cert: readFileSync("/certs/cert.pem"),
    },
  })

  // Register cookie plugin
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET, // for signing cookies
    parseOptions: {},
  })

  const db = initDb()

  // Initialize NATS connection
  try {
    await initNats()
    // Setup NATS subscribers for match operations
    setupMatchSubscribers(db)
    console.log("✅ NATS initialized and subscribers set up")
  } catch (natsError) {
    console.error("⚠️  NATS initialization failed, continuing without NATS:", natsError)
    // Continue without NATS - the HTTP routes will still work
  }

  // Initialize and migrate database
  await authRoutes(fastify, db)
  await matchRoutes(fastify, db)

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`${signal} received, shutting down gracefully...`)
      await closeNats()
      await fastify.close()
      process.exit(0)
    })
  })

  // Start server
  await fastify.listen({ port: 3000, host: "0.0.0.0" })
  console.log("User Management service listening on https://0.0.0.0:3000")
} catch (err) {
  console.error("Error starting user management service:", err)
  process.exit(1)
}
