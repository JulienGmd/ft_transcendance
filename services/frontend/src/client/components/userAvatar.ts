import { get, getUser } from "../utils.js"

export interface UserAvatarElement extends HTMLElement {
  setUsername: (username: string) => void
}

class UserAvatar extends HTMLElement implements UserAvatarElement {
  private img!: HTMLImageElement
  private letter!: HTMLElement
  private container!: HTMLElement
  private observer?: ResizeObserver
  private username?: string

  connectedCallback() {
    this.innerHTML = `
      <div class="bg-primary grid place-items-center overflow-hidden rounded-full size-full shadow-lg">
        <img alt="User Avatar" class="hidden size-full object-cover" />
        <span class="hidden text-2xl font-bold">?</span>
      </div>
    `

    this.container = this.querySelector(":scope > div")! as HTMLElement
    this.img = this.querySelector(":scope > div> img")! as HTMLImageElement
    this.letter = this.querySelector(":scope > div > span")!

    this.observer = new ResizeObserver((entries) => this.adjustFontSize())
    this.observer.observe(this.container)

    this.update()

    window.addEventListener("userChanged", this.update)
  }

  disconnectedCallback() {
    window.removeEventListener("userChanged", this.update)
    this.observer?.disconnect()
  }

  public setUsername = (username: string): void => {
    this.username = username
    this.update()
  }

  // Using arrow function because regular function loose 'this' context when called from event listener
  private update = async (): Promise<void> => {
    let user
    if (!this.username)
      user = getUser()
    else {
      const data = await get(`/api/user/user`, { username: this.username })
      if (data[200])
        user = data[200].user
    }

    if (user) {
      if (user.avatar) {
        this.img.src = user.avatar
        this.img.classList.remove("hidden")
        this.letter.classList.add("hidden")
      } else {
        this.letter.textContent = user.username.charAt(0).toUpperCase()
        this.letter.classList.remove("hidden")
        this.img.classList.add("hidden")
      }
    } else {
      this.letter.textContent = "?"
      this.letter.classList.remove("hidden")
      this.img.classList.add("hidden")
    }
    this.adjustFontSize()
  }

  private adjustFontSize = (): void => {
    const size = this.container.clientWidth * 0.55
    this.letter.style.fontSize = `${size}px`
  }
}

customElements.define("user-avatar", UserAvatar)
