import { post } from "../utils.js"

window.addEventListener("click", sendActive)
window.addEventListener("keydown", sendActive)

const MIN_INTERVAL_MS = 60000 // 1 minute

let lastSend = Date.now()

function sendActive(): void {
  if (Date.now() - lastSend > MIN_INTERVAL_MS) {
    lastSend = Date.now()
    post("/api/user/active", {})
  }
}
