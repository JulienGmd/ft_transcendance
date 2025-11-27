class FormInput extends HTMLElement {
  connectedCallback() {
    const type = this.getAttribute("type") || "text"
    const _id = this.getAttribute("_id") || ""
    const label = this.getAttribute("label") || ""
    const icon = this.getAttribute("icon") || ""
    const _required = this.getAttribute("_required") !== "false" // Default to true unless explicitly set to "false"
    const placeholder = this.getAttribute("placeholder") || label
    
    // Determine autocomplete value based on field type and id
    let autocomplete = this.getAttribute("autocomplete") || ""
    if (!autocomplete) {
      if (_id === "email") autocomplete = "email"
      else if (_id === "password") autocomplete = "current-password"
      else if (_id === "confirm-password") autocomplete = "new-password"
      else if (type === "password") autocomplete = "current-password"
    }

    this.innerHTML = `
      <div class="relative">
        <input
          type="${type}"
          name="${_id}"
          id="${_id}"
          ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
          ${_required ? 'required' : ''}
          class="bg-background/50 border-background/40 focus:border-primary peer h-14 w-full rounded-xl border-2 px-4 pt-6 pb-2 placeholder-transparent transition outline-none"
          placeholder="${placeholder}"
        />
        <label
          for="${_id}"
          class="text-text-muted peer-focus:text-primary pointer-events-none absolute top-2 left-4 text-xs transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
        >
          ${label}
        </label>
        ${icon ? `
        <div
          class="text-text-muted pointer-events-none peer-hover:text-primary peer-focus:text-primary absolute top-1/2 right-4 size-5 -translate-y-1/2 transition"
        >
          <${icon}-icon />
        </div>
        ` : ''}
      </div>
      <div id="${_id}-error" class="text-error m-2 hidden text-sm"></div>
    `
  }
}

customElements.define("form-input", FormInput)
