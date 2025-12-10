import { navigate } from "../persistent/router.js"
import { checkEls, getUser, post, setUser } from "../utils.js"

const els = {
  login: document.querySelector("#header-login")!,
  profileContainer: document.querySelector("#header-profile-container")!,
  logoutBtn: document.querySelector("#header-logout-btn")!,
}
checkEls(els)

update()

window.addEventListener("userChanged", update)
els.logoutBtn.addEventListener("click", logout)

async function update(): Promise<void> {
  if (getUser()) {
    els.login.classList.add("hidden")
    els.profileContainer.classList.remove("hidden")
  } else {
    els.login.classList.remove("hidden")
    els.profileContainer.classList.add("hidden")
  }
}

async function logout(): Promise<void> {
  await post("/api/user/logout", {})
  setUser(null)
  navigate("/")
}
