import { navigate } from "../../persistent/router.js"
import { getUser, post, setUser } from "../../utils.js"
import "../userAvatar.js"

export interface AppHeaderElement extends HTMLElement {
}

class AppHeader extends HTMLElement implements AppHeaderElement {
  private loginLink!: HTMLAnchorElement
  private profileContainer!: HTMLElement

  connectedCallback() {
    this.innerHTML = `
      <div class="mb-8 flex items-center justify-between">
        <a href="/" class="anim-typewriter font-orbitron text-3xl font-black">TRANSCENDENCE</a>

        <div class="animate-slide-left animate-delay-[0.2s]">
          <!-- Login button (shown when not authenticated) -->
          <a id="header-login" class="hover-skew font-orbitron" href="/login">LOGIN</a>

          <!-- User profile (shown when authenticated) -->
          <div id="header-profile-container" class="group relative">
            <!-- Profile link -->
            <a href="/profile" class="block size-12">
              <span class="sr-only">Profile</span>
              <user-avatar></user-avatar>
            </a>

            <!-- Dropdown menu -->
            <div class="absolute top-full right-0 hidden pt-2 group-hover:block">
              <div class="bg-surface size-full w-32 rounded-md shadow-lg *:first:pt-4 *:last:pb-4">
                <button id="header-logout-btn" class="hover:bg-background/30 block w-full px-4 py-2 text-left text-sm">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    this.loginLink = this.querySelector("#header-login")!
    this.profileContainer = this.querySelector("#header-profile-container")!
    const logoutBtn = this.querySelector("#header-logout-btn")!

    this.update()

    logoutBtn.addEventListener("click", this.logout)
    window.addEventListener("userChanged", this.update)
  }

  disconnectedCallback() {
    window.removeEventListener("userChanged", this.update)
  }

  // Using arrow function because regular function loose 'this' context when called from event listener
  update = async (): Promise<void> => {
    if (getUser()) {
      this.loginLink.classList.add("hidden")
      this.profileContainer.classList.remove("hidden")
    } else {
      this.loginLink.classList.remove("hidden")
      this.profileContainer.classList.add("hidden")
    }
  }

  logout = async (): Promise<void> => {
    await post("/api/user/logout", {})
    setUser(null)
    navigate("/")
  }
}

customElements.define("app-header", AppHeader)
