import { Friend } from "../../types.js"
import { escapeString, get, getUser, post, showNotify } from "../../utils.js"

const AWAY_THRESHOLD = 5 * 60 * 1000 // 5 minutes
const OFFLINE_THRESHOLD = 15 * 60 * 1000 // 15 minutes

export interface FriendsListElement extends HTMLElement {
}

class FriendsList extends HTMLElement implements FriendsListElement {
  private closeBtn!: HTMLButtonElement
  private toggleBtn!: HTMLButtonElement
  private list!: HTMLElement
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

          <div id="friends-list" class="mt-2 flex flex-col gap-1 px-2">
            <!-- Content replaced by actual friend list -->
          </div>
        </div>
      </div>
    `

    this.closeBtn = this.querySelector("#friends-close-btn")!
    this.toggleBtn = this.querySelector("#friends-toggle-btn")!
    this.container = this.querySelector("#friends-container")!
    this.list = this.querySelector("#friends-list")!
    const addInput = this.querySelector<HTMLInputElement>("#friends-add-input")!

    this.closeBtn.addEventListener("click", this.toggleFriendsList)
    this.toggleBtn.addEventListener("click", this.toggleFriendsList)
    this.list.addEventListener("click", this.onFriendListClick)
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
    const data = await get("/api/user/friends/me")
    if (!data[200])
      return

    // Sort by online status first, then alphabetically
    const friends = data[200].friends.sort((a, b) => {
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
          <svg class="size-4 pointer-events-none" viewBox="0 0 24 24"><!-- Icon from Material Design Icons by Pictogrammers - https://github.com/Templarian/MaterialDesign/blob/master/LICENSE --><path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
        </button>
      </div>
    `).join("")

    if (this.list.innerHTML === "")
      this.list.innerHTML = `<p class="text-center text-sm text-text-muted">No friends added.</p>`
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
    if (data[200])
      return this.updateList()
    if (data[400])
      return showNotify(data[400].message, "warning")
    if (data[404])
      return showNotify("Can't add friend: No user have this username", "warning")
  }

  private removeFriend = async (username: string): Promise<void> => {
    const data = await post(`/api/user/friends/remove`, { username })
    if (data[200])
      this.updateList()
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
}

customElements.define("friends-list", FriendsList)
