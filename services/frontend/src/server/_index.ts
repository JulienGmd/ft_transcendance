import Fastify from "fastify"
import { readFile } from "fs/promises"

import { NODE_ENV, PORT, ROOT_DIR } from "./config.js"
import { getMimeType } from "./utils.js"

const fastify = Fastify()

// Generic error handler (when a route throws an error)
fastify.setErrorHandler((err, req, res) => {
  res.status(500).type("application/json").send({ error: "Internal Server Error" })
})

// By default, all routes serve _index.html
fastify.get("/*", async (req, res) => {
  const content = await readFile(ROOT_DIR + "/public/_index.html", "utf-8")
  res.type("text/html").send(content)
})

// /public serve static files (js, css from ../../dist/public, others from ../../public)
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

// Start the server
console.log(`✅ Starting server in ${NODE_ENV} mode on http://localhost:${PORT}`)
// Use host 0.0.0.0 so it can be accessible from outside the docker container
await fastify.listen({ port: PORT, host: "0.0.0.0" })
