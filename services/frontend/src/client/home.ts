import { sleep } from "./utils.js"

export async function onMount(): Promise<void> {
  await sleep(5000)
  const content = document.querySelector("#content")
  const headerLinks = document.querySelector("#header-links")
  content?.classList.remove("hidden")
  headerLinks?.classList.remove("hidden")
  content?.classList.add("flex")
  headerLinks?.classList.add("flex")
}

export function onDestroy(): void {
}
