import { navigate } from "../persistent/router.js"
import { isValidEmail, post, validateFormInput } from "../utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let password: HTMLInputElement | null = null
let googleBtn: HTMLButtonElement | null = null

// let twoFAState: {
//   userId: number
//   email: string
// } | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  password = document.getElementById("password") as HTMLInputElement | null
  googleBtn = document.getElementById("google-login-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  googleBtn?.addEventListener("click", loginWithGoogle)

  // // Check if we come from OAuth login requiring 2FA
  // const urlParams = new URLSearchParams(window.location.search)
  // const twoFAMethod = urlParams.get("twofa")
  // const userEmail = urlParams.get("email")

  // if (twoFAMethod && userEmail) {
  //   // Init state for 2FA (userId will be retrieved via tempUserId cookie)
  //   twoFAState = {
  //     userId: 0, // Will be retrieved from cookie
  //     email: userEmail,
  //   }
  //   show2FAForm(userEmail)
  // }
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  googleBtn?.removeEventListener("click", loginWithGoogle)
}

function validateEmail(): void {
  validateFormInput(email!, emailError!, (value) => value.length === 0 || isValidEmail(value), "Invalid email format")
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  const data = await post("/auth/login", {
    email: email?.value,
    password: password?.value,
  })
  if (!data) {
    // TODO afficher un message rouge dans le formulaire
    alert("Login failed. Please check your credentials.")
    return
  }

  // // Check if 2FA is required
  // if (data.needsTwoFA) {
  //   twoFAState = {
  //     userId: data.userId,
  //     email: data.email,
  //   }
  //   show2FAForm(data.email)
  //   return
  // }

  // Token is now in cookie
  // TODO make this more robust, maybe pass the username in the form directly, so we dont need to go to that page.
  // Check if user needs to setup profile
  if (data.needsSetup)
    navigate("/setup-profile")
  else
    navigate("/home")
}

// function show2FAForm(userEmail: string): void {
//   // Cacher le formulaire de login
//   const loginCard = document.querySelector(".bg-surface") as HTMLElement
//   if (!loginCard)
//     return

//   // Créer le formulaire 2FA
//   const twoFAForm = document.createElement("div")
//   twoFAForm.className = "bg-surface w-full space-y-8 rounded-2xl p-8 shadow-2xl sm:max-w-96"

//   twoFAForm.innerHTML = `
//     <div class="space-y-2 text-center">
//       <div class="from-primary to-primary-dark mx-auto grid size-16 place-items-center rounded-full bg-linear-to-r shadow-lg">
//         <shield-icon class="size-10"></shield-icon>
//       </div>
//       <h1 class="text-2xl font-bold">Two-Factor Authentication</h1>
//       <p class="text-text-muted">Enter the code from your authenticator app</p>
//     </div>

//     <form id="twofa-form" class="flex flex-col gap-6">
//       <div class="space-y-2">
//         <label for="twofa-code" class="text-sm font-medium">Verification Code</label>
//         <input
//           type="text"
//           id="twofa-code"
//           name="code"
//           placeholder="Enter 6-digit code"
//           required
//           class="w-full rounded-lg border border-surface bg-background/50 px-4 py-3 outline-none focus:border-primary transition"
//           autocomplete="off"
//         />
//       </div>

//       <button type="submit" class="button">Verify</button>

//       <button type="button" id="back-to-login" class="text-text-muted hover:text-primary text-sm transition">
//         Back to login
//       </button>
//     </form>
//   `

//   // Remplacer le formulaire de login par le formulaire 2FA
//   loginCard.replaceWith(twoFAForm)

//   // Ajouter les event listeners
//   const twoFAFormElement = document.getElementById("twofa-form") as HTMLFormElement
//   const backButton = document.getElementById("back-to-login") as HTMLButtonElement

//   twoFAFormElement?.addEventListener("submit", handle2FASubmit)
//   backButton?.addEventListener("click", () => {
//     window.location.href = "/login"
//   })
// }

// async function handle2FASubmit(e: Event): Promise<void> {
//   e.preventDefault()

//   const codeInput = document.getElementById("twofa-code") as HTMLInputElement
//   const code = codeInput?.value

//   if (!code) {
//     alert("Please enter the verification code")
//     return
//   }

//   if (!twoFAState) {
//     alert("Session expired. Please login again.")
//     window.location.href = "/login"
//     return
//   }

//   // Envoyer le code pour validation
//   // Si userId est 0, le serveur utilisera le cookie tempUserId
//   const requestBody: any = {
//     code: code,
//   }

//   // N'envoyer userId que s'il est défini (login classique)
//   if (twoFAState.userId > 0)
//     requestBody.userId = twoFAState.userId

//   const data = await post("/auth/2fa/login/verify", requestBody)
//   if (!data) {
//     alert("Invalid or expired code. Please try again.")
//     return
//   }

//   if (data.success) {
//     if (data.needsSetup)
//       navigate("/setup-profile")
//     else
//       navigate("/home")
//   } else {
//     // TODO ?
//   }
// }

function loginWithGoogle(): void {
  // This will redirect to google OAuth page, so we are about to exit the website,
  // it's fine to do non SPA navigation here.
  window.location.href = "/auth/google"
}
