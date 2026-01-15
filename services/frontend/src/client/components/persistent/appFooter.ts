export interface AppFooterElement extends HTMLElement {
}

class AppFooter extends HTMLElement implements AppFooterElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="mt-16 p-4">
        <p class="text-text-muted text-center text-sm">
          © <span id="footer-date">2025</span> TRANSCENDENCE. All rights reserved.
        </p>
      </footer>
    `

    const footerDate = this.querySelector("#footer-date")!
    footerDate.textContent = new Date().getFullYear().toString()
  }
}

customElements.define("app-footer", AppFooter)
