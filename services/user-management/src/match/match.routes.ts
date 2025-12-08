import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { getJWT } from "../auth/jwt.js"
import { PUBLIC_MATCH_SCHEMA, PUBLIC_STATS_SCHEMA } from "../auth/schemas.js"
import { getPlayerMatches, getPlayerStats, matchToPublicMatch } from "./match.service.js"

export async function matchRoutes(fastify: FastifyInstance) {
  // TODO should not be a route but a nats event listener (sent from the game backend) because we can't trust the
  // client to report match results
  // fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/matches", {
  //   schema: {
  //     body: z.object({
  //       p1_id: z.number(),
  //       p2_id: z.number(),
  //       p1_precision: z.number(),
  //       p2_precision: z.number(),
  //       p1_score: z.number(),
  //       p2_score: z.number(),
  //     }),
  //     response: { 200: z.object({ match: PUBLIC_MATCH_SCHEMA }), 401: z.string() },
  //   },
  // }, async (req, res) => {
  //   const jwt = getJWT(req)
  //   if (!jwt)
  //     return res.status(401).send("Invalid token")

  //   const match = createMatch(
  //     req.body.p1_id,
  //     req.body.p2_id,
  //     req.body.p1_precision,
  //     req.body.p2_precision,
  //     req.body.p1_score,
  //     req.body.p2_score,
  //   )
  //   res.send({ match: matchToPublicMatch(match) })
  // })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/matches/me", {
    schema: {
      querystring: z.object({ limit: z.number().optional() }),
      response: { 200: z.object({ matches: z.array(PUBLIC_MATCH_SCHEMA) }), 401: z.string() },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send("Invalid token")

    const matches = getPlayerMatches(jwt.email, req.query.limit)
    res.send({ matches: matches.map(matchToPublicMatch) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/stats/me", {
    schema: {
      response: { 200: z.object({ stats: PUBLIC_STATS_SCHEMA }), 401: z.string() },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send("Invalid token")

    const stats = getPlayerStats(jwt.email)
    res.send({ stats })
  })
}
