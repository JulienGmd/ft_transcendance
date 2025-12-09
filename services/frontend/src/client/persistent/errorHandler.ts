import { sleep } from "../utils.js"

export async function showErrorMessage(msg: string): Promise<void> {
  await sleep(200)
  document.body.innerHTML += `
    <div class="absolute inset-0 grid place-items-center bg-background/80">
      <div class="bg-background border-2 border-error/50 text-error px-4 py-3 rounded-lg shadow-xl">
        <div class="whitespace-pre">${msg}</div>
      </div>
    </div>
  `
}

window.addEventListener("unhandledrejection", (event) => {
  showErrorMessage(event.reason?.message || "An unexpected error occurred")
})

window.addEventListener("error", (event) => {
  const location = event.filename ? `at: ${event.filename}:${event.lineno}` : ""
  const message = location ? `${event.message}\n${location}` : event.message
  showErrorMessage(message)
})
