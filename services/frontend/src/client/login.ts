import { isValidEmail } from "./utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let emailError: HTMLElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  emailError = document.getElementById("email-error")

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
}

function onSubmit(e: Event): void {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  // TODO check email and password are valid -> do the login request
}

function validateEmail(): void {
  if (email?.value.length === 0 || isValidEmail(email!.value)) {
    email?.setCustomValidity("")
    emailError!.textContent = ""
    emailError!.classList.add("hidden")
  } else {
    email?.setCustomValidity("Invalid email format")
    emailError!.textContent = "Invalid email format"
    emailError!.classList.remove("hidden")
  }
}
