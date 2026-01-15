import { UserAvatarElement } from "../../components/userAvatar.js"
import { navigate } from "../../persistent/router.js"
import { Stats } from "../../types.js"
import { checkEls, escapeString, get, getUser } from "../../utils.js"

let els: {
  avatar: UserAvatarElement
  username: HTMLInputElement
  numMatchesEl: HTMLElement
  numWinsEl: HTMLElement
  winRateEl: HTMLElement
  precisionEl: HTMLElement
  matchHistoryEl: HTMLElement
}
let username = ""
let user: { username: string; avatar: string | null } | undefined

export function onGuard(route: string): boolean {
  username = new URLSearchParams(route.split("?")[1]).get("username") || ""
  return !!getUser() && !!username
}

export async function onMount(): Promise<void> {
  els = {
    avatar: document.querySelector("#avatar")!,
    username: document.querySelector("#username")!,
    numMatchesEl: document.querySelector("#num-matches")!,
    numWinsEl: document.querySelector("#num-wins")!,
    winRateEl: document.querySelector("#win-rate")!,
    precisionEl: document.querySelector("#precision")!,
    matchHistoryEl: document.querySelector("#match-history")!,
  }
  checkEls(els)

  const data = await get("/api/user/user", { username })
  if (!data[200]) {
    navigate("/")
    return
  }

  user = data[200].user

  displayUserInfo()
  displayStats()
  displayMatchHistory()
}

export function onDestroy(): void {
}

function displayUserInfo(): void {
  els.username.textContent = user?.username || ""
  els.avatar.setUsername(user?.username || "")
}

async function displayStats(): Promise<void> {
  const data = await get(`/api/user/stats`, { username })
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
  const data = await get(`/api/user/matches`, { username, limit: "10" })
  const matches = data[200] ? data[200].matches : []

  if (matches.length === 0)
    return

  els.matchHistoryEl.innerHTML = matches.map((match) => {
    const isP1 = match.p1_username === username
    const win = match.winner_username === username
    const playerScore = isP1 ? match.p1_score : match.p2_score
    const playerPrecision = isP1 ? match.p1_precision : match.p2_precision
    const opponentUsername = isP1 ? match.p2_username : match.p1_username
    const opponentScore = isP1 ? match.p2_score : match.p1_score
    const date = new Date(match.created_at).toLocaleDateString()

    return `
      <div class="rounded-lg p-4 flex items-center justify-between border border-surface shadow-sm">
        <div>
          <div
            class="font-semibold text-lg"
            style="color: ${win ? "var(--color-success)" : "var(--color-error)"};"
          >
            ${escapeString(username)} vs ${escapeString(opponentUsername)}
          </div>
          <div class="text-text-muted text-sm">${date}</div>
        </div>
        <div class="text-right">
          <div
            class="font-bold text-xl mb-1"
            style="color: ${win ? "var(--color-success)" : "var(--color-error)"};"
          >
            ${playerScore} - ${opponentScore}
          </div>
          <div class="text-text-muted text-sm">Precision: ${playerPrecision.toFixed(1)}%</div>
        </div>
      </div>
    `
  }).join("")
}
