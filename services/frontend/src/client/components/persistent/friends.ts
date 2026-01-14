import { Friend, FriendRequest } from "../../types.js"
import { escapeString, get, getUser, post, showNotify } from "../../utils.js"

const AWAY_THRESHOLD = 5 * 60 * 1000 // 5 minutes
const OFFLINE_THRESHOLD = 15 * 60 * 1000 // 15 minutes

export interface FriendsListElement extends HTMLElement {
}

class FriendsList extends HTMLElement implements FriendsListElement {
  private closeBtn!: HTMLButtonElement
  private toggleBtn!: HTMLButtonElement
  private list!: HTMLElement
  private pendingList!: HTMLElement
  private container!: HTMLElement
  private updateListInterval = 0

  connectedCallback() {
    this.innerHTML = `
      <button id="friends-close-btn" class="fixed inset-0 cursor-auto hidden"></button>
      <button id="friends-toggle-btn" class="group fixed bottom-4 right-4 bg-surface size-12 rounded-full grid place-items-center shadow-lg hidden">
        <svg class="size-6 group-hover:text-primary transition" viewBox="0 0 24 24"><!-- Icon from Material Design Icons by Pictogrammers - https://github.com/Templarian/MaterialDesign/blob/master/LICENSE --><path fill="currentColor" d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.4 3.4 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.4 3.4 0 0 0 15 11a3.5 3.5 0 0 0 0-7"/></svg>
      </button>
      <div id="friends-container" class="fixed inset-y-20 right-4 w-60 rounded overflow-y-scroll flex flex-col justify-end hidden">
        <div class="p-2 bg-surface rounded shadow-lg">
          <input id="friends-add-input" type="text" placeholder="Add friend..." class="w-full px-3 py-2 rounded bg-background/50 focus:bg-background/70 transition" />

          <div id="friends-pending-list" class="mt-2 flex flex-col gap-1 px-2"></div>

          <div id="friends-list" class="mt-2 flex flex-col gap-1 px-2"></div>
        </div>
      </div>
    `

    this.closeBtn = this.querySelector("#friends-close-btn")!
    this.toggleBtn = this.querySelector("#friends-toggle-btn")!
    this.container = this.querySelector("#friends-container")!
    this.list = this.querySelector("#friends-list")!
    this.pendingList = this.querySelector("#friends-pending-list")!
    const addInput = this.querySelector<HTMLInputElement>("#friends-add-input")!

    this.closeBtn.addEventListener("click", this.toggleFriendsList)
    this.toggleBtn.addEventListener("click", this.toggleFriendsList)
    this.list.addEventListener("click", this.onFriendListClick)
    this.pendingList.addEventListener("click", this.onPendingListClick)
    addInput.addEventListener("change", this.onAddFriendInputChange)
    window.addEventListener("userChanged", this.onUserChanged)

    this.onUserChanged()
  }

  disconnectedCallback() {
    window.removeEventListener("userChanged", this.onUserChanged)
    clearInterval(this.updateListInterval)
  }

  // Using arrow function because regular function loose 'this' context when called from event listener
  private onUserChanged = async (): Promise<void> => {
    if (getUser())
      this.toggleBtn.classList.remove("hidden")
    else
      this.toggleBtn.classList.add("hidden")
    this.hideFriendsList()
  }

