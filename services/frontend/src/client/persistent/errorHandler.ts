import { escapeString } from "../utils.js"

window.addEventListener("unhandledrejection", (event) => {
  showErrorMessage(event.reason?.message || "An unexpected error occurred")
})

window.addEventListener("error", (event) => {
  const location = event.filename ? `at: ${event.filename}:${event.lineno}` : ""
  const message = location ? `${event.message}\n${location}` : event.message
  showErrorMessage(message)
})

async function showErrorMessage(msg: string): Promise<void> {
  const dialog = document.createElement("dialog")
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog)
      dialog.close()
  })
  dialog.className =
    "bg-background border-2 border-error/50 text-error px-4 py-3 outline-none rounded-lg shadow-xl backdrop:bg-background/80 m-auto"
  dialog.innerHTML = `<div class="whitespace-pre-wrap">${escapeString(msg)}</div>`
  document.body.appendChild(dialog)
  dialog.showModal()
}
