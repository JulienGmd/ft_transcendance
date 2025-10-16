// TODO typescript (nodemon or tsx should build this as .js so it can be served)

const app = document.getElementById("app")
/** name: content */
const pages = {}

/**
 * Fetch or retrieve from cache the HTML content of a page
 * @param path The path of the page (e.g. /user/info)
 * @returns The HTML content of the page
 */
async function getPage(path) {
  if (path === "/")
    path = "home"
  else
    path = path.slice(1) // Remove leading '/'

  if (!pages.hasOwnProperty(path)) {
    // Fetch the page content if not cached
    const res = await fetch(`/public/${path}.html`)
    if (res.ok)
      pages[path] = await res.text()
  }

  return pages[path]
}

/** Navigate to a different page, fetching content if necessary and updating the URL and history */
async function navigate(to, pushHistory = true) {
  const page = await getPage(to)
  app.innerHTML = page || "<h1>404 Not Found</h1>"
  if (pushHistory)
    window.history.pushState({}, "", to)
}

window.addEventListener("popstate", () => {
  navigate(window.location.pathname, false)
})

window.navigate = navigate // Expose navigate to global scope
navigate(window.location.pathname) // Initial navigation

// ----- Components ----------------------------------------------------------------------------------------------------

class MyLink extends HTMLElement {
  connectedCallback() {
    this.style.cursor = "pointer"
    this.addEventListener("mouseover", (e) => {
      e.preventDefault()
      getPage(this.getAttribute("to"))
    })
    this.addEventListener("click", (e) => {
      e.preventDefault()
      navigate(this.getAttribute("to"))
    })
  }
}
customElements.define("my-link", MyLink)
