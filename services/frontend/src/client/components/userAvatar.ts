import { getUser } from "../utils.js"

export interface UserAvatarElement extends HTMLElement {
}

class UserAvatar extends HTMLElement implements UserAvatarElement {
  private img!: HTMLImageElement
  private letter!: HTMLElement

  connectedCallback() {
    this.innerHTML = `
      <div class="bg-primary grid place-items-center overflow-hidden rounded-full size-full">
        <img alt="User Avatar" class="hidden size-full object-cover" />
        <span class="hidden text-2xl font-bold">?</span>
      </div>
    `

    this.img = this.querySelector(":scope > div> img")! as HTMLImageElement
    this.letter = this.querySelector(":scope > div > span")!

    this.update()

    window.addEventListener("userChanged", this.update)
  }

  disconnectedCallback() {
    window.removeEventListener("userChanged", this.update)
  }

  // Using arrow function else when its called as event listener, 'this' is lost
  update = async (): Promise<void> => {
    const user = getUser()

    if (user) {
      if (user.avatar) {
        this.img.src = user.avatar
        this.img.classList.remove("hidden")
        this.letter.classList.add("hidden")
      } else {
        let str = user.username ? user.username : user.email
        this.letter.textContent = str.charAt(0).toUpperCase()
        this.letter.classList.remove("hidden")
        this.img.classList.add("hidden")
      }
    } else {
      this.letter.textContent = "?"
      this.letter.classList.remove("hidden")
      this.img.classList.add("hidden")
    }
  }
}

customElements.define("user-avatar", UserAvatar)
