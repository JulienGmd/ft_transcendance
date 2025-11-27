let form: HTMLFormElement | null = null
let username: HTMLInputElement | null = null
let usernameError: HTMLElement | null = null
let avatarInput: HTMLInputElement | null = null
let avatarImage: HTMLImageElement | null = null
let avatarLetter: HTMLElement | null = null
let avatarBase64: string | null = null

export async function onMount(): Promise<void> {
  form = document.querySelector("form")
  username = document.getElementById("username") as HTMLInputElement | null
  usernameError = document.getElementById("username-error")
  avatarInput = document.getElementById("avatar-input") as HTMLInputElement | null
  avatarImage = document.getElementById("avatar-image") as HTMLImageElement | null
  avatarLetter = document.getElementById("avatar-letter")

  // Token is now in httpOnly cookie, no need to get it from URL
  // We'll verify authentication by calling /auth/me

  // Verify authentication and load user data
  try {
    const response = await fetch("/auth/me", {
      credentials: 'include' // Important: include cookies
    })
    
    if (!response.ok) {
      // Not authenticated, redirect to login
      window.location.href = "/login"
      return
    }
    
    const data = await response.json()
    const userData = data.user
    
    if (userData.username && username) {
      username.value = userData.username
      // Update avatar letter
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
  } catch (err) {
    console.error("Error loading user data:", err)
    // Error, redirect to login
    window.location.href = "/login"
    return
  }

  form?.addEventListener("submit", onSubmit)
  username?.addEventListener("input", handleUsernameChange)
  avatarInput?.addEventListener("change", handleAvatarChange)
}

export function onDestroy(): void {
  form?.removeEventListener("submit", onSubmit)
  username?.removeEventListener("input", handleUsernameChange)
  avatarInput?.removeEventListener("change", handleAvatarChange)
}

function onSubmit(e: Event): void {
  e.preventDefault()
  e.stopPropagation()

  if (!form?.checkValidity())
    return

  fetch("auth/set-username", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include', // Include cookies
    body: JSON.stringify({
      username: username?.value,
      avatar: avatarBase64,
    }),
  }).then((response) => {
    if (response.ok) {
      console.log("Username set successfully")
      return response.json()
    } else {
      console.log("Username setting failed")
      return response.text().then(text => { throw new Error(text) })
    }
  }).then((data) => {
    // Redirect to home (token is automatically updated in cookie by server)
    window.location.href = "/home"
  }).catch((error) => {
    console.error("Error setting username:", error)
    alert(error.message || "Failed to set username. Please try again.")
  })
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
