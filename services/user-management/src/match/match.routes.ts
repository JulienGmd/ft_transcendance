import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { getJWT } from "../auth/jwt.js"
import { PUBLIC_MATCH_SCHEMA, PUBLIC_STATS_SCHEMA } from "../auth/schemas.js"
import { getPlayerMatches, getPlayerStats, matchToPublicMatch } from "./match.service.js"

export async function matchRoutes(fastify: FastifyInstance) {
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
