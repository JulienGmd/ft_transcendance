import { navigate } from "./router.js"
import { sleep } from "./utils.js"

// TODO import from shared types
interface UserData {
  id: number
  email: string
  username?: string | null
  avatar?: string | null
  google_id?: string | null
}

let logoutBtn: HTMLButtonElement | null

export async function onMount(): Promise<void> {
  const showAfterEls = document.querySelectorAll("[show-after]")

  showAfterEls.forEach(async (el) => {
    const sleepTime = parseInt(el.getAttribute("show-after") || "0")
    await sleep(sleepTime * 1000)
    el.classList.remove("hidden")
    el.classList.add("flex")
  })

  const loginLink = document.querySelector("#login") as HTMLAnchorElement | null
  const profileContainer = document.querySelector("#profile-container") as HTMLDivElement | null
  const avatarImg = document.querySelector("#avatar") as HTMLImageElement | null
  logoutBtn = document.querySelector("#logout-btn") as HTMLButtonElement | null

  logoutBtn?.addEventListener("click", logout)

  // TODO causing 502 if not logged in.
  // -> Add bool IsLoggedIn to localStorage ?
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
}

export function onDestroy(): void {
  logoutBtn?.removeEventListener("click", logout)
}

async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "include" })
  navigate("/") // Always reload page
}
