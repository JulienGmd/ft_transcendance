import { FormInputElement } from "../../components/formInput.js"
import { navigate } from "../../persistent/router.js"
import { post } from "../../utils.js"

let form: HTMLFormElement
let totpFormInput: FormInputElement

let email: string = ""

export function onMount(): void {
  form = document.querySelector("form")!
  totpFormInput = document.querySelector("#totp-form-input")!

  if (!form || !totpFormInput) {
    console.log(form, totpFormInput)

    throw new Error("Elements not found")
  }

  const params = new URLSearchParams(window.location.search) // TODO server cookie 5min ? maybe user can bypass login if he have email + app
  email = params.get("email") || ""
  if (!email) {
    navigate("/login")
    return
  }

  form.addEventListener("submit", onSubmit)
}

export function onDestroy(): void {
  form.removeEventListener("submit", onSubmit)
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form.checkValidity())
    return

  const data = await post("/api/user/2fa/verify", {
    email,
    totp: totpFormInput.value,
  })
  if (data[200])
    navigate("/home")
  else if (data[400])
    totpFormInput.showError("Code is invalid")
  else if (data[401] || data[404])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
