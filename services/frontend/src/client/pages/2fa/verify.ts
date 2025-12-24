import { FormInputElement } from "../../components/formInput.js"
import { navigate } from "../../persistent/router.js"
import { checkEls, getUser, post, reportFormValidationErrors, setUser, showNotify } from "../../utils.js"

let els: {
  form: HTMLFormElement
  totpFormInput: FormInputElement
}

let email = ""

export function onGuard(route: string): boolean {
  email = new URLSearchParams(route.split("?")[1]).get("email") || ""
  return !getUser() && !!email
}

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
    totpFormInput: document.querySelector("form-input[name='totp']")!,
  }
  checkEls(els)

  els.totpFormInput.addEventListener("input", onTotpInput)
  els.form.addEventListener("submit", onSubmit)
}

function onTotpInput(): void {
  if (els.totpFormInput.value.length === 6)
    els.form.requestSubmit()
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  const data = await post("/api/user/2fa/verify", {
    totp: els.totpFormInput.value,
    email,
  })
  if (data[200]) {
    setUser(data[200].user)
    navigate("/", "2FA verification successful")
  } else if (data[400])
    reportFormValidationErrors(els.form, data[400].details)
  else if (data[401])
    navigate("/login", "Session expired, please log in again", "warning")
  else if (data[403])
    showNotify("Invalid 2FA code", "error")
  else if (data[404])
    navigate("/", "2FA is not enabled on your account", "error")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
