/**
 * @param name The name of the input element
 * @param label The label text for the input element
 * @param type (optional - default: "text") The type of the input element
 * @param required (optional) Whether the input is required
 * @param autocomplete (optional) The autocomplete attribute for the input element
 * @param icon (optional) The name of an icon component to display inside the input
 */
export interface FormInputElement extends HTMLElement {
  /** Show an error message below the input */
  showError(msg: string): void
  /** Clear the error message */
  clearError(): void
  /** The value of the input */
  value: string
}

class FormInput extends HTMLElement implements FormInputElement {
  private inputEl!: HTMLInputElement
  private errorEl!: HTMLElement

  connectedCallback() {
    const name = this.getAttribute("name")
    const label = this.getAttribute("label")

    const type = this.getAttribute("type") || "text"
    const required = this.getAttribute("required") !== null
    let autocomplete = this.getAttribute("autocomplete")
    const icon = this.getAttribute("icon")

    if (!name)
      throw new Error("FormInput component requires a valid name attribute")
    if (!label)
      throw new Error("FormInput component requires a valid label attribute")

    if (!autocomplete) {
      if (name.toLowerCase().includes("email"))
        autocomplete = "email"
      else if (name.toLowerCase().includes("password"))
        autocomplete = "current-password"
    }

    this.innerHTML = `
      <div class="relative">
        <input
          id="${name}-form-input"
          name="${name}"
          type="${type}"
          ${required ? "required" : ""}
          ${autocomplete ? `autocomplete="${autocomplete}"` : ""}
          class="border-surface focus:border-primary peer h-14 w-full rounded-xl border-2 px-4 pt-6 pb-2 placeholder-transparent transition outline-none"
          placeholder="${label}"
        />
        <label
          for="${name}-form-input"
          class="text-text-muted peer-focus:text-primary pointer-events-none absolute top-2 left-4 text-xs transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
        >
          ${label}
        </label>
        ${
      icon
        ? `<div class="text-text-muted pointer-events-none peer-focus:text-primary absolute top-1/2 right-4 size-5 -translate-y-1/2 transition"><${icon}-icon></${icon}-icon></div>`
        : ""
    }
      </div>
      <div class="text-error mt-2 hidden text-sm"></div>
    `

    this.inputEl = this.querySelector("input")!
    this.errorEl = this.querySelector(":scope > div:last-child")! // div that is the last child of the component
  }

  showError(msg: string): void {
    this.errorEl.textContent = msg
    this.errorEl.classList.remove("hidden")
  }

  clearError(): void {
    this.errorEl.textContent = ""
    this.errorEl.classList.add("hidden")
  }

  get value(): string {
    return this.inputEl.value
  }

  set value(value: string) {
    this.inputEl.value = value
  }
}

customElements.define("form-input", FormInput)
