import * as header from "../persistent/header.js"
import { navigate } from "../persistent/router.js"
import { get, isValidUsername, post } from "../utils.js"

// TODO shared type
interface UserData {
  id: number
  email: string
  twofa_enabled: boolean
  username?: string | null
  avatar?: string | null
  google_id?: string | null
}

// TODO shared type
interface MatchData {
  id: number
  player1_id: number
  player2_id: number
  player1_score: number
  player2_score: number
  player1_precision: number
  player2_precision: number
  winner_id: number
  created_at: string
  player1_username?: string
  player2_username?: string
}

// TODO shared type
interface StatsData {
  totalMatches: number
  totalWins: number
  globalPrecision: number
}

let userData: UserData = {
  id: 0,
  email: "",
  twofa_enabled: false,
}

let avatarFile: HTMLInputElement | null = null
let usernameInput: HTMLInputElement | null = null
let twofaButtonEl: HTMLButtonElement | null

export async function onMount(): Promise<void> {
  avatarFile = document.getElementById("avatar-file") as HTMLInputElement | null
  usernameInput = document.getElementById("username") as HTMLInputElement | null
  twofaButtonEl = document.getElementById("2fa-button") as HTMLButtonElement | null

  avatarFile?.addEventListener("change", onAvatarFileChange)
  usernameInput?.addEventListener("keyup", onUsernameInput)
  twofaButtonEl?.addEventListener("click", on2FAButtonClick)

  const _userData = await loadUserInfo()
  if (!_userData) {
    navigate("/login")
    return
  }
  userData = _userData
  displayUserInfo()

  // console.log(userData.id)

  // const stats = {
  //   totalMatches: 42,
  //   totalWins: 27,
  //   globalPrecision: 85.3,
  // }
  const stats = await loadStats()
  if (stats)
    displayStats(stats)

  // const matches = [
  //   {
  //     id: 0,
  //     player1_id: 4,
  //     player2_id: 1,
  //     player1_score: 10,
  //     player2_score: 5,
  //     player1_precision: 96,
  //     player2_precision: 78,
  //     winner_id: 4,
  //     created_at: new Date().toISOString(),
  //     player1_username: "Me",
  //     player2_username: "You",
  //   },
  //   {
  //     id: 1,
  //     player1_id: 2,
  //     player2_id: 4,
  //     player1_score: 10,
  //     player2_score: 7,
  //     player1_precision: 92,
  //     player2_precision: 78,
  //     winner_id: 2,
  //     created_at: new Date().toISOString(),
  //     player1_username: "You",
  //     player2_username: "Me",
  //   },
  // ]
  const matches = await loadMatchHistory()
  if (matches)
    displayMatchHistory(matches)
}

export function onDestroy(): void {
  avatarFile?.removeEventListener("change", onAvatarFileChange)
  usernameInput?.removeEventListener("keyup", onUsernameInput)
  twofaButtonEl?.removeEventListener("click", on2FAButtonClick)
}

async function loadUserInfo(): Promise<UserData | null> {
  const data = await get("/auth/me")
  return data ? data.user : null
}

async function loadMatchHistory(): Promise<MatchData[]> {
  const data = await get(`/matches/player/${userData.id}?limit=10`)
  return data ? data.matches : []
}

async function loadStats(): Promise<StatsData> {
  const data = await get(`/matches/player/${userData.id}/stats`)
  return data ? data.stats : {
    totalMatches: 0,
    totalWins: 0,
    globalPrecision: 0,
  }
}

function displayUserInfo(): void {
  const usernameEl = document.getElementById("username") as HTMLInputElement | null
  const emailEl = document.getElementById("email") as HTMLSpanElement | null

  usernameEl!.value = userData.username || "Anonymous"
  emailEl!.textContent = userData.email
  twofaButtonEl!.textContent = userData.twofa_enabled ? "enabled" : "disabled"

  updateAvatar()
}

function updateAvatar(): void {
  const avatarImg = document.getElementById("avatar-image") as HTMLImageElement | null
  const avatarLetter = document.getElementById("avatar-letter") as HTMLSpanElement | null

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
}

