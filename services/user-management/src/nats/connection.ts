import { Codec, connect, type NatsConnection, StringCodec } from "nats"
import config from "../config.js"

// Singleton Pattern
let nc: NatsConnection | null = null

export function getNatsClient(): NatsConnection {
  if (!nc)
    throw new Error("NATS client not initialized. Call initNats() first.")
  return nc
}

export async function closeNatsClient(): Promise<void> {
  await nc?.drain()
  nc = null
}
// End Singleton Pattern

// Singleton Pattern
let codec: Codec<string> | null = null

export function getCodec() {
  if (!codec)
    codec = StringCodec()
  return codec
}
// End Singleton Pattern

export async function initNatsClient(): Promise<NatsConnection> {
  if (nc)
    throw new Error("NATS client already initialized.")

  try {
    nc = await connect({
      servers: config.NATS_URL,
      maxReconnectAttempts: -1, // Reconnect indefinitely
      reconnectTimeWait: 2000, // Wait 2s between reconnection attempts
    })
    console.log("✅ Connected to NATS") // Handle connection events
    logStatusChanges()
    return nc
  } catch (error) {
    console.error("❌ Can't connect to NATS:", error)
    throw error
  }
}

async function logStatusChanges() {
  if (!nc)
    return

  for await (const status of nc.status())
    console.log(`NATS status: ${status.type}`)
}
