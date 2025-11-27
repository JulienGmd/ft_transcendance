let form: HTMLFormElement | null = null
let username: HTMLInputElement | null = null
let usernameError: HTMLElement | null = null
let avatarInput: HTMLInputElement | null = null
let avatarImage: HTMLImageElement | null = null
let avatarLetter: HTMLElement | null = null
let avatarBase64: string | null = null

let twofaCheckbox: HTMLInputElement | null = null
let qrContainer: HTMLElement | null = null
let totpVerifyInput: HTMLInputElement | null = null
let qrCodeImg: HTMLImageElement | null = null
let totpSecretCode: HTMLElement | null = null

let totpSecret: string | null = null
let currentTwofa: boolean = false
let initialTwofaState: boolean = false // État initial de la 2FA
let isDisabling2FA: boolean = false // Pour savoir si on désactive la 2FA

export async function onMount(): Promise<void> {
  form = document.querySelector("form")
  username = document.getElementById("username") as HTMLInputElement | null
  usernameError = document.getElementById("username-error")
  avatarInput = document.getElementById("avatar-input") as HTMLInputElement | null
  avatarImage = document.getElementById("avatar-image") as HTMLImageElement | null
  avatarLetter = document.getElementById("avatar-letter")
  
  twofaCheckbox = document.getElementById("enable-2fa") as HTMLInputElement | null
  qrContainer = document.getElementById("qr-container")
  totpVerifyInput = document.getElementById("totp_verify") as HTMLInputElement | null
  qrCodeImg = document.getElementById("qr-code") as HTMLImageElement | null
  totpSecretCode = document.getElementById("totp-secret")

  // Verify authentication and load user data
  try {
    const response = await fetch("/auth/me", {
      credentials: 'include'
    })
    
    if (!response.ok) {
      window.location.href = "/login"
      return
    }
    
    const data = await response.json()
    const userData = data.user
    
    if (userData.username && username) {
      username.value = userData.username
      if (avatarLetter) {
        avatarLetter.textContent = userData.username.charAt(0).toUpperCase()
      }
    }
    if (userData.avatar && avatarImage && avatarLetter) {
      avatarBase64 = userData.avatar
      avatarImage.src = userData.avatar
      avatarImage.classList.remove("hidden")
      avatarLetter.classList.add("hidden")
    }
    
    // Charger l'état de la 2FA
    if (userData.twofa_enabled && twofaCheckbox) {
      twofaCheckbox.checked = true
      currentTwofa = true
      initialTwofaState = true
    }
  } catch (err) {
    console.error("Error loading user data:", err)
    window.location.href = "/login"
    return
  }

  form?.addEventListener("submit", onSubmit)
  username?.addEventListener("input", handleUsernameChange)
  avatarInput?.addEventListener("change", handleAvatarChange)
  twofaCheckbox?.addEventListener("change", handle2FAToggle)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  username?.removeEventListener("input", handleUsernameChange)
  avatarInput?.removeEventListener("change", handleAvatarChange)
  twofaCheckbox?.removeEventListener("change", handle2FAToggle)
}

async function handle2FAToggle(e: Event): Promise<void> {
  const target = e.target as HTMLInputElement
  currentTwofa = target.checked
  
  // Déterminer si on est en train de désactiver la 2FA
  isDisabling2FA = initialTwofaState && !currentTwofa
  
  // Hide/show QR container and remove/add required
  if (totpVerifyInput) totpVerifyInput.removeAttribute('required')
  qrContainer?.classList.add("hidden")
  
  if (currentTwofa && !initialTwofaState) {
    // Activer la 2FA : générer un nouveau secret TOTP et QR code
    try {
      const response = await fetch("/auth/2fa/setup", {
        method: "POST",
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error("Failed to setup 2FA")
      
      const data = await response.json()
      totpSecret = data.secret
      
      if (qrCodeImg) qrCodeImg.src = data.qrCode
      if (totpSecretCode) totpSecretCode.textContent = data.secret
      
      qrContainer?.classList.remove("hidden")
      if (totpVerifyInput) totpVerifyInput.setAttribute('required', 'required')
    } catch (error) {
      console.error("Error setting up TOTP:", error)
      alert("Failed to setup authenticator app. Please try again.")
      // Reset checkbox
      if (twofaCheckbox) twofaCheckbox.checked = false
      currentTwofa = false
    }
  } else if (isDisabling2FA) {
    // Désactiver la 2FA : pas besoin de code de vérification
    console.log("Disabling 2FA...")
  }
  // Si currentTwofa && initialTwofaState : l'utilisateur garde la 2FA activée, ne rien faire
}

async function onSubmit(e: Event): Promise<void> {
  e.preventDefault()
  e.stopPropagation()

  if (!form?.checkValidity()) return

  // Validate 2FA specific fields - seulement si on active une nouvelle 2FA
  if (currentTwofa && !initialTwofaState && (!totpVerifyInput?.value || totpVerifyInput.value.trim() === "")) {
    alert("Please enter the 6-digit code from your authenticator app")
    return
  }

  const requestBody: any = {
    username: username?.value,
    avatar: avatarBase64,
  }

  // Gérer les différents cas de 2FA
  if (currentTwofa && !initialTwofaState) {
    // Cas 1 : Activer la 2FA (nouvelle activation)
    requestBody.totp_secret = totpSecret
    requestBody.totp_code = totpVerifyInput?.value
  } else if (isDisabling2FA) {
    // Cas 2 : Désactiver la 2FA
    requestBody.disable_2fa = true
  }
  // Cas 3 : Garder la 2FA activée (currentTwofa && initialTwofaState) - ne rien ajouter

  try {
    const response = await fetch("auth/set-username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || "Failed to set username")
    }
    
    const data = await response.json()
    window.location.href = "/home"
  } catch (error: any) {
    console.error("Error setting username:", error)
    alert(error.message || "Failed to set username. Please try again.")
  }
}

function handleAvatarChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  // Check file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert("Image must be less than 2MB")
    input.value = ""
    return
  }
  
  // Check file type
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file")
    input.value = ""
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    avatarBase64 = result
    
    // Show preview
    if (avatarImage && avatarLetter) {
      avatarImage.src = result
      avatarImage.classList.remove("hidden")
      avatarLetter.classList.add("hidden")
    }
  }
  reader.readAsDataURL(file)
}

function handleUsernameChange(): void {
  validateUsername()
  
  // Update avatar letter if no image
  if (!avatarBase64 && avatarLetter && username?.value) {
    avatarLetter.textContent = username.value.charAt(0).toUpperCase()
  }
}

function validateUsername(): void {
  const value = username?.value || ""
  
  if (value.length === 0) {
    username?.setCustomValidity("")
    usernameError!.textContent = ""
    usernameError!.classList.add("hidden")
    return
  }
  
  if (value.length < 3 || value.length > 20) {
    username?.setCustomValidity("Username must be between 3 and 20 characters")
    usernameError!.textContent = "Username must be between 3 and 20 characters"
    usernameError!.classList.remove("hidden")
    return
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    username?.setCustomValidity("Username can only contain letters, numbers, and underscores")
    usernameError!.textContent = "Username can only contain letters, numbers, and underscores"
    usernameError!.classList.remove("hidden")
    return
  }
  
  username?.setCustomValidity("")
  usernameError!.textContent = ""
  usernameError!.classList.add("hidden")
}
