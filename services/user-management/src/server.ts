import fastifyCookie from "@fastify/cookie"
import rateLimit from "@fastify/rate-limit"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUI from "@fastify/swagger-ui"
import Fastify, { type FastifyInstance } from "fastify"
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import { readFileSync } from "fs"
import { authRoutes } from "./auth/auth.routes.js"
import { PublicValidationError } from "./auth/schemas.js"
import config from "./config.js"
import { matchRoutes } from "./match/match.routes.js"

// Singleton pattern
let fastify: FastifyInstance | null = null

export async function startServer(): Promise<void> {
  if (fastify)
    throw new Error("Server is already running")

  fastify = Fastify({
    https: {
      key: readFileSync("/secrets/certs/key.pem"),
      cert: readFileSync("/secrets/certs/cert.pem"),
    },
    bodyLimit: 5 * 1024 * 1024, // 5MB
  })
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Plugin to parse and set cookies
  await fastify.register(fastifyCookie)

  // Plugin to limit request rate
  await fastify.register(rateLimit, {
    max: 100, // Max 100 requests
    timeWindow: "5 minutes", // Per 5 minutes
  })

  // Plugin to generate OpenAPI documentation
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: "User Management Service API",
        description: "API documentation for the user-management service",
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
    if ((err as any).validation) {
      const validationErrors: PublicValidationError = (err as any).validation.map((e: any) => ({
        field: e.instancePath.substring(1),
        message: e.message,
      }))
      res.status(400).send({ message: "Request validation failed", details: validationErrors })
    } else {
      res.status(429).send({ message: "Too Many Requests" })
    }
  })

  // In development, log all requests
  fastify.addHook("onRequest", async (req, res) => {
    if (config.NODE_ENV !== "production" && req.url !== "/health")
      console.log(`${req.method} ${req.url}`)
  })

  fastify.get("/health", async () => ({ status: "ok" }))

  // Register routes
  await authRoutes(fastify)
  await matchRoutes(fastify)

  // Start the server
  await fastify.listen({ port: config.PORT, host: "0.0.0.0" })
  console.log(`✅ Starting server in ${config.NODE_ENV} mode`)
  console.log("🔍 Documentation: https://localhost:8080/api/user/docs")
}

export async function stopServer(): Promise<void> {
  await fastify?.close()
  fastify = null
}
