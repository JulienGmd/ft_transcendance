let lastTimestamps: Record<string, number> = {}

async function reloadIfFilesChanged(): Promise<void> {
  try {
    const res = await fetch("/dev/file-timestamps")
    if (!res.ok)
      return
    const timestamps: Record<string, number> = await res.json()

    // Initial load
    if (Object.keys(lastTimestamps).length === 0) {
      lastTimestamps = timestamps
      return
    }

    // Force reload (delete cache) if timestamps have changed
    if (!deepEqual(timestamps, lastTimestamps)) {
      // @ts-ignore DOM lib definitions don't include the forceReload parameter, but the browsers support it
      window.location.reload(true)
    }

    lastTimestamps = timestamps
  } catch (error) {
    console.error("Error checking file timestamps for live reload:", error)
  }
}

function isObject(value: any): value is Record<string, any> {
  // typeof null is object, so we also need to check for null values
  return typeof value === "object" && value !== null
}

function deepEqual(v1: Record<string, any>, v2: Record<string, any>): boolean {
  if (!isObject(v1) || !isObject(v2))
    return v1 === v2

  const keys1 = Object.keys(v1)
  const keys2 = Object.keys(v2)

  if (keys1.length !== keys2.length)
    return false

  // Recursive check for nested objects / arrays / primitive values
  // Also works for array keys since arrays are objects with numeric keys
  for (const key1 of keys1) {
    if (!deepEqual(v1[key1], v2[key1]))
      return false
  }

  return true
}

setInterval(reloadIfFilesChanged, 1000)
