import { navigate } from "../persistent/router.js"
import { post, validateFormInput } from "../utils.js"

let form: HTMLFormElement | null = null
let codeInput: HTMLInputElement | null = null
let codeInputError: HTMLElement | null = null

export function onMount(): void {
  form = document.querySelector("form") as HTMLFormElement
  codeInput = document.getElementById("code") as HTMLInputElement
  codeInputError = document.getElementById("code-error") as HTMLElement

  form?.addEventListener("submit", onSubmit)
  codeInput?.addEventListener("input", validateCode)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  codeInput?.removeEventListener("input", validateCode)
}

function validateCode(): void {
  validateFormInput(
    codeInput!,
    codeInputError!,
    (value) => value.length === 0 || /^\d{6}$/.test(value),
    "The code must be a 6-digit number",
  )
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  // note: userId is sent with cookies
  const data = await post("/auth/2fa/login/verify", {
    code: codeInput?.value,
  })
  if (!data) {
    // TODO show red message
    alert("Invalid or expired code. Please try again.")
    return
  }

  // TODO make this more robust, maybe pass the username in signup in the form directly, so we dont need to go to that page.
  // Then we can add 2fa in the profile page
  // if (data.needsSetup)
  //   navigate("/setup-profile")
  // else
  navigate("/home")
}
