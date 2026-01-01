// ============================================
// NATS CLIENT - Communication with user-management
// ============================================

import { type MatchCreatePayload, Topics } from "@ft_transcendence/shared"
import { connect, NatsConnection, StringCodec } from "nats"

let nc: NatsConnection | null = null
const codec = StringCodec()

// ============================================
// CONNECTION
// ============================================

export async function connectNats(): Promise<void> {
  try {
    const natsUrl = process.env.NATS_URL || "nats://nats:4222"
    nc = await connect({ servers: natsUrl })
    console.log(`📡 Connected to NATS at ${natsUrl}`)
  } catch (error) {
    console.error("❌ Failed to connect to NATS:", error)
    throw error
  }
}

export async function disconnectNats(): Promise<void> {
  if (nc) {
    await nc.drain()
    nc = null
    console.log("📡 Disconnected from NATS")
  }
}

// ============================================
// SEND MATCH RESULT
// ============================================

/**
 * Send match result to user-management via NATS
 */
export function sendMatchResult(payload: MatchCreatePayload): void {
  if (!nc) {
    console.error("❌ NATS not connected, cannot send match result")
    return
  }

  try {
    console.log(`📤 Sending match result via NATS :`, payload)
    nc.publish(Topics.MATCH.CREATE, codec.encode(JSON.stringify(payload)))
  } catch (err) {
    console.error("❌ Error sending match result:", err)
  }
}
