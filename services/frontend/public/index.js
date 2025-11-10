// TODO typescript (nodemon or tsx should build this as .js so it can be served)

const app = document.getElementById("app")
const pages = {} /** pagePath: bodyContent */

/**
 * Fetch or retrieve from cache the HTML content of a page
 * @param path The path of the page (e.g. /user/info)
 * @returns The HTML content of the page or undefined if not found
 */
async function getPage(path) {
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
async function navigate(to, pushHistory = true) {
  const page = await getPage(to)
  app.innerHTML = page || "<h1>404 Not Found</h1>"
  if (pushHistory)
    window.history.pushState({}, "", to)
}

/** @returns true if the <a> should be handled by the SPA navigation */
function shouldHandleLink(a, e) {
  return a.origin === location.origin // Same website
    && a.target !== "_blank" // Not target blank (this is used to open link in new tab)
    && e.button === 0 // Left click
    && !e.ctrlKey && !e.metaKey && !e.shiftKey // No modifier
}

/** Handle browser navigation (back/forward buttons) */
window.addEventListener("popstate", () => {
  // Simply navigate to the url in the address bar
  navigate(window.location.pathname, false)
})

document.addEventListener("mouseover", (e) => {
  const a = e.target.closest("a")
  if (!a || !shouldHandleLink(a, e))
    return

  // If hovering a handled <a>, preload the page
  e.preventDefault()
  getPage(a.pathname)
})

document.addEventListener("click", (e) => {
  const a = e.target.closest("a")
  if (!a || !shouldHandleLink(a, e))
    return

  // If clicking a handled <a>, navigate to the page
  e.preventDefault()
  navigate(a.pathname)
})

// On first navigation, /public/index.html and this script will be served,
// if url is /user, this navigate will then display /public/user inside #app
navigate(window.location.pathname)
