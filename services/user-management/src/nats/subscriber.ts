import type { MatchCreatePayload } from "@ft_transcendence/shared"
import { Topics } from "@ft_transcendence/shared"
import jwt from "jsonwebtoken"
import type { Codec, NatsConnection } from "nats"
import config from "../config"
import { getDb, User } from "../db"
import { createMatch } from "../match/match.service"
import { getCodec, getNatsClient } from "./connection"

export function setupSubscribers(): void {
  const nc = getNatsClient()
  const codec = getCodec()
  messagesLoop(nc, codec)
  setupTokenVerifySubscriber(nc, codec)
}

// ============================================
// TOKEN VERIFY SUBSCRIBER (request/reply)
// ============================================

interface TokenVerifyRequest {
  token: string
}

interface TokenVerifyResponse {
  valid: boolean
  userId?: number
  username?: string
  error?: string
}

function setupTokenVerifySubscriber(nc: NatsConnection, codec: Codec<string>): void {
  const sub = nc.subscribe(Topics.AUTH.TOKEN_VERIFY)
  console.log(`📡 Listening on ${Topics.AUTH.TOKEN_VERIFY}`)
  ;(async () => {
    for await (const msg of sub) {
      try {
        const request: TokenVerifyRequest = JSON.parse(codec.decode(msg.data))
        const response = verifyTokenAndGetUser(request.token)
        msg.respond(codec.encode(JSON.stringify(response)))
      } catch (err) {
        const errorResponse: TokenVerifyResponse = { valid: false, error: "Invalid request" }
        msg.respond(codec.encode(JSON.stringify(errorResponse)))
      }
    }
  })()
}

function verifyTokenAndGetUser(token: string): TokenVerifyResponse {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { email: string }
    const db = getDb()
    const user = db.prepare("SELECT id, username FROM users WHERE email = ?").get(decoded.email) as User | undefined

    if (!user)
      return { valid: false, error: "User not found" }

    return { valid: true, userId: user.id, username: user.username || undefined }
  } catch (err) {
    return { valid: false, error: "Invalid token" }
  }
}

async function messagesLoop(nc: NatsConnection, codec: Codec<string>): Promise<void> {
  const sub = nc.subscribe(Topics.MATCH.CREATE)
  console.log(`📡 Listening on ${Topics.MATCH.CREATE}`)

  for await (const msg of sub) {
    console.log(`📥 Received message: ${msg.subject}`)

    const payload: MatchCreatePayload = JSON.parse(codec.decode(msg.data))
    if (!isValidMatchCreatePayload(payload)) {
      console.warn(`⚠️ Received invalid payload: ${msg.subject}`)
      continue
    }

    createMatch(payload)
  }
}

function isValidMatchCreatePayload(payload: unknown): payload is MatchCreatePayload {
  if (typeof payload !== "object" || payload === null)
    return false

  const p = payload as MatchCreatePayload
  return typeof p.p1_id === "number"
    && typeof p.p2_id === "number"
    && typeof p.p1_score === "number"
    && typeof p.p2_score === "number"
    && typeof p.p1_precision === "number"
    && typeof p.p2_precision === "number"
}
