import type { UserAvatarElement } from "../components/userAvatar.js"
import { navigate } from "../persistent/router.js"
import { get, post } from "../utils.js"

const loginEl = document.querySelector("#header-login")!
const avatar = document.querySelector("#header-user-avatar") as UserAvatarElement
const profileContainerEl = document.querySelector("#header-profile-container")!
const logoutBtn = document.querySelector("#header-logout-btn")!

if (!loginEl || !avatar || !profileContainerEl || !logoutBtn)
  throw new Error("Header elements not found")

window.addEventListener("pageLoaded", update)
logoutBtn.addEventListener("click", logout)

export async function update(): Promise<void> {
  const data = await get("/api/user/me")

  if (data[200]) {
    avatar.update()
    loginEl.classList.add("hidden")
    profileContainerEl.classList.remove("hidden")
  } else {
    loginEl.classList.remove("hidden")
    profileContainerEl.classList.add("hidden")
  }
}

async function logout(): Promise<void> {
  await post("/api/user/logout", {})
  navigate("/")
}
