import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { getJWT } from "../auth/jwt.js"
import { PUBLIC_MATCH_SCHEMA, PUBLIC_STATS_SCHEMA, PUBLIC_VALIDATION_ERROR_SCHEMA } from "../auth/schemas.js"
import { getPlayerMatches, getPlayerStats, matchToPublicMatch } from "./match.service.js"

export async function matchRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/matches", {
    schema: {
      querystring: z.object({ username: z.string(), limit: z.string().optional() }),
      response: {
        200: z.object({ matches: z.array(PUBLIC_MATCH_SCHEMA) }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    if (!req.query.username)
      return res.status(400).send({ message: "Username is required", details: [] })

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10
    const matches = getPlayerMatches(req.query.username, limit)
    res.send({ matches: matches.map(matchToPublicMatch) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/stats", {
    schema: {
      querystring: z.object({ username: z.string() }),
      response: {
        200: z.object({ stats: PUBLIC_STATS_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    if (!req.query.username)
      return res.status(400).send({ message: "Username is required", details: [] })

    const stats = getPlayerStats(req.query.username)
    res.send({ stats })
  })
}
