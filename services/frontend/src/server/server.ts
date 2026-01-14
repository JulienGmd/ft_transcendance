import Fastify, { type FastifyInstance } from "fastify"
import { existsSync, readFileSync } from "fs"
import config from "./config.js"
import { enableLiveReload } from "./liveReload.js"
import { getMimeType } from "./utils.js"

const DIST_PUBLIC_DIR = config.ROOT_DIR + "/dist/public"
const PUBLIC_DIR = config.ROOT_DIR + "/public"

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
  })

  // Generic error handler (when a route throws an error)
  fastify.setErrorHandler((err, req, res) => {
    res.status(400).send({ error: "Bad input" })
  })

  // In development, log all requests
  fastify.addHook("onRequest", async (req, res) => {
    if (config.NODE_ENV !== "production" && req.url !== "/health" && req.url !== "/dev/file-timestamps")
      console.log(`${req.method} ${req.url}`)
  })

  fastify.get("/health", async () => ({ status: "ok" }))

  // By default, all routes serve _index.html
  fastify.get("/*", async (req, res) => {
    let content = readFileSync(`${PUBLIC_DIR}/_index.html`, "utf-8")

    // Inject live reload and error handler scripts in development
    if (config.NODE_ENV !== "production") {
      content = content.replace(
        "</head>",
        '<script defer type="module" src="/public/persistent/liveReload.js"></script><script defer type="module" src="/public/persistent/errorHandler.js"></script></head>',
      )
    }

    // Cache request in production
    if (config.NODE_ENV === "production")
      res.header("cache-control", "max-age=31536000")

    res.type("text/html").send(content)
  })

  // Serve files from /public or /dist/public
  fastify.get<{ Params: { "*": string } }>("/public/*", async (req, res) => {
    const filePath = req.params["*"] || ""

    try {
      let content = ""
      if (existsSync(`${DIST_PUBLIC_DIR}/${filePath}`))
        content = readFileSync(`${DIST_PUBLIC_DIR}/${filePath}`, "utf-8")
      else
        content = readFileSync(`${PUBLIC_DIR}/${filePath}`, "utf-8")

      // Cache request in production
      if (config.NODE_ENV === "production")
        res.header("cache-control", "max-age=31536000")

      res.type(getMimeType(filePath)).send(content)
    } catch (error) {
      if (filePath.endsWith(".html")) {
        const content = readFileSync(`${PUBLIC_DIR}/404.html`, "utf-8")

        // Cache request in production
        if (config.NODE_ENV === "production")
          res.header("cache-control", "max-age=31536000")

        res.status(404).type("text/html").send(content)
      } else {
        res.status(404).type("application/json").send({ error: "File not found" })
      }
    }
  })

  // Enable live reload endpoint in development
  if (config.NODE_ENV !== "production")
    await enableLiveReload(fastify)

  // Start the server
  await fastify.listen({ port: config.PORT, host: "0.0.0.0" })
  console.log(`✅ Starting server in ${config.NODE_ENV} mode`)
}

export async function stopServer(): Promise<void> {
  await fastify?.close()
  fastify = null
}
