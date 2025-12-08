import { MatchCreatePayload } from "../../../../shared/natsPayloads.js"
import { Topics } from "../../../../shared/natsTopics.js"
import { closeNatsClient, getCodec, getNatsClient, initNatsClient } from "./connection.js"

async function testMatchCreate() {
  await initNatsClient()
  const nc = getNatsClient()
  const codec = getCodec()

  const matchPayload: MatchCreatePayload = {
    p1_id: 1,
    p2_id: 2,
    p1_score: 15,
    p2_score: 10,
    p1_precision: 85.5,
    p2_precision: 78.3,
  }

  console.log(`\n📤 Sending ${Topics.MATCH.CREATE} request with data:`, matchPayload)
  nc.publish(Topics.MATCH.CREATE, codec.encode(JSON.stringify(matchPayload)))

  await closeNatsClient()
}

testMatchCreate()
