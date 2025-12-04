import { navigate } from "../persistent/router.js"
import { isValidEmail, isValidPassword, post, validateFormInput } from "../utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let password: HTMLInputElement | null = null
let passwordError: HTMLElement | null = null
let confirmPassword: HTMLInputElement | null = null
let confirmPasswordError: HTMLElement | null = null
let googleBtn: HTMLButtonElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  password = document.getElementById("password") as HTMLInputElement | null
  passwordError = document.getElementById("password-error")
  confirmPassword = document.getElementById("confirm-password") as HTMLInputElement | null
  confirmPasswordError = document.getElementById("confirm-password-error")
  googleBtn = document.getElementById("google-signup-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  password?.addEventListener("input", validatePassword)
  confirmPassword?.addEventListener("input", validateConfirmPassword)
  googleBtn?.addEventListener("click", loginWithGoogle)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  password?.removeEventListener("input", validatePassword)
  confirmPassword?.removeEventListener("input", validateConfirmPassword)
  googleBtn?.removeEventListener("click", loginWithGoogle)
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
    email: email?.value,
    password: password?.value,
  })
  if (!data) {
    // TODO afficher un message rouge dans le formulaire
    alert("Registration failed. Please try again.")
    return
  }

  // Token is now in cookie
  // Check if user needs to setup profile
  // TODO make this more robust, maybe pass the username in the form directly, so we dont need to go to that page.
  if (data.needsSetup)
    navigate("/setup-profile")
  else
    navigate("/home")
}

function loginWithGoogle(e: Event): void {
  // This will redirect to google OAuth page, so we are about to exit the website,
  // it's fine to do non SPA navigation here.
  window.location.href = "/auth/google"
}
