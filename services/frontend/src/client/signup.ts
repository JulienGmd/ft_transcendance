import { isValidEmail, isValidPassword } from "./utils.js"

let email: HTMLInputElement | null = null
let password: HTMLInputElement | null = null
let confirmPassword: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let passwordError: HTMLElement | null = null
let confirmPasswordError: HTMLElement | null = null

export function onMount(): void {
  email = document.getElementById("email") as HTMLInputElement | null
  password = document.getElementById("password") as HTMLInputElement | null
  confirmPassword = document.getElementById("confirm-password") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  passwordError = document.getElementById("password-error")
  confirmPasswordError = document.getElementById("confirm-password-error")

  email?.addEventListener("input", validateEmail)
  password?.addEventListener("input", validatePassword)
  confirmPassword?.addEventListener("input", validateConfirmPassword)
}

export function onDestroy(): void {
  email?.removeEventListener("input", validateEmail)
  password?.removeEventListener("input", validatePassword)
  confirmPassword?.removeEventListener("input", validateConfirmPassword)
}

function validateEmail(): void {
  if (isValidEmail(email!.value)) {
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
  if (isValidPassword(password!.value)) {
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

// TODO on submit, checker si l'email n'est pas deja use
// TODO l'url /auth/register n'est pas accessible (car sur la gateway, pas sur le back du front)
// -> ? faire que le front passe par la gateway
