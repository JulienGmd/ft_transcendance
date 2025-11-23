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
    if (!shallowEqual(timestamps, lastTimestamps)) {
      // @ts-ignore DOM lib definitions don't include the forceReload parameter, but the browsers support it
      window.location.reload(true)
    }

    lastTimestamps = timestamps
  } catch (error) {
    // Skip
  }
}

function shallowEqual(obj1: Record<string, any>, obj2: Record<string, any>): boolean {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length)
    return false

  for (const key of keys1) {
    if (obj1[key] !== obj2[key])
      return false
  }

  return true
}

setInterval(reloadIfFilesChanged, 1000)
