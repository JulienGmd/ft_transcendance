import { isValidEmail, isValidPassword } from "../utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let password: HTMLInputElement | null = null
let confirmPassword: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let passwordError: HTMLElement | null = null
let confirmPasswordError: HTMLElement | null = null
let googleSignupBtn: HTMLButtonElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  password = document.getElementById("password") as HTMLInputElement | null
  confirmPassword = document.getElementById("confirm-password") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  passwordError = document.getElementById("password-error")
  confirmPasswordError = document.getElementById("confirm-password-error")
  googleSignupBtn = document.getElementById("google-signup-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  password?.addEventListener("input", validatePassword)
  confirmPassword?.addEventListener("input", validateConfirmPassword)
  googleSignupBtn?.addEventListener("click", handleGoogleSignup)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  password?.removeEventListener("input", validatePassword)
  confirmPassword?.removeEventListener("input", validateConfirmPassword)
  googleSignupBtn?.removeEventListener("click", handleGoogleSignup)
}

function onSubmit(e: Event): void {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  fetch("auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies
    body: JSON.stringify({
      email: email?.value,
      password: password?.value,
    }),
  }).then((response) => {
    if (response.ok) {
      // Registration successful
      console.log("Registration successful")
      return response.json()
    } else {
      // Registration failed
      console.log("Registration failed")
      throw new Error("Registration failed")
    }
  }).then((data) => {
    // Token is now in cookie
    // Check if user needs to setup profile
    if (data.needsSetup)
      window.location.href = "/setup-profile"
    else
      window.location.href = "/home"
  }).catch((error) => {
    console.error("Error during registration request:", error)
    alert("Registration failed. Please try again.")
  })
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

function handleGoogleSignup(e: Event): void {
  e.preventDefault()
  // Redirect to Google OAuth (same endpoint as login - backend handles create/login automatically)
  window.location.href = "/auth/google"
}
