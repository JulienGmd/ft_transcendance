import { closeDb, initDb } from "./db.js"
import { closeNatsClient, initNatsClient } from "./nats/connection.js"
import { setupSubscribers } from "./nats/subscriber.js"
import { startServer, stopServer } from "./server.js"

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

initDb()

await initNatsClient()
setupSubscribers()

await startServer()
