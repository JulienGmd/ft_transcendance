import { navigate } from "../persistent/router.js"
import { isValidEmail, isValidPassword, post, validateFormInput } from "../utils.js"

// TODO rediriger si deja co

let form: HTMLFormElement | null = null
let formError: HTMLElement | null = null
let username: HTMLInputElement | null = null
let usernameError: HTMLElement | null = null
let email: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let password: HTMLInputElement | null = null
let passwordError: HTMLElement | null = null
let confirmPassword: HTMLInputElement | null = null
let confirmPasswordError: HTMLElement | null = null
let googleBtn: HTMLButtonElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  formError = document.getElementById("form-error")
  username = document.getElementById("username") as HTMLInputElement | null
  usernameError = document.getElementById("username-error")
  email = document.getElementById("email") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  password = document.getElementById("password") as HTMLInputElement | null
  passwordError = document.getElementById("password-error")
  confirmPassword = document.getElementById("confirm-password") as HTMLInputElement | null
  confirmPasswordError = document.getElementById("confirm-password-error")
  googleBtn = document.getElementById("google-signup-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  username?.addEventListener("input", validateUsername)
  email?.addEventListener("input", validateEmail)
  password?.addEventListener("input", validatePassword)
  confirmPassword?.addEventListener("input", validateConfirmPassword)
  googleBtn?.addEventListener("click", loginWithGoogle)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  username?.removeEventListener("input", validateUsername)
  email?.removeEventListener("input", validateEmail)
  password?.removeEventListener("input", validatePassword)
  confirmPassword?.removeEventListener("input", validateConfirmPassword)
  googleBtn?.removeEventListener("click", loginWithGoogle)
}

function validateUsername(): void {
  validateFormInput(
    username!,
    usernameError!,
    (value) => value.length === 0 || value.length >= 3,
    "Username must be at least 3 characters long",
  )
}

function validateEmail(): void {
  validateFormInput(email!, emailError!, (value) => value.length === 0 || isValidEmail(value), "Invalid email format")
}

function validatePassword(): void {
  validateFormInput(
    password!,
    passwordError!,
    (value) => value.length === 0 || isValidPassword(value),
    "Password must be at least 8 characters long with at least 1 number and 1 letter",
  )
  validateConfirmPassword()
}

function validateConfirmPassword(): void {
  validateFormInput(
    confirmPassword!,
    confirmPasswordError!,
    (value) => value.length === 0 || password!.value === value,
    "Passwords do not match",
  )
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  const data = await post("/auth/register", {
    username: username?.value,
    email: email?.value,
    password: password?.value,
  })
  if (!data) {
    formError!.textContent = "Signup failed. Please try again."
    formError?.classList.remove("hidden")
    return
  }

  formError?.classList.add("hidden")

  navigate("/home")
}

function loginWithGoogle(e: Event): void {
  // This will redirect to google OAuth page, so we are about to exit the website,
  // it's fine to do non SPA navigation here.
  window.location.href = "/auth/google"
}
