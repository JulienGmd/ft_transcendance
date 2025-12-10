import { FormInputElement } from "../../components/formInput.js"
import { navigate } from "../../persistent/router.js"
import { checkEls, getUser, post, reportFormErrors, setUser } from "../../utils.js"

let els: {
  form: HTMLFormElement
  totpFormInput: FormInputElement
}

let email = ""

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
    totpFormInput: document.querySelector("form-input[name='totp']")!,
  }
  checkEls(els)

  if (getUser()) {
    navigate("/")
    return
  }

  email = new URLSearchParams(window.location.search).get("email") || ""
  if (!email) {
    navigate("/login")
    return
  }

  els.form.addEventListener("submit", onSubmit)
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
    navigate("/")
  } else if (data[400])
    reportFormErrors(els.form, data[400].details, undefined)
  else if (data[401])
    reportFormErrors(els.form, [{ field: "totp", message: data[401].message }], undefined)
  else if (data[404])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