function displayStats(stats: StatsData): void {
  const totalMatchesEl = document.getElementById("total-matches")
  const totalWinsEl = document.getElementById("total-wins")
  const winRateEl = document.getElementById("win-rate")
  const globalPrecisionEl = document.getElementById("global-precision")

  totalMatchesEl!.textContent = stats.totalMatches.toString()
  totalWinsEl!.textContent = stats.totalWins.toString()
  const winRate = stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches * 100) : 0
  winRateEl!.textContent = `${winRate.toFixed(1)}%`
  globalPrecisionEl!.textContent = `${stats.globalPrecision.toFixed(1)}%`
}

function displayMatchHistory(matches: MatchData[]): void {
  const matchHistoryEl = document.getElementById("match-history")

  if (matches.length === 0)
    return

  matchHistoryEl!.innerHTML = matches.map((match) => {
    const isPlayer1 = match.player1_id === userData.id
    const isWinner = match.winner_id === userData.id
    const userName = isPlayer1 ? match.player1_username : match.player2_username
    const opponentName = isPlayer1 ? match.player2_username : match.player1_username
    const userScore = isPlayer1 ? match.player1_score : match.player2_score
    const opponentScore = isPlayer1 ? match.player2_score : match.player1_score
    const userPrecision = isPlayer1 ? match.player1_precision : match.player2_precision
    const date = new Date(match.created_at).toLocaleDateString()

    return `
      <div class="rounded-lg p-4 flex items-center justify-between border border-surface shadow-2xl">
        <div>
          <div
            class="font-semibold text-lg"
            style="color: ${isWinner ? "var(--color-success)" : "var(--color-error)"};"
          >
            ${userName} vs ${opponentName}
          </div>
          <div class="text-text-muted text-sm">${date}</div>
        </div>
        <div class="text-right">
          <div
            class="font-bold text-xl mb-1"
            style="color: ${isWinner ? "var(--color-success)" : "var(--color-error)"};"
          >
            ${userScore} - ${opponentScore}
          </div>
          <div class="text-text-muted text-sm">Precision: ${userPrecision.toFixed(1)}%</div>
        </div>
      </div>
    `
  }).join("")
}

function onAvatarFileChange(): void {
  const avatarImg = document.getElementById("avatar-image") as HTMLImageElement | null
  const avatarLetter = document.getElementById("avatar-letter") as HTMLSpanElement | null
  const file = avatarFile?.files?.[0]
  if (!file)
    return

  // Limit file size to 2MB
  if (file.size > 2 * 1024 * 1024) {
    alert("Image must be less than 2MB")
    avatarFile!.value = ""
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    const result = e.target?.result as string

    const data = await post("/auth/set-avatar", {
      avatar: result,
    })
    if (!data) {
      alert("Failed to upload avatar. Please try again.")
      return
    }

    userData.avatar = result

    avatarImg!.src = result
    avatarImg?.classList.remove("hidden")
    avatarLetter?.classList.add("hidden")
  }
  reader.readAsDataURL(file)
}

async function onUsernameInput(e: KeyboardEvent): Promise<void> {
  if (e.key !== "Enter")
    return

  const username = usernameInput?.value || ""
  if (!isValidUsername(username)) {
    alert("Invalid username. It must be 3-20 characters long and can only contain letters, numbers, and underscores.")
    return
  }

  const data = await post("/auth/set-username", {
    username,
  })
  if (!data) {
    alert("Failed to set username. Please try again.")
    return
  }

  userData.username = username

  updateAvatar()
  header.update()

  usernameInput?.blur() // unfocus
}

async function on2FAButtonClick(): Promise<void> {
  if (userData.twofa_enabled) {
    if (!confirm("Do you want to disable 2FA?"))
      return

    const data = await post("/auth/disable-2fa", {})
    if (!data) {
      alert("Failed to disable 2FA. Please try again.")
      return
    }
    twofaButtonEl!.textContent = "Disabled"
  } else {
    navigate("/login/setup-2fa")
  }
}
