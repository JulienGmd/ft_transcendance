// Libs:
// - fastify-type-provider-zod to define routes with Zod schemas
// - @fastify/swagger and @fastify/swagger-ui to generate and serve OpenAPI documentation

import "dotenv/config"
import fastifyCookie from "@fastify/cookie"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUI from "@fastify/swagger-ui"
import Fastify from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import { readFileSync } from "fs"
import { authRoutes } from "./auth/auth.routes.js"
import config from "./config.js"
import { initDb } from "./db/init.js"
import { matchRoutes } from "./match/match.routes.js"
import { closeNats, initNats, setupMatchSubscribers } from "./nats/index.js"

const fastify = Fastify({
  https: {
    key: readFileSync("/certs/key.pem"),
    cert: readFileSync("/certs/cert.pem"),
  },
})
fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Plugin to parse and set cookies
await fastify.register(fastifyCookie, { secret: config.JWT_SECRET })

// Plugin to generate OpenAPI documentation
await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "SampleApi",
      description: "Sample backend service",
      version: "1.0.0",
    },
    servers: [],
  },
  transform: jsonSchemaTransform,
  // To ignore routes in the documentation:
  // transform: createJsonSchemaTransform({ skipList: ['/documentation/static/*'] })
})

// Plugin to serve OpenAPI documentation (/api/user/docs, /api/user/docs/json, /api/user/docs/yaml)
await fastify.register(fastifySwaggerUI, {
  routePrefix: "/api/user/docs",
})

// Generic error handler (when a route throws an error)
fastify.setErrorHandler((err, req, res) => {
  res.status(500).type("application/json").send({ error: "Internal Server Error" })
})

// In development, log all requests
fastify.addHook("onRequest", async (req, rep) => {
  if (config.NODE_ENV === "production")
    return

  console.log(`${req.method} ${req.url}`)
})

const db = initDb()

await authRoutes(fastify.withTypeProvider<ZodTypeProvider>(), db)
await matchRoutes(fastify.withTypeProvider<ZodTypeProvider>(), db)

// Initialize NATS connection
try {
  await initNats()
  // Setup NATS subscribers for match operations
  setupMatchSubscribers(db)
  console.log("✅ NATS initialized and subscribers set up")
} catch (natsError) {
  console.error("⚠️  NATS initialization failed, continuing without NATS:", natsError)
  // Continue without NATS - the HTTP routes will still work
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`${signal} received, shutting down gracefully...`)
    await closeNats()
    await fastify.close()
    process.exit(0)
  })
})

// Start server
// Use host 0.0.0.0 so it can be accessible from outside the docker container
await fastify.listen({ port: config.PORT, host: "0.0.0.0" })
console.log(`✅ Starting server in ${config.NODE_ENV} mode`)
