const footerDateEl = document.querySelector("#footer-date")!

if (!footerDateEl)
  throw new Error("Footer elements not found")

footerDateEl.textContent = new Date().getFullYear().toString()
