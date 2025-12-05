import { navigate } from "../persistent/router.js"

// TODO import from shared types
interface UserData {
  id: number
  email: string
  username?: string | null
  avatar?: string | null
  google_id?: string | null
}

const loginLink = document.querySelector("#header-login") as HTMLAnchorElement | null
const profileContainer = document.querySelector("#header-profile-container") as HTMLDivElement | null
const avatarImg = document.querySelector("#header-avatar-img") as HTMLImageElement | null
const avatarLetter = document.querySelector("#header-avatar-letter") as HTMLSpanElement | null
const logoutBtn = document.querySelector("#header-logout-btn") as HTMLButtonElement | null

logoutBtn?.addEventListener("click", logout)

// If logged in, show profile else show login

// TODO causing 502 if not logged in.
// -> Add bool IsLoggedIn to localStorage ?
// -> or check cookie ?
const response = await fetch("/auth/me", { credentials: "include" })

if (response.ok) {
  const data = await response.json()
  const userData: UserData = data.user

  if (userData.avatar) {
    avatarImg!.src = userData.avatar
    avatarImg?.classList.remove("hidden")
  } else if (userData.username) {
    avatarLetter!.textContent = userData.username.charAt(0).toUpperCase()
    avatarLetter?.classList.remove("hidden")
  } else {
    avatarLetter!.textContent = userData.email.charAt(0).toUpperCase()
    avatarLetter?.classList.remove("hidden")
  }

  loginLink?.classList.add("hidden")
  profileContainer?.classList.remove("hidden")
} else {
  profileContainer?.classList.add("hidden")
  loginLink?.classList.remove("hidden")
}

async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "include" })
  navigate("/") // Always reload page // TODO this will not refresh the header
}
