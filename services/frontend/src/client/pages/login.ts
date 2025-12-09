import { FormInputElement } from "../components/formInput.js"
import { navigate } from "../persistent/router.js"
import { post } from "../utils.js"

let form: HTMLFormElement
let formError: HTMLElement
let emailFormInput: FormInputElement
let passwordFormInput: FormInputElement
let googleBtn: HTMLButtonElement

export function onMount(): void {
  form = document.querySelector("form")!
  formError = document.querySelector("#form-error")!
  emailFormInput = document.querySelector("#email-form-input")!
  passwordFormInput = document.querySelector("#password-form-input")!
  googleBtn = document.querySelector("#google-btn")!

  if (!form || !formError || !emailFormInput || !passwordFormInput || !googleBtn)
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

  const data = await post("/api/user/login", {
    email: emailFormInput.value,
    password: passwordFormInput.value,
  })
  if (data[200])
    navigate("/home")
  else if (data[202])
    navigate("/2fa/verify") // TODO email in querystring ? or server cookie ?
  else if (data[400]) {
    emailFormInput.clearError()
    passwordFormInput.clearError()
    for (const detail of data[400].details) {
      if (detail.field === "email")
        emailFormInput.showError(detail.message)
      if (detail.field === "password")
        passwordFormInput.showError(detail.message)
    }
  } else if (data[401]) {
    formError.textContent = data[401].message
    formError.classList.remove("hidden")
  } else {
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
  }
}

function loginWithGoogle(): void {
  // This will redirect to google OAuth page, so we are about to exit the website,
  // it's fine to do non SPA navigation here.
  window.location.href = "/auth/google"
}
