import { sleep } from "./utils.js"

interface UserData {
  id: number;
  email: string;
  google_id?: string | null;
}

let logoutBtn: HTMLButtonElement | null = null;

export async function onMount(): Promise<void> {
  // Check if there's a token in URL (from Google OAuth callback)
  const urlParams = new URLSearchParams(window.location.search)
  const tokenFromUrl = urlParams.get('token')
  
  if (tokenFromUrl) {
    // Store the token and clean the URL
    localStorage.setItem("authToken", tokenFromUrl)
    window.history.replaceState({}, document.title, "/home")
  }
  
  // Check for OAuth error
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
  logoutBtn = document.querySelector("#logout-btn")
  
  content?.classList.remove("hidden")
  content?.classList.add("flex")
  
  // Check if user is authenticated
  const token = localStorage.getItem("authToken")
  
  if (token) {
    // User is authenticated - decode token to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userData: UserData = payload
      
      // Display user profile
      if (userEmail && userData.email) {
        userEmail.textContent = userData.email
      }
      
      // Create avatar with first letter of email
      if (userAvatar && userData.email) {
        userAvatar.textContent = userData.email.charAt(0).toUpperCase()
      }
      
      userProfile?.classList.remove("hidden")
      userProfile?.classList.add("flex")
      
      // Add logout event listener
      logoutBtn?.addEventListener("click", handleLogout)
    } catch (error) {
      console.error("Error decoding token:", error)
      // Invalid token, show login
      localStorage.removeItem("authToken")
      loginLink?.classList.remove("hidden")
      loginLink?.classList.add("flex")
    }
  } else {
    // User is not authenticated - show login button
    loginLink?.classList.remove("hidden")
    loginLink?.classList.add("flex")
  }
}

export function onDestroy(): void {
  logoutBtn?.removeEventListener("click", handleLogout)
}

function handleLogout(): void {
  localStorage.removeItem("authToken")
  window.location.reload()
}
