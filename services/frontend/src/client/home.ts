import { navigate } from "./router.js"

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
  // Reduce total animation duration on subsequent visits
  if (!localStorage.getItem("visitedHome"))
    localStorage.setItem("visitedHome", "true")
  else {
    // Disable typewriter animation
    const typeWriterEls = Array.from(document.querySelectorAll<HTMLElement>(".anim-typewriter"))
    typeWriterEls.forEach((el) => {
      el.classList.remove("anim-typewriter")
      el.classList.add("animate-slide-right")
    })

    // Reduce all animation delays by 5s
    // *= is substring match operator
    const animDelayEls = Array.from(document.querySelectorAll<HTMLElement>("[class*='animate-delay-']"))
    animDelayEls.forEach((el) => {
      const delay = window.getComputedStyle(el).animationDelay
      el.style.animationDelay = `${parseFloat(delay) - 3}s`
    })
  }

  const loginLink = document.querySelector("#login") as HTMLAnchorElement | null
  const profileContainer = document.querySelector("#profile-container") as HTMLDivElement | null
  const avatarImg = document.querySelector("#avatar") as HTMLImageElement | null
  logoutBtn = document.querySelector("#logout-btn") as HTMLButtonElement | null

  logoutBtn?.addEventListener("click", logout)

  // If logged in, show profile else show login

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
