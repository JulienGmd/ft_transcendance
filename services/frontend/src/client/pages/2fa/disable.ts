import { navigate } from "../../persistent/router.js"
import { checkEls, getUser, inputsValuesToObject, post, reportFormErrors, setUser } from "../../utils.js"

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