  private updateList = async (): Promise<void> => {
    const [friendsData, pendingData] = await Promise.all([
      get("/api/user/friends/me"),
      get("/api/user/friends/pending"),
    ])

    if (pendingData[200]) {
      const requests = pendingData[200].requests as FriendRequest[]
      if (requests.length > 0) {
        this.pendingList.innerHTML = `
          <p class="text-xs text-text-muted mb-1">Pending requests</p>
          ${requests.map((req: FriendRequest) => `
            <div class="flex items-center justify-between bg-background/30 rounded px-2 py-1">
              <p class="text-sm">${escapeString(req.username)}</p>
              <div class="flex gap-1">
                <button data-action="accept" data-username="${escapeString(req.username)}" class="text-success hover:text-success/80">
                  <svg class="size-4 pointer-events-none" viewBox="0 0 24 24"><path fill="currentColor" d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59L21 7Z"/></svg>
                </button>
                <button data-action="reject" data-username="${escapeString(req.username)}" class="text-error hover:text-error/80">
                  <svg class="size-4 pointer-events-none" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
                </button>
              </div>
            </div>
          `).join("")}
        `
      } else {
        this.pendingList.innerHTML = ""
      }
    }

    if (!friendsData[200])
      return

    const friends = friendsData[200].friends.sort((a: Friend, b: Friend) => {
      if (this.getOnlineStatus(a) === this.getOnlineStatus(b))
        return a.username.localeCompare(b.username)
      return this.getOnlineStatus(a) ? -1 : 1
    })

    this.list.innerHTML = friends.map((friend: Friend) => `
      <div class="group flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="size-2 rounded-full" style="background-color: ${this.getOnlineColor(friend)};"></div>
          <p>${escapeString(friend.username)}</p>
        </div>
        <button
          data-username="${escapeString(friend.username)}"
          class="text-text-muted hover:text-text opacity-0 group-hover:opacity-100"
        >
          <svg class="size-4 pointer-events-none" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
        </button>
      </div>
    `).join("")

    if (this.list.innerHTML === "")
      this.list.innerHTML = `<p class="text-center text-sm text-text-muted">No friends yet.</p>`
  }

  private getOnlineStatus = (user: Friend): "online" | "away" | "offline" => {
    const lastActiveDuration = Date.now() - new Date(user.last_active_time).getTime()
    return lastActiveDuration > OFFLINE_THRESHOLD
      ? "offline"
      : lastActiveDuration > AWAY_THRESHOLD
      ? "away"
      : "online"
  }

  private getOnlineColor = (user: Friend): string => {
    const status = this.getOnlineStatus(user)
    if (status === "online")
      return "var(--color-success)"
    if (status === "away")
      return "var(--color-warning)"
    return "var(--color-error)"
  }

  private addFriend = async (username: string): Promise<void> => {
    const data = await post(`/api/user/friends/add`, { username })
    if (data[200]) {
      showNotify("Friend added!", "success")
      return this.updateList()
    }
    if (data[400]) {
      if (data[400].message === "Friend request already sent")
        return showNotify("Friend request already sent", "warning")
      return showNotify(data[400].message, "warning")
    }
    if (data[404])
      return showNotify("User not found", "warning")
    showNotify("Friend request sent!", "success")
    this.updateList()
  }

  private removeFriend = async (username: string): Promise<void> => {
    const data = await post(`/api/user/friends/remove`, { username })
    if (data[200])
      this.updateList()
  }

  private acceptFriendRequest = async (username: string): Promise<void> => {
    const data = await post(`/api/user/friends/accept`, { username })
    if (data[200]) {
      showNotify("Friend request accepted!", "success")
      this.updateList()
    }
    if (data[400])
      showNotify(data[400].message, "warning")
  }

  private rejectFriendRequest = async (username: string): Promise<void> => {
    const data = await post(`/api/user/friends/reject`, { username })
    if (data[200])
      this.updateList()
    if (data[400])
      showNotify(data[400].message, "warning")
  }

  private showFriendsList = (): void => {
    this.updateList()
    clearInterval(this.updateListInterval)
    // @ts-ignore @types/node is installed so intellisense thinks setInterval returns a NodeJS.Timeout
    this.updateListInterval = setInterval(this.updateList, 20000)

    this.closeBtn.classList.remove("hidden")
    this.container.classList.remove("hidden")
  }

  private hideFriendsList = (): void => {
    clearInterval(this.updateListInterval)

    this.closeBtn.classList.add("hidden")
    this.container.classList.add("hidden")
  }

  private toggleFriendsList = (): void => {
    if (this.container.classList.contains("hidden"))
      this.showFriendsList()
    else
      this.hideFriendsList()
  }

  private onAddFriendInputChange = (e: Event): void => {
    const input = e.target as HTMLInputElement
    const username = input.value.trim()
    if (username !== "") {
      this.addFriend(username)
      input.value = ""
    }
  }

  private onFriendListClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    if (target.tagName === "BUTTON") {
      const username = target.getAttribute("data-username")
      if (username)
        this.removeFriend(username)
    }
  }

  private onPendingListClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    if (target.tagName === "BUTTON") {
      const username = target.getAttribute("data-username")
      const action = target.getAttribute("data-action")
      if (username && action === "accept")
        this.acceptFriendRequest(username)
      if (username && action === "reject")
        this.rejectFriendRequest(username)
    }
  }
}

customElements.define("friends-list", FriendsList)
