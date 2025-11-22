class LockIcon extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24">
      <g
        fill="none"
        stroke="currentColor"
        stroke-dasharray="51"
        stroke-dashoffset="51"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        <rect x="5" y="9" width="14" height="12" rx="1">
          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="51;0" />
        </rect>
        <circle cx="12" cy="15" r="1">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.6s" values="51;0" />
        </circle>
        <path d="M8 8V6a4 4 0 1 1 8 0v2">
          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.6s" values="51;0" />
        </path>
      </g>
    </svg>`
  }
}

customElements.define("lock-icon", LockIcon)
