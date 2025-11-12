/**
 * Fetch or retrieve from cache the HTML content of a page
 * @param path The path of the page (e.g. /user/info)
 * @returns The HTML content of the page or undefined if not found
 */
async function getPage(path: string) {
  if (path === "/")
    path = "/home"

  if (!pages.hasOwnProperty(path)) {
    // Fetch the page content if not cached
    const res = await fetch(`/public${path}.html`)
    if (res.ok)
      pages[path] = await res.text()
  }

  return pages[path]
}

/** Navigate to a different page, fetching content if necessary, updating the URL and history */
async function navigate(to: string, pushHistory = true) {
  const page = await getPage(to)
  app.innerHTML = page || "<h1>404 Not Found</h1>"
  if (pushHistory)
    window.history.pushState({}, "", to)
}

/** @returns true if the <a> should be handled by the SPA navigation */
function shouldHandleLink(a: HTMLAnchorElement, e: MouseEvent) {
  return a.origin === location.origin // Same website
    && a.target !== "_blank" // Not target blank (this is used to open link in new tab)
    && e.button === 0 // Left click
    && !e.ctrlKey && !e.metaKey && !e.shiftKey // No modifier
}

// ----------------------------------------------------------------------------

const app: HTMLElement = document.getElementById("app")!
const pages: Record<string, string> = {}

if (!app)
  throw new Error("App element not found")

// On first navigation, /public/_index.html and this script will be served,
// if url is /user, this navigate will then display /public/user inside #app
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
  getPage(a.pathname)
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
