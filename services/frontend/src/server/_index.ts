import Fastify from "fastify"
import { readFileSync } from "fs"
import { readFile } from "fs/promises"

import { NODE_ENV, PORT, ROOT_DIR } from "./config.js"
import { enableLiveReload } from "./liveReload.js"
import { getMimeType } from "./utils.js"

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

// In production, add header to tell browsers to cache all OK responses for 1 year
fastify.addHook("onSend", async (req, rep) => {
  if (NODE_ENV !== "production")
    return

  if (rep.statusCode === 200 && rep.getHeader("content-type"))
    rep.header("cache-control", "max-age=31536000")
})

// By default, all routes serve _index.html
fastify.get("/*", async (req, res) => {
  let content = await readFile(ROOT_DIR + "/public/_index.html", "utf-8")

  // Inject live reload script in development
  if (NODE_ENV !== "production")
    content = content.replace("</head>", '<script src="/public/liveReload.js"></script></head>')

  res.type("text/html").send(content)
})

// /public/* serve static files (js, css from `dist/public`, others from `public`)
fastify.get<{ Params: { "*": string } }>("/public/*", async (req, res) => {
  const filePath = req.params["*"] || ""
  const ext = filePath.split(".").pop() || ""
  const dir = (ext === "js" || ext === "css") ? "dist/public" : "public"

  try {
    const content = await readFile(ROOT_DIR + `/${dir}/${filePath}`, "utf-8")
    const mimeType = getMimeType(filePath)
    res.type(mimeType).send(content)
  } catch (error) {
    res.status(404).type("application/json").send({ error: "File not found" })
  }
})

// Enable live reload endpoint in development
if (NODE_ENV !== "production")
  await enableLiveReload(fastify)

// Start the server
console.log(`✅ Starting server in ${NODE_ENV} mode`)
// Use host 0.0.0.0 so it can be accessible from outside the docker container
await fastify.listen({ port: PORT, host: "0.0.0.0" })
