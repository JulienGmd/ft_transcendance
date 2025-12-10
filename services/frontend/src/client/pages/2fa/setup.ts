import { FormInputElement } from "../../components/formInput.js"
import { navigate } from "../../persistent/router.js"
import { checkEls, post, setUser, updateFormErrors } from "../../utils.js"

let els: {
  form: HTMLFormElement
  qrcodeImg: HTMLImageElement
  secretEl: HTMLElement
  totpFormInput: FormInputElement
}

let secretKey = ""

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
    qrcodeImg: document.querySelector("#qrcode-img")!,
    secretEl: document.querySelector("#secret")!,
    totpFormInput: document.querySelector("form-input[name='totp']")!,
  }
  checkEls(els)

  setupPage()

  els.form.addEventListener("submit", onSubmit)
}

async function setupPage(): Promise<void> {
  let data = await post("/api/user/2fa/setup", {})
  if (data[200]) {
    secretKey = data[200].secret
    els.secretEl.textContent = data[200].secret
    els.qrcodeImg.src = data[200].qrCode
  } else if (data[401])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  const data = await post("/api/user/2fa/enable", {
    secret: secretKey,
    totp: els.totpFormInput.value,
  })
  if (data[200]) {
    setUser(data[200].user) // TODO
    navigate("/")
  } else if (data[400])
    updateFormErrors(els.form, data[400].details, undefined)
  else if (data[401])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
