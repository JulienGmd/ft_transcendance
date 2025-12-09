import { navigate } from "../../persistent/router.js"
import { post, validateFormInput } from "../../utils.js"

let form: HTMLFormElement | null = null
let formErrorEl: HTMLElement | null = null
let totpInput: HTMLInputElement | null = null
let totpInputError: HTMLElement | null = null

let secretKey = ""

export async function onMount(): Promise<void> {
  form = document.querySelector("form")
  formErrorEl = document.getElementById("form-error")
  totpInput = document.getElementById("totp-input") as HTMLInputElement | null
  totpInputError = document.getElementById("totp-input-error")

  form?.addEventListener("submit", onSubmit)
  totpInput?.addEventListener("input", validateTotp)

  setupPage()
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  totpInput?.removeEventListener("input", validateTotp)
}

async function setupPage(): Promise<void> {
  let data = await post("/api/user/2fa/setup", {})
  if (!data[200]) {
    console.error("Failed to load 2FA setup data")
    return
  }

  secretKey = data[200].secret

  const qrCodeImg = document.getElementById("qr-code") as HTMLImageElement | null
  const secretEl = document.getElementById("secret-key")

  qrCodeImg!.src = data[200].qrCode
  secretEl!.textContent = data[200].secret
}

function validateTotp(): void {
  validateFormInput(
    totpInput!,
    totpInputError!,
    (value) => value.length === 0 || /^\d{6}$/.test(value),
    "Please enter a valid 6-digit code",
  )
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  const data = await post("/api/user/2fa/enable", {
    secret: secretKey,
    totp: totpInput!.value,
  })
  if (!data[200]) {
    formErrorEl!.textContent = "Failed to enable 2FA. Please check the code and try again."
    formErrorEl?.classList.remove("hidden")
    return
  }

  formErrorEl?.classList.add("hidden")

  navigate("/")
}
