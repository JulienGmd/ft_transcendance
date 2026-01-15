import { FormInputElement } from "../../components/formInput.js"
import { navigate } from "../../persistent/router.js"
import { checkEls, getUser, post, reportFormValidationErrors, setUser, showNotify } from "../../utils.js"

let els: {
  form: HTMLFormElement
  qrcodeImg: HTMLImageElement
  secretEl: HTMLElement
  totpFormInput: FormInputElement
}

let secretKey = ""

export function onGuard(route: string): boolean {
  const user = getUser()
  return !!user && !user.twofa_enabled
}

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
    qrcodeImg: document.querySelector("#qrcode-img")!,
    secretEl: document.querySelector("#secret")!,
    totpFormInput: document.querySelector("form-input[name='totp']")!,
  }
  checkEls(els)

  setupPage()

  els.totpFormInput.addEventListener("input", onTotpInput)
  els.form.addEventListener("submit", onSubmit)
}

async function setupPage(): Promise<void> {
  let data = await post("/api/user/2fa/setup", {})
  if (data[200]) {
    secretKey = data[200].secret
    els.secretEl.textContent = data[200].secret
    els.qrcodeImg.src = data[200].qrCode
  } else if (data[401])
    navigate("/login", "Session expired. Please log in again.", "warning")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}

function onTotpInput(): void {
  if (els.totpFormInput.value.length === 6)
    els.form.requestSubmit()
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  const data = await post("/api/user/2fa/enable", {
    secret: secretKey,
    totp: els.totpFormInput.value,
  })
  if (data[200]) {
    setUser(data[200].user)
    navigate("/", "2FA enabled successfully")
  } else if (data[400])
    reportFormValidationErrors(els.form, data[400].details)
  else if (data[401])
    navigate("/login", "Session expired, please log in again", "warning")
  else if (data[403])
    showNotify("Invalid 2FA code", "error")
  else if (data[429])
    showNotify("Too many tries, try again later", "error")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
