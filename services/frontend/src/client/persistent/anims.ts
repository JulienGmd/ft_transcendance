import { sleep } from "../utils.js"

animateTypeWriterEls()
window.addEventListener("pageLoaded", onPageLoaded)

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

function onPageLoaded(): void {
  // If reload or navigate (not with SPA) ...
  const navigationEntry = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
  if (
    navigationEntry.type === "reload"
    || navigationEntry.type === "navigate"
    || navigationEntry.type === "prerender"
  ) {
    // ... increase all animation delays by 3s to let time for the header typewriter animation to finish
    // *= is substring match operator
    const animEls = Array.from(document.querySelectorAll<HTMLElement>("[class*='animate-']"))
    animEls.forEach((el) => {
      const delay = window.getComputedStyle(el).animationDelay
      el.style.animationDelay = `${parseFloat(delay) + 3}s`
    })
  }

  window.removeEventListener("pageLoaded", onPageLoaded)
}
