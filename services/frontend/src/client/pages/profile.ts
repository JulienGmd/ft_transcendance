import { UserAvatarElement } from "../components/userAvatar.js"
import * as header from "../persistent/header.js"
import { navigate } from "../persistent/router.js"
import { Match, Stats } from "../types.js"
import { checkEls, get, getUser, post, setUser } from "../utils.js"

let els: {
  avatarInput: HTMLInputElement
  avatar: UserAvatarElement
  usernameInput: HTMLInputElement
  emailEl: HTMLSpanElement
  twofaBtn: HTMLButtonElement
  numMatchesEl: HTMLElement
  numWinsEl: HTMLElement
  winRateEl: HTMLElement
  precisionEl: HTMLElement
  matchHistoryEl: HTMLElement
}

export function onMount(): void {
  els = {
    avatarInput: document.querySelector("#avatar-input")!,
    avatar: document.querySelector("#user-avatar")!,
    usernameInput: document.querySelector("#username-input")!,
    emailEl: document.querySelector("#email")!,
    twofaBtn: document.querySelector("#twofa-btn")!,
    numMatchesEl: document.querySelector("#num-matches")!,
    numWinsEl: document.querySelector("#num-wins")!,
    winRateEl: document.querySelector("#win-rate")!,
    precisionEl: document.querySelector("#precision")!,
    matchHistoryEl: document.querySelector("#match-history")!,
  }
  checkEls(els)

  if (!getUser()) {
    navigate("/login")
    return
  }

  setupPage()

  els.avatarInput.addEventListener("change", onAvatarInputChange)
  els.usernameInput.addEventListener("keyup", onUsernameKeyup)
  els.twofaBtn.addEventListener("click", onTwofaBtnClick)
}

async function setupPage(): Promise<void> {
  displayUserInfo()

  const stats = await loadStats()
  displayStats(stats)

  const matches = await loadMatchHistory()
  displayMatchHistory(matches)
}

async function loadMatchHistory(): Promise<Match[]> {
  const data = await get(`/api/user/matches/me`, { limit: 10 })
  return data[200] ? data[200].matches : []
}

async function loadStats(): Promise<Stats> {
  const data = await get(`/api/user/stats/me`)
  return data[200] ? data[200].stats : {
    numMatches: 0,
    numWins: 0,
    precision: 0,
  }
}

function displayUserInfo(): void {
  const user = getUser()
  if (!user) {
    navigate("/login")
    return
  }
  els.usernameInput.value = user.username || "Anonymous"
  els.emailEl.textContent = user.email
  els.twofaBtn.textContent = user.twofa_enabled ? "enabled" : "disabled"
  els.avatar.update()
}

function displayStats(stats: Stats): void {
  els.numMatchesEl.textContent = stats.numMatches.toString()
  els.numWinsEl.textContent = stats.numWins.toString()
  const winRate = stats.numMatches > 0 ? (stats.numWins / stats.numMatches * 100) : 0
  els.winRateEl.textContent = `${winRate.toFixed(1)}%`
  els.precisionEl.textContent = `${stats.precision.toFixed(1)}%`
}

function displayMatchHistory(matches: Match[]): void {
  if (matches.length === 0)
    return

  // matchHistoryEl.innerHTML = matches.map((match) => {
  //   const isPlayer1 = match.p1_id === user.id // TODO pas d'id dans user car pas safe
  //   const isWinner = match.winner_id === user.id
  //   const userName = isPlayer1 ? match.p1_username : match.p2_username
  //   const opponentName = isPlayer1 ? match.p2_username : match.p1_username
  //   const userScore = isPlayer1 ? match.p1_score : match.p2_score
  //   const opponentScore = isPlayer1 ? match.p2_score : match.p1_score
  //   const userPrecision = isPlayer1 ? match.p1_precision : match.p2_precision
  //   const date = new Date(match.created_at).toLocaleDateString()

  //   return `
  //     <div class="rounded-lg p-4 flex items-center justify-between border border-surface shadow-2xl">
  //       <div>
  //         <div
  //           class="font-semibold text-lg"
  //           style="color: ${isWinner ? "var(--color-success)" : "var(--color-error)"};"
  //         >
  //           ${userName} vs ${opponentName}
  //         </div>
  //         <div class="text-text-muted text-sm">${date}</div>
  //       </div>
  //       <div class="text-right">
  //         <div
  //           class="font-bold text-xl mb-1"
  //           style="color: ${isWinner ? "var(--color-success)" : "var(--color-error)"};"
  //         >
  //           ${userScore} - ${opponentScore}
  //         </div>
  //         <div class="text-text-muted text-sm">Precision: ${userPrecision.toFixed(1)}%</div>
  //       </div>
  //     </div>
  //   `
  // }).join("")
}

function onAvatarInputChange(): void {
  const file = els.avatarInput.files?.[0]
  if (!file)
    return

  // Limit file size to 2MB
  if (file.size > 2 * 1024 * 1024) {
    alert("Image must be less than 2MB")
    els.avatarInput.value = ""
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    const result = e.target?.result as string | null
    if (!result) {
      alert("Failed to read image file. Please try again.")
      return
    }

    const data = await post("/api/user/set-avatar", { avatar: result })
    if (data[200]) {
      setUser(data[200].user)
      displayUserInfo()
      header.update()
    } else if (data[401])
      navigate("/login")
    else
      alert("Failed to upload avatar. Please try again.")
  }
  reader.readAsDataURL(file)
}

async function onUsernameKeyup(e: KeyboardEvent): Promise<void> {
  if (e.key !== "Enter")
    return

  const username = els.usernameInput.value || ""

  const data = await post("/api/user/set-username", { username })
  if (data[200]) {
    setUser(data[200].user)
    displayUserInfo()
    header.update()
    els.usernameInput.blur() // unfocus
  } else if (data[400])
    alert(data[400].details[0].message)
  else if (data[401])
    navigate("/login")
  else if (data[409])
    alert("Username already taken. Please choose another one.")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}

async function onTwofaBtnClick(): Promise<void> {
  const user = getUser()
  if (!user) {
    navigate("/login")
    return
  }

  if (user.twofa_enabled)
    navigate("/2fa/disable")
  else
    navigate("/2fa/enable")
}
