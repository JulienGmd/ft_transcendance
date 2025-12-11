import { navigate } from "../../persistent/router.js"
import {
  checkEls,
  getUser,
  inputsValuesToObject,
  post,
  reportFormValidationErrors,
  setUser,
  showNotify,
} from "../../utils.js"

let els: {
  form: HTMLFormElement
}

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
  }
  checkEls(els)

  const user = getUser()
  if (!user || !user.twofa_enabled) {
    navigate("/")
    return
  }

  els.form.addEventListener("submit", onSubmit)
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  const data = await post("/api/user/2fa/disable", inputsValuesToObject(els.form) as any)
  if (data[200]) {
    setUser(data[200].user)
    navigate("/", "2FA disabled successfully")
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
