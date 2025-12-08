import "dotenv/config"
import { closeDb, initDb } from "./db/db"
import { closeNatsClient, initNatsClient } from "./nats/connection"
import { setupSubscribers } from "./nats/subscriber"
import { startServer, stopServer } from "./server"

async function main(): Promise<void> {
  initDb()

  await initNatsClient()
  setupSubscribers()

  await startServer()

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`${signal} received, shutting down gracefully...`)
      await stopServer()
      await closeNatsClient()
      closeDb()
      process.exit(0)
    })
  })
}

main()
