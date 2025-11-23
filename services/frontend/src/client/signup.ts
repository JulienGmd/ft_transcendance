import { isValidEmail, isValidPassword } from "./utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let password: HTMLInputElement | null = null
let confirmPassword: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let passwordError: HTMLElement | null = null
let confirmPasswordError: HTMLElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  password = document.getElementById("password") as HTMLInputElement | null
  confirmPassword = document.getElementById("confirm-password") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  passwordError = document.getElementById("password-error")
  confirmPasswordError = document.getElementById("confirm-password-error")

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  password?.addEventListener("input", validatePassword)
  confirmPassword?.addEventListener("input", validateConfirmPassword)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  password?.removeEventListener("input", validatePassword)
  confirmPassword?.removeEventListener("input", validateConfirmPassword)
}

function onSubmit(e: Event): void {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  // TODO check email not already used -> just do the register request ?
  // TODO validate email page
  // -> websocket to redirect once its confirmed ?
  // -> click on link from email that say "Thanks for confirming" and then redirect to home ?
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

function validatePassword(): void {
  if (password?.value.length === 0 || isValidPassword(password!.value)) {
    password?.setCustomValidity("")
    passwordError!.textContent = ""
    passwordError!.classList.add("hidden")
  } else {
    password?.setCustomValidity("Password must be at least 8 characters long with at least 1 number and 1 letter")
    passwordError!.textContent = "Password must be at least 8 characters long with at least 1 number and 1 letter"
    passwordError!.classList.remove("hidden")
  }

  validateConfirmPassword()
}

function validateConfirmPassword(): void {
  if (confirmPassword?.value.length === 0 || password?.value === confirmPassword?.value) {
    confirmPassword?.setCustomValidity("")
    confirmPasswordError!.textContent = ""
    confirmPasswordError!.classList.add("hidden")
  } else {
    confirmPassword?.setCustomValidity("Passwords do not match")
    confirmPasswordError!.textContent = "Passwords do not match"
    confirmPasswordError!.classList.remove("hidden")
  }
}
