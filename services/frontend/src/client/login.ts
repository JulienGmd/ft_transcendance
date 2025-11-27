import { isValidEmail } from "./utils.js"

let form: HTMLFormElement | null = null
let email: HTMLInputElement | null = null
let password: HTMLInputElement | null = null
let emailError: HTMLElement | null = null
let googleLoginBtn: HTMLButtonElement | null = null

// Variables pour la 2FA
let twoFAState: {
  userId: number;
  email: string;
} | null = null

export function onMount(): void {
  form = document.querySelector("form")
  email = document.getElementById("email") as HTMLInputElement | null
  password = document.getElementById("password") as HTMLInputElement | null
  emailError = document.getElementById("email-error")
  googleLoginBtn = document.getElementById("google-login-btn") as HTMLButtonElement | null

  form?.addEventListener("submit", onSubmit)
  email?.addEventListener("input", validateEmail)
  googleLoginBtn?.addEventListener("click", handleGoogleLogin)
  
  // Vérifier si on revient d'un OAuth avec 2FA
  const urlParams = new URLSearchParams(window.location.search)
  const twoFAMethod = urlParams.get('twofa')
  const userEmail = urlParams.get('email')
  
  if (twoFAMethod && userEmail) {
    // Initialiser le state pour OAuth (userId sera récupéré via le cookie tempUserId)
    twoFAState = {
      userId: 0, // Sera envoyé depuis le cookie côté serveur
      email: userEmail
    }
    show2FAForm(userEmail)
  }
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  email?.removeEventListener("input", validateEmail)
  googleLoginBtn?.removeEventListener("click", handleGoogleLogin)
}

function onSubmit(e: Event): void {
  e.preventDefault()
  e.stopPropagation()
  
  // Doesn't seems to be necessary because the browser seems to call form.checkValidity() before firing the submit event
  if (!form?.checkValidity())
    return

  // Check email and password are valid -> do the login request
  fetch("auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include', // Include cookies
    body: JSON.stringify({
      email: email?.value,
      password: password?.value,
    }),
  }).then((response) => {
    if (response.ok) {
      // Login successful
      console.log("Login successful")
      return response.json()
    } else {
      // Login failed
      console.log("Login failed")
      throw new Error("Login failed")
    }
  }).then((data) => {
    // Vérifier si 2FA est nécessaire
    if (data.needsTwoFA) {
      console.log("2FA required (TOTP)")
      twoFAState = {
        userId: data.userId,
        email: data.email
      }
      show2FAForm(data.email)
      return
    }
    
    // Token is now in cookie
    // Check if user needs to setup profile
    if (data.needsSetup) {
      window.location.href = "/setup-profile"
    } else {
      window.location.href = "/home"
    }
  }).catch((error) => {
    console.error("Error during login request:", error)
    // Show error message to user
    alert("Login failed. Please check your credentials.")
  })
}

function show2FAForm(userEmail: string): void {
  // Cacher le formulaire de login
  const loginCard = document.querySelector('.bg-surface') as HTMLElement
  if (!loginCard) return
  
  // Créer le formulaire 2FA
  const twoFAForm = document.createElement('div')
  twoFAForm.className = 'bg-surface w-full space-y-8 rounded-2xl p-8 shadow-2xl sm:max-w-96'
  
  twoFAForm.innerHTML = `
    <div class="space-y-2 text-center">
      <div class="from-primary to-primary-dark mx-auto grid size-16 place-items-center rounded-full bg-linear-to-r shadow-lg">
        <shield-icon class="size-10"></shield-icon>
      </div>
      <h1 class="text-2xl font-bold">Two-Factor Authentication</h1>
      <p class="text-text-muted">Enter the code from your authenticator app</p>
    </div>
    
    <form id="twofa-form" class="flex flex-col gap-6">
      <div class="space-y-2">
        <label for="twofa-code" class="text-sm font-medium">Verification Code</label>
        <input 
          type="text" 
          id="twofa-code" 
          name="code" 
          placeholder="Enter 6-digit code"
          required
          class="w-full rounded-lg border border-surface bg-background/50 px-4 py-3 outline-none focus:border-primary transition"
          autocomplete="off"
        />
      </div>
      
      <button type="submit" class="button">Verify</button>
      
      <button type="button" id="back-to-login" class="text-text-muted hover:text-primary text-sm transition">
        Back to login
      </button>
    </form>
  `
  
  // Remplacer le formulaire de login par le formulaire 2FA
  loginCard.replaceWith(twoFAForm)
  
  // Ajouter les event listeners
  const twoFAFormElement = document.getElementById('twofa-form') as HTMLFormElement
  const backButton = document.getElementById('back-to-login') as HTMLButtonElement
  
  twoFAFormElement?.addEventListener('submit', handle2FASubmit)
  backButton?.addEventListener('click', () => {
    window.location.href = '/login'
  })
}

function handle2FASubmit(e: Event): void {
  e.preventDefault()
  
  const codeInput = document.getElementById('twofa-code') as HTMLInputElement
  const code = codeInput?.value
  
  if (!code) {
    alert('Please enter the verification code')
    return
  }
  
  if (!twoFAState) {
    alert('Session expired. Please login again.')
    window.location.href = '/login'
    return
  }
  
  // Envoyer le code pour validation
  // Si userId est 0, le serveur utilisera le cookie tempUserId
  const requestBody: any = {
    code: code,
  }
  
  // N'envoyer userId que s'il est défini (login classique)
  if (twoFAState.userId > 0) {
    requestBody.userId = twoFAState.userId
  }
  
  fetch('/auth/2fa/login/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(requestBody),
  }).then((response) => {
    if (response.ok) {
      return response.json()
    } else {
      throw new Error('Invalid 2FA code')
    }
  }).then((data) => {
    if (data.success) {
      // 2FA validé, rediriger
      if (data.needsSetup) {
        window.location.href = '/setup-profile'
      } else {
        window.location.href = '/home'
      }
    }
  }).catch((error) => {
    console.error('2FA verification failed:', error)
    alert('Invalid or expired code. Please try again.')
  })
}

function validateEmail(): void {
  if (email?.value.length === 0 || isValidEmail(email!.value)) {
    email?.setCustomValidity("")
    emailError!.textContent = ""
    emailError!.classList.add("hidden")
  } else {
    email?.setCustomValidity("Invalid email format")
    emailError!.textContent = "Invalid email format"
    emailError!.classList.remove("hidden")
  }
}

function handleGoogleLogin(e: Event): void {
  e.preventDefault()
  // Redirect to Google OAuth
  window.location.href = "/auth/google"
}
