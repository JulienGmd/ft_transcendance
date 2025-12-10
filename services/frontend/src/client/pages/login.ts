import { navigate } from "../persistent/router.js"
import { checkEls, inputsValuesToObject, post, updateFormErrors } from "../utils.js"

let els: {
  form: HTMLFormElement
}

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
  }
  checkEls(els)

  els.form.addEventListener("submit", onSubmit)
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  const data = await post("/api/user/login", inputsValuesToObject(els.form) as any)
  if (data[200])
    navigate("/")
  else if (data[202])
    navigate("/2fa/verify") // TODO email in querystring ? or server cookie ?
  else if (data[400])
    updateFormErrors(els.form, data[400].details, undefined)
  else if (data[401])
    updateFormErrors(els.form, undefined, data[401].message)
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
