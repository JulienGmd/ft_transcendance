import { navigate } from "../persistent/router.js"
import { get, post } from "../utils.js"

const loginEl = document.querySelector("#header-login")!
const profileContainerEl = document.querySelector("#header-profile-container")!
const avatarImg = document.querySelector("#header-avatar-img")! as HTMLImageElement
const avatarLetterEl = document.querySelector("#header-avatar-letter")!
const logoutBtn = document.querySelector("#header-logout-btn")!

if (!loginEl || !profileContainerEl || !avatarImg || !avatarLetterEl || !logoutBtn)
  throw new Error("Header elements not found")

window.addEventListener("pageLoaded", update)
logoutBtn.addEventListener("click", logout)

export async function update(): Promise<void> {
  const data = await get("/api/user/me")

  if (!data[200]) {
    // Show profile, hide login
    profileContainerEl.classList.add("hidden")
    loginEl.classList.remove("hidden")
    return
  }

  // Show profile, hide login
  const user = data[200].user
  if (user.avatar) {
    avatarImg.src = user.avatar
    avatarImg.classList.remove("hidden")
    avatarLetterEl.classList.add("hidden")
  } else {
    const letter = user.username ? user.username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()
    avatarLetterEl.textContent = letter
    avatarLetterEl.classList.remove("hidden")
    avatarImg.classList.add("hidden")
  }
  loginEl.classList.add("hidden")
  profileContainerEl.classList.remove("hidden")
}

async function logout(): Promise<void> {
  await post("/api/user/logout", {})
  navigate("/")
}
