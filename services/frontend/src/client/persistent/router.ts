import { checkEls, showNotify } from "../utils.js"

type Module = {
  onGuard?: (route: string) => boolean
  onMount?: () => void
  onDestroy?: () => void
}

const app: HTMLElement = document.getElementById("app")!
const loadedModules: Module[] = []

checkEls({ app })

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
async function _navigate(route: string, pushHistory = true): Promise<void> {
  loadedModules.forEach((m) => m.onDestroy?.())
  loadedModules.length = 0

  let page = await fetchHtml(route) // Can be cached if header Cache-Control is set server-side
  if (!page) {
    // This should never happens because 404.html should be in `page`.
    app.innerHTML = "<h1>Error 404: Not Found</h1>"
    if (pushHistory)
      history.pushState({}, "", route)
    return
  }

  const { newPage, scriptsSrc } = await extractScripts(page)
  for (const scriptSrc of scriptsSrc)
    loadedModules.push(await import(scriptSrc)) // Cached by browser

  for (const m of loadedModules) {
    if (m.onGuard && !m.onGuard(route)) {
      loadedModules.length = 0
      history.replaceState({}, "", "/") // Avoid back trap (e.g. land on /profile: guard to / -> back button -> /profile etc)
      _navigate("/", false)
      return // Cancel navigation
    }
  }

  app.innerHTML = newPage

  if (pushHistory)
    history.pushState({}, "", route)

  window.dispatchEvent(new CustomEvent("pageLoaded"))
  loadedModules.forEach((m) => m.onMount?.())
}

/**
 * @param route The page route ('/', '/login', etc.)
 * @returns the page HTML string
 */
async function fetchHtml(route: string): Promise<string | null> {
  route = route.split("?")[0] // Remove query params
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

export function navigate(
  route: string,
  notification?: string,
  notificationType: "success" | "warning" | "error" = "success",
): void {
  _navigate(route)

  if (notification)
    showNotify(notification, notificationType)
}

// ----------------------------------------------------------------------------

// On landing, /public/_index.html and this script will be served,
// if url is /user, this navigate will then display /public/pages/user inside #app,
// load scripts, etc.
_navigate(window.location.pathname + window.location.search, false)

/** Handle browser navigation (back/forward buttons) */
window.addEventListener("popstate", () => {
  // Back/forward button will change the url in the address bar, so simply navigate to it
  _navigate(window.location.pathname + window.location.search, false)
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
  _navigate(a.pathname + a.search)
})
