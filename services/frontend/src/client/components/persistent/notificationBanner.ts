export interface NotificationBannerElement extends HTMLElement {
  /** Show a success message in the banner */
  showSuccessMessage(msg: string): void
  /** Show a warning message in the banner */
  showWarningMessage(msg: string): void
  /** Show an error message in the banner */
  showErrorMessage(msg: string): void
  /** Hide the notification banner */
  hide(): void
}

class NotificationBanner extends HTMLElement implements NotificationBannerElement {
  private container!: HTMLElement
  private text!: HTMLElement
  private hideTimeout: number | null = null
  private currentAnimation: Animation | null = null

  connectedCallback() {
    this.innerHTML = `
      <div id="notification-banner-container" class="fixed inset-x-0 top-0 z-50 opacity-0 pointer-events-none">
        <div class="grid place-items-center p-4">
          <p id="notification-banner-text" class="text-center text-sm text-background"></p>
          <button id="notification-banner-close" class="absolute inset-0 bg-background/70 font-orbitron opacity-0 hover:opacity-100 transition">HIDE</button>
        </div>
      </div>
    `

    this.container = this.querySelector("#notification-banner-container")!
    this.text = this.querySelector("#notification-banner-text")!
    const closeBtn = this.querySelector("#notification-banner-close")!

    closeBtn.addEventListener("click", this.hide)
  }

  showSuccessMessage = (msg: string): void => {
    this.container.style.backgroundColor = "var(--color-success)"
    this.text.textContent = msg
    this.show()
    if (this.hideTimeout)
      clearTimeout(this.hideTimeout)
    this.hideTimeout = window.setTimeout(() => this.hide(), 5000)
  }

  showWarningMessage = (msg: string): void => {
    this.container.style.backgroundColor = "var(--color-warning)"
    this.text.textContent = msg
    this.show()
  }

  showErrorMessage = (msg: string): void => {
    this.container.style.backgroundColor = "var(--color-error)"
    this.text.textContent = msg
    this.show()
  }

  private show = async (): Promise<void> => {
    if (this.currentAnimation)
      this.currentAnimation.cancel()

    this.container.style.pointerEvents = "auto"

    this.currentAnimation = this.container.animate([
      { transform: "translateY(-100%)", opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ], {
      duration: 300,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // quad out
      fill: "forwards", // keep final state
    })

    try {
      await this.currentAnimation.finished
    } catch (error) {
      // In case the animation is cancelled
    }
    this.currentAnimation = null
  }

  hide = async (): Promise<void> => {
    if (this.currentAnimation)
      this.currentAnimation.cancel()

    this.currentAnimation = this.container.animate([
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(-100%)", opacity: 0 },
    ], {
      duration: 250,
      easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)", // quad in
      fill: "forwards", // keep final state
    })

    try {
      await this.currentAnimation.finished
    } catch (error) {
      // In case the animation is cancelled
    }
    this.container.style.pointerEvents = "none"
    this.currentAnimation = null
  }
}

customElements.define("notification-banner", NotificationBanner)
