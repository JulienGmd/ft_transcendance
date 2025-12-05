export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function get(url: string): Promise<any | null> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies
  })
  if (!res.ok) {
    console.error(`GET request to ${url} failed with status ${res.status} (${await res.text()})`)
    return null
  }
  return await res.json()
}

export async function post(url: string, body: Record<string, any>): Promise<any | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`POST request to ${url} failed with status ${res.status} (${await res.text()})`)
    return null
  }
  return await res.json()
}

export function validateFormInput(
  inputEl: HTMLInputElement,
  errorEl: HTMLElement,
  condition: (value: string) => boolean,
  errorMessage: string,
): void {
  if (condition(inputEl.value)) {
    inputEl.setCustomValidity("")
    errorEl.textContent = ""
    errorEl.classList.add("hidden")
  } else {
    inputEl.setCustomValidity(errorMessage)
    errorEl.textContent = errorMessage
    errorEl.classList.remove("hidden")
  }
}

export function isValidEmail(email: string): boolean {
  // Simple email validation (char+@char+.char+)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUsername(username: string): boolean {
  // 3-20 chars, letters, numbers, underscores
  return /^[a-zA-Z0-9_]{3,20}$/.test(username)
}

export function isValidPassword(password: string): boolean {
  // 8+ chars, 1 letter and 1 number
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)
}
