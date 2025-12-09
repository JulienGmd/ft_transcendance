import { navigate } from "../persistent/router.js"
import { isValidEmail, post, validateFormInput } from "../utils.js"

// TODO rediriger si deja co

let form: HTMLFormElement | null = null
let formError: HTMLElement | null = null
let email: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let password: HTMLInputElement | null = null
let googleBtn: HTMLButtonElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  formError = document.getElementById("form-error")
  email = document.getElementById("email") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  password = document.getElementById("password") as HTMLInputElement | null
  googleBtn = document.getElementById("google-login-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  googleBtn?.addEventListener("click", loginWithGoogle)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  googleBtn?.removeEventListener("click", loginWithGoogle)
}

function validateEmail(): void {
  validateFormInput(email!, emailError!, (value) => value.length === 0 || isValidEmail(value), "Invalid email format")
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  const data = await post("/api/user/login", {
    email: email!.value,
    password: password!.value,
  })
  if (!data[200]) {
    formError!.textContent = "Login failed. Please check your credentials."
    formError?.classList.remove("hidden")
    return
  }
  // TODO 202: 2fa

  formError?.classList.add("hidden")
  navigate("/home")
}

function loginWithGoogle(): void {
  // This will redirect to google OAuth page, so we are about to exit the website,
  // it's fine to do non SPA navigation here.
  window.location.href = "/auth/google"
}
