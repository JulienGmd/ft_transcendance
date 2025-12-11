import { FormInputElement } from "../components/formInput.js"
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
  passwordFormInput: FormInputElement
  confirmPasswordFormInput: FormInputElement
  googleBtn: HTMLButtonElement
}

export function onMount(): void {
  els = {
    form: document.querySelector("form")!,
    passwordFormInput: document.querySelector("form-input[name='password']")!,
    confirmPasswordFormInput: document.querySelector("form-input[name='confirmPassword']")!,
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

  if (els.passwordFormInput.value !== els.confirmPasswordFormInput.value) {
    els.confirmPasswordFormInput.showError("Passwords do not match")
    return
  }

  const data = await post("/api/user/register", inputsValuesToObject(els.form) as any)
  if (data[200]) {
    setUser(data[200].user)
    navigate("/", "Registration successful")
  } else if (data[400])
    reportFormValidationErrors(els.form, data[400].details)
  else if (data[409])
    showNotify(data[409].message, "error")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
