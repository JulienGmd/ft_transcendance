import { sleep } from "./utils.js"

interface UserData {
  id: number;
  email: string;
  username?: string | null;
  avatar?: string | null;
  google_id?: string | null;
}

let logoutBtn: HTMLButtonElement | null = null;
let editProfileBtn: HTMLButtonElement | null = null;

export async function onMount(): Promise<void> {
  // Check for OAuth error
  const urlParams = new URLSearchParams(window.location.search)
  const error = urlParams.get('error')
  if (error === 'oauth_failed') {
    alert('Google authentication failed. Please try again.')
    window.history.replaceState({}, document.title, "/home")
  }
  
  await sleep(5000)
  const content = document.querySelector("#content")
  const loginLink = document.querySelector("#login-link")
  const userProfile = document.querySelector("#user-profile")
  const userEmail = document.querySelector("#user-email")
  const userAvatar = document.querySelector("#user-avatar")
  const avatarContainer = document.querySelector("#avatar-container")
  logoutBtn = document.querySelector("#logout-btn")
  editProfileBtn = document.querySelector("#edit-profile-btn")
  
  content?.classList.remove("hidden")
  content?.classList.add("flex")
  
  // Check if user is authenticated by calling the API (cookie will be sent automatically)
  try {
    const response = await fetch("/auth/me", {
      credentials: 'include' // Important: include cookies
    })
    
    if (!response.ok) {
      throw new Error("Not authenticated")
    }
    
    const data = await response.json()
    const userData: UserData = data.user
    
    // Display username or email
    if (userEmail) {
      userEmail.textContent = userData.username || userData.email
    }
    
    // Display avatar
    if (avatarContainer && userData.avatar) {
      // User has custom avatar
      avatarContainer.innerHTML = `<img src="${userData.avatar}" class="h-10 w-10 rounded-full object-cover" alt="Avatar">`
    } else if (userAvatar) {
      // Display first letter of username or email
      const displayName = userData.username || userData.email
      userAvatar.textContent = displayName.charAt(0).toUpperCase()
    }
    
    userProfile?.classList.remove("hidden")
    userProfile?.classList.add("flex")
    
    // Add event listeners
    logoutBtn?.addEventListener("click", handleLogout)
    editProfileBtn?.addEventListener("click", handleEditProfile)
  } catch (error) {
    console.error("Error fetching user info:", error)
    // Not authenticated - show login button
    loginLink?.classList.remove("hidden")
    loginLink?.classList.add("flex")
  }
}

export function onDestroy(): void {
  logoutBtn?.removeEventListener("click", handleLogout)
  editProfileBtn?.removeEventListener("click", handleEditProfile)
}

function handleLogout(): void {
  // Call logout endpoint to clear cookie
  fetch("/auth/logout", {
    method: "POST",
    credentials: 'include'
  }).then(() => {
    window.location.reload()
  }).catch(() => {
    // Even if request fails, reload the page
    window.location.reload()
  })
}

function handleEditProfile(): void {
  window.location.href = `/setup-profile`
}
