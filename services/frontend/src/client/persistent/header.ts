import { navigate } from "../persistent/router.js"

// TODO import from shared types
interface UserData {
  id: number
  email: string
  username?: string | null
  avatar?: string | null
  google_id?: string | null
}

let logoutBtn: HTMLButtonElement | null

const loginLink = document.querySelector("#login") as HTMLAnchorElement | null
const profileContainer = document.querySelector("#profile-container") as HTMLDivElement | null
const avatarImg = document.querySelector("#avatar") as HTMLImageElement | null
logoutBtn = document.querySelector("#logout-btn") as HTMLButtonElement | null

logoutBtn?.addEventListener("click", logout)

// If logged in, show profile else show login

// TODO causing 502 if not logged in.
// -> Add bool IsLoggedIn to localStorage ?
// -> or check cookie ?
const response = await fetch("/auth/me", { credentials: "include" })

if (response.ok) {
  const data = await response.json()
  const userData: UserData = data.user

  if (avatarImg && userData.avatar)
    avatarImg.src = userData.avatar

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
