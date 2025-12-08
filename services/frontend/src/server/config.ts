import { dirname, join } from "path"
import { fileURLToPath } from "url"

const config = {
  // Mandatory env

  // Optional env
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,

  // Constants
  ROOT_DIR: join(dirname(fileURLToPath(import.meta.url)), "../.."),
}

for (const [key, value] of Object.entries(config)) {
  if (!value)
    throw new Error(`${key} is not defined in env`)
}

export default config
