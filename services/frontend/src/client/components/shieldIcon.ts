class ShieldIcon extends HTMLElement {
  // d="M12 2l-9 3.5v6.5c0 3.5 3.5 9 8 10c4.5 -1 8 -6.5 8 -10v-6.5l-8 -3.5Z"
  connectedCallback() {
    this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24">
      <path
        fill="none"
        stroke="currentColor"
        stroke-dasharray="64"
        stroke-dashoffset="64"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 2l-9 3.5v6.5c0 3.5 3.5 9 9 10c4.5 -1 8 -6.5 9 -10v-6.5l-8 -3.5Z"
      >
        <animate fill="freeze" attributeName="stroke-dashoffset" dur="1.2s" values="64;0" />
      </path>
    </svg>`
  }
}

customElements.define("shield-icon", ShieldIcon)
