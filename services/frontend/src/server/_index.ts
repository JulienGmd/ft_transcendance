import Fastify from "fastify"
import { existsSync, readFileSync } from "fs"

import { NODE_ENV, PORT, ROOT_DIR } from "./config.js"
import { enableLiveReload } from "./liveReload.js"
import { getMimeType } from "./utils.js"

const DIST_PUBLIC_DIR = ROOT_DIR + "/dist/public"
const PUBLIC_DIR = ROOT_DIR + "/public"

const fastify = Fastify({
  https: {
    key: readFileSync("/certs/key.pem"),
    cert: readFileSync("/certs/cert.pem"),
  },
})

// Generic error handler (when a route throws an error)
fastify.setErrorHandler((err, req, res) => {
  res.status(500).type("application/json").send({ error: "Internal Server Error" })
})

// In development, log all requests
fastify.addHook("onRequest", async (req, rep) => {
  if (NODE_ENV === "production")
    return
  if (req.url === "/dev/file-timestamps")
    return

  console.log(`${req.method} ${req.url}`)
})

// By default, all routes serve _index.html
fastify.get("/*", async (req, res) => {
  let content = readFileSync(`${PUBLIC_DIR}/_index.html`, "utf-8")

  // Inject live reload script in development
  if (NODE_ENV !== "production")
    content = content.replace("</head>", '<script src="/public/persistent/liveReload.js"></script></head>')

  if (NODE_ENV === "production")
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
    const mimeType = getMimeType(filePath)
    if (NODE_ENV === "production")
      res.header("cache-control", "max-age=31536000")
    res.type(mimeType).send(content)
  } catch (error) {
    if (filePath.endsWith(".html")) {
      const content = readFileSync(`${PUBLIC_DIR}/404.html`, "utf-8")
      if (NODE_ENV === "production")
        res.header("cache-control", "max-age=31536000")
      res.status(404).type("text/html").send(content)
    } else {
      res.status(404).type("application/json").send({ error: "File not found" })
    }
  }
})

// Enable live reload endpoint in development
if (NODE_ENV !== "production")
  await enableLiveReload(fastify)

// Start the server
console.log(`✅ Starting server in ${NODE_ENV} mode`)
// Use host 0.0.0.0 so it can be accessible from outside the docker container
await fastify.listen({ port: PORT, host: "0.0.0.0" })
