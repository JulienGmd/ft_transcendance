import { sleep } from "../utils.js"

let isFirstPageLoad = true

window.addEventListener("pageLoaded", onPageLoaded)

function onPageLoaded(): void {
  // If reload or navigate (not with SPA) ...
  if (isFirstPageLoad) {
    isFirstPageLoad = false

    // ... increase all animation delays by 3s to let time for the header typewriter animation to finish ...
    // *= is substring match operator
    const animEls = Array.from(document.querySelectorAll<HTMLElement>("[class*='animate-']"))
    const animElsInitialDelays = animEls.map((el) => parseFloat(window.getComputedStyle(el).animationDelay))
    animEls.forEach((el, i) => {
      el.style.animationDelay = `${animElsInitialDelays[i] + 3}s`
    })

    // ... then remove the delay increase after animations are done (in case we are retriggering animations later)
    animEls.forEach((el, i) => {
      const delay = parseFloat(window.getComputedStyle(el).animationDelay)
      const duration = parseFloat(window.getComputedStyle(el).animationDuration)
      setTimeout(() => {
        el.style.animationDelay = `${animElsInitialDelays[i]}s`
      }, (delay + duration) * 1000 + 10)
    })
  }

  animateTypeWriterEls()
}

async function animateTypeWriterEls(): Promise<void> {
  const els = Array.from(document.querySelectorAll(".anim-typewriter"))
  const data: { el: Element; text: string }[] = []

  els.forEach((el) => {
    if (!el.textContent)
      return
    data.push({ el, text: el.textContent })
    el.textContent = ""
    el.classList.remove("anim-typewriter")
    el.classList.add("anim-cursor")
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
        el.classList.remove("anim-cursor")
      }
    }, 150)
  })
}
