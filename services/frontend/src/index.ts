import Fastify from "fastify"
import { getMimeType, readFile } from "./utils.js"

const fastify = Fastify()

// Generic error handler (when a route throws an error)
fastify.setErrorHandler((err, req, res) => {
  res.status(500).type("application/json").send({ error: "Internal Server Error" })
})

// By default, all routes serve index.html
fastify.get("/*", async (req, res) => {
  const content = await readFile("../public/index.html")
  res.type("text/html").send(content)
})

// Serve static files
fastify.get<{ Params: { "*": string } }>("/public/*", async (req, res) => {
  const filePath = req.params["*"] || ""

  try {
    const content = await readFile(`../public/${filePath}`)
    const mimeType = getMimeType(filePath)
    res.type(mimeType).send(content)
  } catch (error) {
    res.status(404).type("application/json").send({ error: "File not found" })
  }
})

// Start the server
console.log("Starting server on http://localhost:3000")
// host 0.0.0.0 to be accessible from outside the docker container
await fastify.listen({ port: 3000, host: "0.0.0.0" })
