import fs from "fs/promises"
import path, { dirname } from "path"
import { fileURLToPath } from "url"

/** @returns The content of the file at `filePath` */
export async function readFile(filePath: string): Promise<string> {
  const dir = dirname(fileURLToPath(import.meta.url))
  const file = path.join(dir, filePath)
  return await fs.readFile(file, "utf-8")
}

/** @returns The MIME type based on the file extension */
export function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""

  const mimeTypes: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
  }

  return mimeTypes[ext] || "application/octet-stream"
}
