import { navigate } from "../persistent/router.js"
import { Stats } from "../types.js"
import { checkEls, get, getUser, post, setUser, showNotify } from "../utils.js"

let els: {
  avatarInput: HTMLInputElement
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

  displayUserInfo()
  displayStats()
  displayMatchHistory()

  els.avatarInput.addEventListener("change", onAvatarInputChange)
  els.usernameInput.addEventListener("keyup", onUsernameKeyup)
  els.twofaBtn.addEventListener("click", onTwofaBtnClick)
  window.addEventListener("userChanged", displayUserInfo)
}

export function onDestroy(): void {
  window.removeEventListener("userChanged", displayUserInfo)
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
}

async function displayStats(): Promise<void> {
  const data = await get(`/api/user/stats/me`)
  const stats: Stats = data[200] ? data[200].stats : {
    numMatches: 0,
    numWins: 0,
    precision: 0,
  }

  els.numMatchesEl.textContent = stats.numMatches.toString()
  els.numWinsEl.textContent = stats.numWins.toString()
  const winRate = stats.numMatches > 0 ? (stats.numWins / stats.numMatches * 100) : 0
  els.winRateEl.textContent = `${winRate.toFixed(1)}%`
  els.precisionEl.textContent = `${stats.precision.toFixed(1)}%`
}

async function displayMatchHistory(): Promise<void> {
  const data = await get(`/api/user/matches/me`, { limit: 10 })
  const matches = data[200] ? data[200].matches : []

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
    showNotify("Avatar file size must be less than 2MB.", "error")
    els.avatarInput.value = ""
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    const result = e.target?.result as string | null
    if (!result) {
      showNotify("Failed to read image file. Please try again.", "error")
      return
    }

    const data = await post("/api/user/set-avatar", { avatar: result })
    if (data[200])
      setUser(data[200].user)
    else if (data[400])
      showNotify("Invalid image file. Please try again.", "error")
    else if (data[401])
      navigate("/login")
    else
      showNotify("Failed to upload avatar. Please try again.", "error")
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
    els.usernameInput.blur() // unfocus
  } else if (data[400])
    showNotify(data[400].details[0].message, "error")
  else if (data[401])
    navigate("/login")
  else if (data[409])
    showNotify("Username already taken. Please choose another one.", "error")
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
