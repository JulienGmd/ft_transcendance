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
