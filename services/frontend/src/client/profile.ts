import { sleep } from "./utils.js"

interface UserData {
  id: number;
  email: string;
  username?: string | null;
  avatar?: string | null;
  google_id?: string | null;
}

interface MatchData {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  player1_precision: number;
  player2_precision: number;
  winner_id: number;
  created_at: string;
  player1_username?: string;
  player2_username?: string;
}

interface StatsData {
  totalMatches: number;
  totalWins: number;
  globalPrecision: number;
}

let editProfileBtn: HTMLButtonElement | null = null;
let backHomeBtn: HTMLButtonElement | null = null;

export async function onMount(): Promise<void> {
  await sleep(500);
  
  editProfileBtn = document.getElementById("edit-profile-btn") as HTMLButtonElement | null;
  backHomeBtn = document.getElementById("back-home-btn") as HTMLButtonElement | null;
  
  // Load user data
  await loadUserProfile();
  
  // Add event listeners
  editProfileBtn?.addEventListener("click", handleEditProfile);
  backHomeBtn?.addEventListener("click", handleBackHome);
}

export function onDestroy(): void {
  editProfileBtn?.removeEventListener("click", handleEditProfile);
  backHomeBtn?.removeEventListener("click", handleBackHome);
}

async function loadUserProfile(): Promise<void> {
  try {
    // Fetch user info
    const response = await fetch("/auth/me", {
      credentials: 'include'
    });
    
    if (!response.ok) {
      // Not authenticated, redirect to login
      window.location.href = "/login";
      return;
    }
    
    const data = await response.json();
    const userData: UserData = data.user;
    
    // Display user info
    displayUserInfo(userData);
    
    // Load match history and stats
    await loadMatchHistory(userData.id);
    await loadStats(userData.id);
    
  } catch (error) {
    console.error("Error loading profile:", error);
    window.location.href = "/login";
  }
}

function displayUserInfo(userData: UserData): void {
  const usernameEl = document.getElementById("username");
  const emailEl = document.getElementById("email");
  const avatarContainer = document.getElementById("avatar-container");
  const avatarImage = document.getElementById("avatar-image") as HTMLImageElement | null;
  const avatarLetter = document.getElementById("avatar-letter");
  
  // Display username
  if (usernameEl) {
    usernameEl.textContent = userData.username || "No username";
  }
  
  // Display email
  if (emailEl) {
    emailEl.textContent = userData.email;
  }
  
  // Display avatar
  if (userData.avatar && avatarImage && avatarLetter) {
    avatarImage.src = userData.avatar;
    avatarImage.classList.remove("hidden");
    avatarLetter.classList.add("hidden");
  } else if (avatarLetter && userData.username) {
    avatarLetter.textContent = userData.username.charAt(0).toUpperCase();
  } else if (avatarLetter) {
    avatarLetter.textContent = userData.email.charAt(0).toUpperCase();
  }
}

async function loadMatchHistory(userId: number): Promise<void> {
  try {
    // Fetch match history from API
    const response = await fetch(`/matches/player/${userId}?limit=10`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch match history');
    }
    
    const data = await response.json();
    const matches: MatchData[] = data.matches || [];
    
    displayMatchHistory(matches, userId);
  } catch (error) {
    console.error("Error loading match history:", error);
    // Display empty state on error
    displayMatchHistory([], userId);
  }
}

function displayMatchHistory(matches: MatchData[], userId: number): void {
  const matchHistoryEl = document.getElementById("match-history");
  if (!matchHistoryEl) return;
  
  if (matches.length === 0) {
    matchHistoryEl.innerHTML = `
      <div class="text-text-muted text-center py-8">
        No matches yet
      </div>
    `;
    return;
  }
  
  matchHistoryEl.innerHTML = matches.map(match => {
    const isPlayer1 = match.player1_id === userId;
    const isWinner = match.winner_id === userId;
    const userName = isPlayer1 ? (match.player1_username || 'You') : (match.player2_username || 'You');
    const opponentName = isPlayer1 ? (match.player2_username || 'Unknown') : (match.player1_username || 'Unknown');
    const userScore = isPlayer1 ? match.player1_score : match.player2_score;
    const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
    const userPrecision = isPlayer1 ? (match as any).player1_precision : (match as any).player2_precision;
    const date = new Date(match.created_at).toLocaleDateString();
    
    return `
      <div class="rounded-xl p-4 flex items-center justify-between border" style="background-color: ${isWinner ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-color: ${isWinner ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl" style="background-color: ${isWinner ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'};">
            ${isWinner ? 'W' : 'L'}
          </div>
          <div>
            <div class="text-white font-semibold text-lg">${userName} vs ${opponentName}</div>
            <div class="text-text-muted text-sm">${date}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold text-xl mb-1" style="color: ${isWinner ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'};">${userScore} - ${opponentScore}</div>
          <div class="text-text-muted text-sm">Precision: ${userPrecision.toFixed(1)}%</div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadStats(userId: number): Promise<void> {
  try {
    // Fetch stats from API
    const response = await fetch(`/matches/player/${userId}/stats`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    const stats: StatsData = data.stats || {
      totalMatches: 0,
      totalWins: 0,
      globalPrecision: 0
    };
    
    displayStats(stats);
  } catch (error) {
    console.error("Error loading stats:", error);
    // Display default stats on error
    displayStats({
      totalMatches: 0,
      totalWins: 0,
      globalPrecision: 0
    });
  }
}

function displayStats(stats: StatsData): void {
  const totalMatchesEl = document.getElementById("total-matches");
  const totalWinsEl = document.getElementById("total-wins");
  const winRateEl = document.getElementById("win-rate");
  const globalPrecisionEl = document.getElementById("global-precision");
  
  if (totalMatchesEl) {
    totalMatchesEl.textContent = stats.totalMatches.toString();
  }
  
  if (totalWinsEl) {
    totalWinsEl.textContent = stats.totalWins.toString();
  }
  
  if (winRateEl) {
    const winRate = stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches * 100) : 0;
    winRateEl.textContent = `${winRate.toFixed(1)}%`;
  }
  
  if (globalPrecisionEl) {
    globalPrecisionEl.textContent = `${stats.globalPrecision.toFixed(1)}%`;
  }
}

function handleEditProfile(): void {
  window.location.href = "/setup-profile";
}

function handleBackHome(): void {
  window.location.href = "/home";
}
