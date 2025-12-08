import fastifyCookie from "@fastify/cookie"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUI from "@fastify/swagger-ui"
import Fastify, { type FastifyInstance } from "fastify"
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import { readFileSync } from "fs"
import { authRoutes } from "./auth/auth.routes"
import config from "./config"
import { matchRoutes } from "./match/match.routes"

let fastify: FastifyInstance | null = null

export async function startServer(): Promise<void> {
  fastify = Fastify({
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
    if ((err as any).validation)
      res.status(400).send((err as any).toString())
    else {
      console.log("Error not handled:", err)
      res.status(500).send({ error: "Internal Server Error" })
    }
  })

  // In development, log all requests
  fastify.addHook("onRequest", async (req, rep) => {
    if (config.NODE_ENV === "production")
      return

    console.log(`${req.method} ${req.url}`)
  })

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
}
