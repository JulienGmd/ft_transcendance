import { navigate } from "../../persistent/router.js"
import { getUser, post, setUser } from "../../utils.js"
import "../userAvatar.js"

export interface AppHeaderElement extends HTMLElement {
}

class AppHeader extends HTMLElement implements AppHeaderElement {
  private loginLink!: HTMLAnchorElement
  private profileContainer!: HTMLElement
  private dropdownMenu!: HTMLElement

  connectedCallback() {
    this.innerHTML = `
      <div class="mb-8 flex items-center justify-between p-4">
        <a href="/" class="anim-typewriter font-orbitron text-xl sm:text-3xl font-black">TRANSCENDENCE</a>

        <div class="animate-slide-left animate-delay-[0.2s]">
          <!-- Login button (shown when not authenticated) -->
          <a id="header-login" class="hover:text-primary font-orbitron transition" href="/login">LOGIN</a>

          <!-- User profile (shown when authenticated) -->
          <div id="header-profile-container" class="relative">
            <!-- Profile link -->
            <button id="header-profile-btn" class="block size-12">
              <span class="sr-only">Profile</span>
              <user-avatar></user-avatar>
            </button>

            <!-- Dropdown menu -->
            <div id="header-dropdown" class="absolute top-full right-0 hidden pt-2 z-10">
              <div class="bg-surface size-full w-32 rounded-md shadow-lg *:first:pt-4 *:last:pb-4">
                <a href="/profile/me" class="hover:bg-background/30 block w-full px-4 py-2 text-left text-sm">Profile</a>
                <a href="/api" class="hover:bg-background/30 block w-full px-4 py-2 text-left text-sm">API</a>
                <button id="header-logout-btn" class="hover:bg-background/30 block w-full px-4 py-2 text-left text-sm">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    this.loginLink = this.querySelector("#header-login")!
    this.profileContainer = this.querySelector("#header-profile-container")!
    this.dropdownMenu = this.querySelector("#header-dropdown")!
    const profileBtn = this.querySelector("#header-profile-btn")!
    const logoutBtn = this.querySelector("#header-logout-btn")!

    this.update()

    profileBtn.addEventListener("click", this.toggleDropdown)
    logoutBtn.addEventListener("click", this.logout)
    document.addEventListener("click", this.handleDocumentClick)
    window.addEventListener("userChanged", this.update)
  }

  disconnectedCallback() {
    document.removeEventListener("click", this.handleDocumentClick)
    window.removeEventListener("userChanged", this.update)
  }

  private toggleDropdown = (e: Event): void => {
    e.stopPropagation()
    this.dropdownMenu.classList.toggle("hidden")
  }

  private handleDocumentClick = (): void => {
    this.dropdownMenu.classList.add("hidden")
  }

  // Using arrow function because regular function loose 'this' context when called from event listener
  private update = async (): Promise<void> => {
    if (getUser()) {
      this.loginLink.classList.add("hidden")
      this.profileContainer.classList.remove("hidden")
    } else {
      this.loginLink.classList.remove("hidden")
      this.profileContainer.classList.add("hidden")
    }
  }

  private logout = async (): Promise<void> => {
    await post("/api/user/logout", {})
    setUser(null)
    navigate("/", "Logged out successfully")
  }
}

customElements.define("app-header", AppHeader)
