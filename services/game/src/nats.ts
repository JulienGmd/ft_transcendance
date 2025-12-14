// ============================================
// NATS CLIENT - Communication with user-management
// ============================================

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
// TOPICS
// ============================================

export const Topics = {
  AUTH: {
    TOKEN_VERIFY: "auth.token.verify",
  },
  MATCH: {
    CREATE: "match.create",
    CREATED: "match.created",
  },
}

// ============================================
// AUTH TYPES
// ============================================

export interface TokenVerifyRequest {
  token: string
}

export interface TokenVerifyResponse {
  valid: boolean
  userId?: number
  email?: string
  error?: string
}

// ============================================
// VERIFY TOKEN
// ============================================

/**
 * Verify a JWT token via NATS and get the user ID
 * Returns the user ID if valid, null otherwise
 */
export async function verifyToken(token: string): Promise<number | null> {
  if (!nc) {
    console.error("❌ NATS not connected, cannot verify token")
    return null
  }

  const payload: TokenVerifyRequest = { token }

  try {
    const response = await nc.request(
      Topics.AUTH.TOKEN_VERIFY,
      codec.encode(JSON.stringify(payload)),
      { timeout: 5000 },
    )

    const result: TokenVerifyResponse = JSON.parse(codec.decode(response.data))

    if (result.valid && result.userId) {
      return result.userId
    } else {
      console.warn(`⚠️ Token verification failed: ${result.error}`)
      return null
    }
  } catch (err) {
    console.error("❌ Error verifying token:", err)
    return null
  }
}

// ============================================
// MATCH PAYLOAD TYPES
// ============================================

export interface MatchCreatePayload {
  player1Id: number
  player2Id: number
  precisionPlayer1: number
  precisionPlayer2: number
  scoreP1: number
  scoreP2: number
}

export interface MatchCreateResponse {
  success: boolean
  match?: {
    id: number
    player1_id: number
    player2_id: number
    player1_score: number
    player2_score: number
    winner_id: number
    created_at: string
  }
  error?: string
}

// ============================================
// SEND MATCH RESULT
// ============================================

/**
 * Send match result to user-management via NATS
 * Uses request/response pattern for confirmation
 */
export async function sendMatchResult(
  player1Id: number,
  player2Id: number,
  scoreP1: number,
  scoreP2: number,
  precisionPlayer1: number = 0,
  precisionPlayer2: number = 0,
): Promise<MatchCreateResponse> {
  if (!nc) {
    console.error("❌ NATS not connected, cannot send match result")
    return { success: false, error: "NATS not connected" }
  }

  const payload: MatchCreatePayload = {
    player1Id,
    player2Id,
    precisionPlayer1,
    precisionPlayer2,
    scoreP1,
    scoreP2,
  }

  try {
    console.log(`📤 Sending match result via NATS:`, payload)

    // Request/response with 5 second timeout
    const response = await nc.request(
      Topics.MATCH.CREATE,
      codec.encode(JSON.stringify(payload)),
      { timeout: 5000 },
    )

    const result: MatchCreateResponse = JSON.parse(codec.decode(response.data))

    if (result.success) {
      console.log(`✅ Match recorded: ${result.match?.id}`)
    } else {
      console.error(`❌ Failed to record match: ${result.error}`)
    }

    return result
  } catch (err) {
    console.error("❌ Error sending match result:", err)
    return { success: false, error: String(err) }
  }
}
