const app: HTMLElement = document.getElementById("app")!
let loadedModules: { onMount?: () => void; onDestroy?: () => void }[] = []

if (!app)
  throw new Error("App element not found")

/**
 * Preload the page HTML and scripts (safe to call multiple times, this will not redo requests)
 * @param route The page route ('/', '/login', etc.)
 */
async function preload(route: string): Promise<void> {
  // Preload page (cached by browser because Cache-Control header is set in Caddyfile)
  const page = await fetchHtml(route)
  if (!page)
    return

  // Preload scripts (import cached file by default, but it makes top level code execute immediately)
  const { scriptsUrls } = await extractScripts(page)
  for (const scriptUrl of scriptsUrls)
    await import(scriptUrl)
}

/**
 * @param route The page route ('/', '/login', etc.)
 * @param pushHistory Whether to push the new route to browser history (default: true)
 */
export async function navigate(route: string, pushHistory = true): Promise<void> {
  // Call onDestroy on previous modules
  loadedModules.forEach((m) => m.onDestroy?.())
  loadedModules = []

  // Get page HTML (will use cache if preloaded)
  let page = await fetchHtml(route)
  if (!page) {
    // This should never happens because 404.html should be in `page`.
    app.innerHTML = "<h1>Error 404: Not Found</h1>"
    if (pushHistory)
      window.history.pushState({}, "", route)
    return
  }

  // Load modules (will use cache if preloaded)
  const { newPage, scriptsUrls: scriptsUrls } = await extractScripts(page)
  for (const scriptUrl of scriptsUrls)
    loadedModules.push(await import(scriptUrl))

  // Inject HTML into #app
  app.innerHTML = newPage

  // Dispatch event for persistent scripts to react to page load
  window.dispatchEvent(new CustomEvent("pageLoaded"))

  // Call onMount on modules
  loadedModules.forEach((m) => m.onMount?.())

  // Update URL and history
  if (pushHistory)
    window.history.pushState({}, "", route)
}

/**
 * @param route The page route ('/', '/login', etc.)
 * @returns the page HTML, either from cache or by fetching it
 */
async function fetchHtml(route: string): Promise<string | null> {
  route = route === "/" ? "/home" : route
  const res = await fetch(`/public/pages${route}.html`)
  if (res.status === 404) {
    // Server returns 404.html with 404 status for missing pages
    return await res.text()
  }
  if (!res.ok)
    return null
  return await res.text()
}

/**
 * @param page The page HTML
 * @returns The page HTML with script tags removed and the scripts URLs
 */
async function extractScripts(page: string): Promise<{ newPage: string; scriptsUrls: string[] }> {
  // Get scripts URLs
  const parser = new DOMParser()
  const doc = parser.parseFromString(page, "text/html")
  const scripts = Array.from(doc.querySelectorAll("script"))
  const scriptsUrls = scripts.map((s) => s.src).filter((src) => src)

  // Remove scripts from doc
  scripts.forEach((s) => s.remove())

  return { newPage: doc.body.innerHTML, scriptsUrls }
}

/** @returns true if the <a> should be handled by the SPA navigation */
function shouldHandleLink(a: HTMLAnchorElement, e: MouseEvent): boolean {
  return a.origin === location.origin // Same website
    && a.target !== "_blank" // Not target blank (this is used to open link in new tab)
    && e.button === 0 // Left click
    && !e.ctrlKey && !e.metaKey && !e.shiftKey // No modifier
}

// ----------------------------------------------------------------------------

// On first navigation, /public/_index.html and this script will be served,
// if url is /user, this navigate will then display /public/pages/user inside #app
navigate(window.location.pathname)

/** Handle browser navigation (back/forward buttons) */
window.addEventListener("popstate", () => {
  // Back/forward button will change the url in the address bar, so simply navigate to it
  navigate(window.location.pathname, false)
})

/** When hovering a handled <a>, preload the page */
document.addEventListener("mouseover", (e) => {
  if (!(e.target instanceof Element))
    return
  const a = e.target.closest("a")
  if (!a || !shouldHandleLink(a, e))
    return

  e.preventDefault()
  preload(a.pathname)
})

/** When clicking a handled <a>, navigate to the page */
document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element))
    return
  const a = e.target.closest("a")
  if (!a || !shouldHandleLink(a, e))
    return

  e.preventDefault()
  navigate(a.pathname)
})
