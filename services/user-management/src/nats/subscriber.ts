import type { MatchCreatePayload } from "@ft_transcendence/shared"
import { Topics } from "@ft_transcendence/shared"
import type { Codec, NatsConnection } from "nats"
import { createMatch } from "../match/match.service"
import { getCodec, getNatsClient } from "./connection"

export function setupSubscribers(): void {
  const nc = getNatsClient()
  const codec = getCodec()
  listenMatchCreate(nc, codec)
}

async function listenMatchCreate(nc: NatsConnection, codec: Codec<string>): Promise<void> {
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
