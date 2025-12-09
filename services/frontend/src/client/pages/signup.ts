import { FormInputElement } from "../components/formInput.js"
import { navigate } from "../persistent/router.js"
import { post } from "../utils.js"

// TODO il faut un validator client side pour confirmPassword

let form: HTMLFormElement
let usernameFormInput: FormInputElement
let emailFormInput: FormInputElement
let passwordFormInput: FormInputElement
let confirmPasswordFormInput: FormInputElement
let googleBtn: HTMLButtonElement

export function onMount(): void {
  form = document.querySelector("form")!
  usernameFormInput = document.querySelector("#username-form-input")!
  emailFormInput = document.querySelector("#email-form-input")!
  passwordFormInput = document.querySelector("#password-form-input")!
  confirmPasswordFormInput = document.querySelector("#confirm-password-form-input")!
  googleBtn = document.querySelector("#google-btn")!

  if (!form || !usernameFormInput || !emailFormInput || !passwordFormInput || !confirmPasswordFormInput || !googleBtn)
    throw new Error("Elements not found")

  form.addEventListener("submit", onSubmit)
  googleBtn.addEventListener("click", loginWithGoogle)
}

export function onDestroy(): void {
  form.removeEventListener("submit", onSubmit)
  googleBtn.removeEventListener("click", loginWithGoogle)
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form.checkValidity())
    return

  const data = await post("/api/user/register", {
    username: usernameFormInput.value,
    email: emailFormInput.value,
    password: passwordFormInput.value,
  })
  if (data[200])
    navigate("/")
  else if (data[400]) {
    usernameFormInput.clearError()
    emailFormInput.clearError()
    passwordFormInput.clearError()
    for (const detail of data[400].details) {
      if (detail.field === "username")
        usernameFormInput.showError(detail.message)
      if (detail.field === "email")
        emailFormInput.showError(detail.message)
      if (detail.field === "password")
        passwordFormInput.showError(detail.message)
    }
  } else if (data[409]) {
    usernameFormInput.clearError()
    emailFormInput.clearError()
    passwordFormInput.clearError()
    if (data[409].message.includes("username"))
      usernameFormInput.showError(data[409].message)
    if (data[409].message.includes("email"))
      emailFormInput.showError(data[409].message)
  } else {
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
  }
}

function loginWithGoogle(e: Event): void {
  // This will redirect to google OAuth page, so we are about to exit the website,
  // it's fine to do non SPA navigation here.
  window.location.href = "/auth/google"
}
