import 'dotenv/config';
import Fastify from "fastify"
import cookie from "@fastify/cookie"
import { initDb } from "./db/init";
import { authRoutes } from "./auth.routes"
import { matchRoutes } from "./match.routes"
import { readFileSync } from "fs"

try {
  // Create HTTPS server (/certs mounted from ./certs in docker-compose.yml)
  const fastify = Fastify({
    https: {
      key: readFileSync("/certs/key.pem"),
      cert: readFileSync("/certs/cert.pem"),
    },
  })

  // Register cookie plugin
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET, // for signing cookies
    parseOptions: {}
  })

  const db = initDb();

  // Initialize and migrate database
  await authRoutes(fastify, db);
  await matchRoutes(fastify, db);

  // Start server
  await fastify.listen({ port: 3000, host: "0.0.0.0" })
  console.log('Auth service listening on https://0.0.0.0:3000');
} catch (err) {
  console.error('Error starting auth service:', err);
  process.exit(1);
}