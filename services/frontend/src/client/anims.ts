import { sleep } from "./utils.js"

export function onMount(): void {
  animateTypeWriterEls()
}

export function onDestroy(): void {
}

async function animateTypeWriterEls(): Promise<void> {
  const els = Array.from(document.querySelectorAll(".anim-typewriter"))
  const data: { el: Element; text: string }[] = []

  els.forEach((el) => {
    if (!el.textContent)
      return
    data.push({ el, text: el.textContent })
    el.textContent = ""
  })

  data.forEach(({ el, text }) => {
    let index = 0

    const interval = setInterval(async () => {
      if (!el) {
        clearInterval(interval)
        return
      }

      el.textContent += text.charAt(index)
      index++
      if (index >= text.length) {
        clearInterval(interval)
        await sleep(2000)
        el.classList.remove("anim-typewriter")
      }
    }, 150)
  })
}
