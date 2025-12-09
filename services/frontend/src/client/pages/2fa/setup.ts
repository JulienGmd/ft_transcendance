import { FormInputElement } from "../../components/formInput.js"
import { navigate } from "../../persistent/router.js"
import { post } from "../../utils.js"

let form: HTMLFormElement
let qrcodeImg: HTMLImageElement
let secretEl: HTMLElement
let totpFormInput: FormInputElement

let secretKey = ""

export function onMount(): void {
  form = document.querySelector("form")!
  qrcodeImg = document.querySelector("#qrcode-img")!
  secretEl = document.querySelector("#secret")!
  totpFormInput = document.querySelector("#totp-form-input")!

  if (!form || !qrcodeImg || !secretEl || !totpFormInput)
    throw new Error("Elements not found")

  setupPage()

  form.addEventListener("submit", onSubmit)
}

export function onDestroy(): void {
  form.removeEventListener("submit", onSubmit)
}

async function setupPage(): Promise<void> {
  let data = await post("/api/user/2fa/setup", {})
  if (data[200]) {
    secretKey = data[200].secret
    secretEl.textContent = data[200].secret
    qrcodeImg.src = data[200].qrCode
  } else if (data[401])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form.checkValidity())
    return

  const data = await post("/api/user/2fa/enable", {
    secret: secretKey,
    totp: totpFormInput.value,
  })
  if (data[200])
    navigate("/")
  else if (data[400])
    totpFormInput.showError("Code is invalid")
  else if (data[401])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
