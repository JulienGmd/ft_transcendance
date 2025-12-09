import { navigate } from "../persistent/router.js"
import { get, post } from "../utils.js"

const loginLink = document.querySelector("#header-login") as HTMLAnchorElement | null
const profileContainer = document.querySelector("#header-profile-container") as HTMLDivElement | null
const avatarImg = document.querySelector("#header-avatar-img") as HTMLImageElement | null
const avatarLetter = document.querySelector("#header-avatar-letter") as HTMLSpanElement | null
const logoutBtn = document.querySelector("#header-logout-btn") as HTMLButtonElement | null

if (!loginLink || !profileContainer || !avatarImg || !avatarLetter || !logoutBtn)
  throw new Error("Header elements not found")

window.addEventListener("pageLoaded", update)
logoutBtn?.addEventListener("click", logout)

export async function update(): Promise<void> {
  const data = await get("/api/user/me")

  if (!data[200]) {
    // Show profile, hide login
    profileContainer?.classList.add("hidden")
    loginLink?.classList.remove("hidden")
    return
  }

  // Show profile, hide login
  const user = data[200].user
  if (user.avatar) {
    avatarImg!.src = user.avatar
    avatarImg?.classList.remove("hidden")
    avatarLetter?.classList.add("hidden")
  } else {
    const letter = user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
    avatarLetter!.textContent = letter
    avatarLetter?.classList.remove("hidden")
    avatarImg?.classList.add("hidden")
  }
  loginLink?.classList.add("hidden")
  profileContainer?.classList.remove("hidden")
}

async function logout(): Promise<void> {
  await post("/api/user/logout", {})
  navigate("/")
}
