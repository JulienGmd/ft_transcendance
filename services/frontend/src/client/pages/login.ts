import { navigate } from "../persistent/router.js"
import {
  checkEls,
  get,
  getUser,
  inputsValuesToObject,
  post,
  reportFormValidationErrors,
  setUser,
  showNotify,
} from "../utils.js"

let els: {
  form: HTMLFormElement
  googleBtn: HTMLButtonElement
}

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
    googleBtn: document.querySelector("#google-btn")!,
  }
  checkEls(els)

  if (getUser()) {
    navigate("/")
    return
  }

  els.form.addEventListener("submit", onSubmit)
  els.googleBtn.addEventListener("click", onGoogleBtnClick)
}

async function onGoogleBtnClick(): Promise<void> {
  const data = await get("/api/user/google")
  if (data[200])
    window.location.href = data[200].url
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  const data = await post("/api/user/login", inputsValuesToObject(els.form) as any)
  if (data[200]) {
    setUser(data[200].user)
    navigate("/", "Login successful")
  } else if (data[202])
    navigate(`/2fa/verify?email=${encodeURIComponent(data[202].email)}`)
  else if (data[400])
    reportFormValidationErrors(els.form, data[400].details)
  else if (data[401])
    showNotify("Invalid email or password", "error")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
