import { navigate } from "../../persistent/router.js"
import { post, validateFormInput } from "../../utils.js"

// TODO rediriger si deja co ?

let email: string = ""

let form: HTMLFormElement | null = null
let formError: HTMLElement | null = null
let totpInput: HTMLInputElement | null = null
let totpInputError: HTMLElement | null = null

export function onMount(): void {
  form = document.querySelector("form") as HTMLFormElement
  formError = document.getElementById("form-error")
  totpInput = document.getElementById("totp-input") as HTMLInputElement
  totpInputError = document.getElementById("totp-input-error") as HTMLElement

  const params = new URLSearchParams(window.location.search)
  email = params.get("email") || ""
  if (!email) {
    navigate("/login")
    return
  }

  form?.addEventListener("submit", onSubmit)
  totpInput?.addEventListener("input", validateTotp)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  totpInput?.removeEventListener("input", validateTotp)
}

function validateTotp(): void {
  validateFormInput(
    totpInput!,
    totpInputError!,
    (value) => value.length === 0 || /^\d{6}$/.test(value),
    "The code must be a 6-digit number",
  )
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  const data = await post("/api/user/2fa/verify", {
    email,
    totp: totpInput!.value,
  })
  if (!data[200]) {
    formError!.textContent = "The code is invalid. Please try again."
    formError?.classList.remove("hidden")
    return
  }

  formError?.classList.add("hidden")

  navigate("/home")
}
