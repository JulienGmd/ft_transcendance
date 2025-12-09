import { navigate } from "../persistent/router.js"
import { get, post } from "../utils.js"

const loginLink = document.querySelector("#header-login") as HTMLAnchorElement | null
const profileContainer = document.querySelector("#header-profile-container") as HTMLDivElement | null
const avatarImg = document.querySelector("#header-avatar-img") as HTMLImageElement | null
const avatarLetter = document.querySelector("#header-avatar-letter") as HTMLSpanElement | null
const logoutBtn = document.querySelector("#header-logout-btn") as HTMLButtonElement | null

logoutBtn?.addEventListener("click", logout)
window.addEventListener("pageLoaded", update)

// Show profile button or login link
export async function update(): Promise<void> {
  const data = await get("/api/user/me")

  if (!data[200]) {
    profileContainer?.classList.add("hidden")
    loginLink?.classList.remove("hidden")
    return
  }

  const user = data[200].user

  if (user.avatar) {
    avatarImg!.src = user.avatar
    avatarImg?.classList.remove("hidden")
  } else if (user.username) {
    avatarLetter!.textContent = user.username.charAt(0).toUpperCase()
    avatarLetter?.classList.remove("hidden")
  } else {
    avatarLetter!.textContent = user.email.charAt(0).toUpperCase()
    avatarLetter?.classList.remove("hidden")
  }

  loginLink?.classList.add("hidden")
  profileContainer?.classList.remove("hidden")
}

async function logout(): Promise<void> {
  await post("/api/user/logout", {})
  navigate("/")
}
