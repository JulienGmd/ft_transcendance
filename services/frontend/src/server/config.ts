import { dirname, join } from "path"
import { fileURLToPath } from "url"

// Env
export const NODE_ENV = process.env.NODE_ENV || "development"
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

// Constants
export const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../")
