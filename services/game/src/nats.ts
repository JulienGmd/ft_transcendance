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
  } catch (err) {
    console.error("❌ Failed to connect to NATS:", err)
    throw err
  }
}

export async function disconnectNats(): Promise<void> {
  if (nc) {
    await nc.drain()
    nc = null
    console.log("📡 Disconnected from NATS")
  }
}

export function getNatsClient(): NatsConnection | null {
  return nc
}

// ============================================
// SEND MATCH RESULT
// ============================================

/**
 * Send match result to user-management via NATS
 */
export function sendMatchResult(
  player1Id: number,
  player2Id: number,
  scoreP1: number,
  scoreP2: number,
  precisionPlayer1: number = 0,
  precisionPlayer2: number = 0,
): void {
  if (!nc) {
    console.error("❌ NATS not connected, cannot send match result")
    return
  }

  const payload: MatchCreatePayload = {
    p1_id: player1Id,
    p2_id: player2Id,
    p1_precision: precisionPlayer1,
    p2_precision: precisionPlayer2,
    p1_score: scoreP1,
    p2_score: scoreP2,
  }

  try {
    console.log(`📤 Sending match result via NATS :`, payload)
    nc.publish(Topics.MATCH.CREATE, codec.encode(JSON.stringify(payload)))
  } catch (err) {
    console.error("❌ Error sending match result:", err)
  }
}
