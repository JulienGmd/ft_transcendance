import { startServer, stopServer } from "./server.js"

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`${signal} received, shutting down gracefully...`)
    await stopServer()
    process.exit(0)
  })
})

await startServer()
