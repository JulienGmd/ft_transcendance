import "dotenv/config"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const config = {
  // Mandatory env
  JWT_PRIVATE: readFileSync("/secrets/jwt/private.pem"),
  JWT_PUBLIC: readFileSync("/secrets/jwt/public.pem"),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,

  // Optional env
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  NATS_URL: process.env.NATS_URL || "nats://nats:4222",

  // Constants
  ROOT_DIR: join(dirname(fileURLToPath(import.meta.url)), ".."),
}

for (const [key, value] of Object.entries(config)) {
  if (!value)
    throw new Error(`${key} is not defined in env`)
}

export default config
