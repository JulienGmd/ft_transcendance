import { isValidEmail } from "./utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let password: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let googleLoginBtn: HTMLButtonElement | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  password = document.getElementById("password") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  googleLoginBtn = document.getElementById("google-login-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  googleLoginBtn?.addEventListener("click", handleGoogleLogin)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  googleLoginBtn?.removeEventListener("click", handleGoogleLogin)
}

function onSubmit(e: Event): void {
  e.preventDefault()
  e.stopPropagation()
  
  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  // Check email and password are valid -> do the login request
  fetch("auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email?.value,
      password: password?.value,
    }),
  }).then((response) => {
    if (response.ok) {
      // Login successful
      console.log("Login successful")
      return response.json()
    } else {
      // Login failed
      console.log("Login failed")
      throw new Error("Login failed")
    }
  }).then((data) => {
    // Store the token and redirect to home
    if (data.token) {
      localStorage.setItem("authToken", data.token)
      window.location.href = "/home"
    }
  }).catch((error) => {
    console.error("Error during login request:", error)
    // Show error message to user
    alert("Login failed. Please check your credentials.")
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

function handleGoogleLogin(e: Event): void {
  e.preventDefault()
  // Redirect to Google OAuth
  window.location.href = "/auth/google"
}
