const app: HTMLElement = document.getElementById("app")!
let loadedModules: { onMount?: () => void; onDestroy?: () => void }[] = []

if (!app)
  throw new Error("App element not found")

/**
 * Preload the page HTML and scripts (safe to call multiple times)
 * @param route The page route ('/', '/login', etc.)
 */
async function preload(route: string): Promise<void> {
  const page = await fetchHtml(route) // Can be cached if header Cache-Control is set server-side
  if (!page)
    return

  const { scriptsSrc } = await extractScripts(page)
  for (const scriptSrc of scriptsSrc)
    await import(scriptSrc) // Cached by browser
}

/**
 * @param route The page route ('/', '/login', etc.)
 * @param pushHistory Whether to push the new route to browser history (default: true)
 */
export async function navigate(route: string, pushHistory = true): Promise<void> {
  loadedModules.forEach((m) => m.onDestroy?.())
  loadedModules = []

  let page = await fetchHtml(route) // Can be cached if header Cache-Control is set server-side
  if (!page) {
    // This should never happens because 404.html should be in `page`.
    app.innerHTML = "<h1>Error 404: Not Found</h1>"
    if (pushHistory)
      window.history.pushState({}, "", route)
    return
  }

  const { newPage, scriptsSrc } = await extractScripts(page)
  for (const scriptSrc of scriptsSrc)
    loadedModules.push(await import(scriptSrc)) // Cached by browser

  app.innerHTML = newPage

  window.dispatchEvent(new CustomEvent("pageLoaded"))
  loadedModules.forEach((m) => m.onMount?.())

  if (pushHistory)
    window.history.pushState({}, "", route)
}

/**
 * @param route The page route ('/', '/login', etc.)
 * @returns the page HTML string
 */
async function fetchHtml(route: string): Promise<string | null> {
  route = route === "/" ? "/home" : route
  const res = await fetch(`/public/pages${route}.html`)
  // Server returns 404.html with 404 status for missing pages
  if (res.status === 404 || res.ok)
    return await res.text()
  return null
}

/**
 * @param page The page HTML
 * @returns The page HTML without script tags and the scripts src
 */
async function extractScripts(page: string): Promise<{ newPage: string; scriptsSrc: string[] }> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(page, "text/html")
  const scripts = Array.from(doc.querySelectorAll("script"))
  const scriptsSrc = scripts.map((s) => s.src).filter((src) => src)

  scripts.forEach((s) => s.remove())

  return { newPage: doc.body.innerHTML, scriptsSrc }
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
// if url is /user, this navigate will then display /public/pages/user inside #app,
// load scripts, etc.
navigate(window.location.pathname, false)

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
