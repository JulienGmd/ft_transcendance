import type { FastifyInstance } from "fastify"
import fs from "fs/promises"

import { ROOT_DIR } from "./config.js"

let isRegistered = false

export async function enableLiveReload(fastify: FastifyInstance) {
  if (isRegistered) {
    console.warn("Live reload already enabled")
    return
  }

  isRegistered = true

  fastify.get("/dev/file-timestamps", async (req, res) => {
    const dirs = [
      ROOT_DIR + "public",
      ROOT_DIR + "dist/public",
    ]
    const timestamps = await getFilesTimestamps(dirs)
    res.header("cache-control", "no-cache")
    res.type("application/json").send(timestamps)
  })

  console.log("Live reload enabled")
}

async function getFilesTimestamps(dirs: string[]): Promise<Record<string, number>> {
  const timestamps: Record<string, number> = {}

  for (const dir of dirs) {
    const files = await fs.readdir(dir, { withFileTypes: true, recursive: true })

    for (const file of files) {
      if (file.isDirectory())
        continue

      const absPath = file.parentPath + "/" + file.name
      const stat = await fs.stat(absPath)
      timestamps[absPath] = stat.mtime.getTime()
    }
  }

  return timestamps
}
