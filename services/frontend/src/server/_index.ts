import Fastify from "fastify"
import { getMimeType, readFile } from "./utils.js"

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

const fastify = Fastify()

// Generic error handler (when a route throws an error)
fastify.setErrorHandler((err, req, res) => {
  res.status(500).type("application/json").send({ error: "Internal Server Error" })
})

// By default, all routes serve _index.html
fastify.get("/*", async (req, res) => {
  const content = await readFile("../../public/_index.html")
  res.type("text/html").send(content)
})

// /public serve static files (js from ../../dist/public, others from ../../public)
fastify.get<{ Params: { "*": string } }>("/public/*", async (req, res) => {
  const filePath = req.params["*"] || ""
  const ext = filePath.split(".").pop() || ""
  const dir = ext === "js" ? "dist/public" : "public"

  try {
    const content = await readFile(`../../${dir}/${filePath}`)
    const mimeType = getMimeType(filePath)
    res.type(mimeType).send(content)
  } catch (error) {
    res.status(404).type("application/json").send({ error: "File not found" })
  }
})

// Start the server
console.log(`Starting server on http://localhost:${PORT}`)
// USe host 0.0.0.0 so it can be accessible from outside the docker container
await fastify.listen({ port: PORT, host: "0.0.0.0" })
