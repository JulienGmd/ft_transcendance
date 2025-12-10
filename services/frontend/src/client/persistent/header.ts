import type { UserAvatarElement } from "../components/userAvatar.js"
import { navigate } from "../persistent/router.js"
import { checkEls, get, post } from "../utils.js"

const els = {
  login: document.querySelector("#header-login")!,
  avatar: document.querySelector("#header-user-avatar") as UserAvatarElement,
  profileContainer: document.querySelector("#header-profile-container")!,
  logoutBtn: document.querySelector("#header-logout-btn")!,
}
checkEls(els)

window.addEventListener("pageLoaded", update)
els.logoutBtn.addEventListener("click", logout)

export async function update(): Promise<void> {
  const data = await get("/api/user/me")

  if (data[200]) {
    els.avatar.update()
    els.login.classList.add("hidden")
    els.profileContainer.classList.remove("hidden")
  } else {
    els.login.classList.remove("hidden")
    els.profileContainer.classList.add("hidden")
  }
}

async function logout(): Promise<void> {
  await post("/api/user/logout", {})
  navigate("/")
}
