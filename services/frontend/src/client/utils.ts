import type { paths } from "@ft_transcendence/shared"

// Check if T correspond to the structure, if so return "application/json" content type
// Should be used like that: ExtractRequestBody<paths["/some/route"]["method"]>
type ExtractRequestBody<T> = T extends {
  requestBody: { content: { "application/json": infer U } }
} ? U
  : {}

// Check if T has responses, if so return an object mapping each response code to its "application/json" content type
// Should be used like that: ExtractResponse<paths["/some/route"]["method"]>
type ExtractResponse<T> = T extends {
  responses: infer R
} ? {
    [K in keyof R]?: R[K] extends { content: { "application/json": infer U } } ? U : void
  }
  : {}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function get<Path extends keyof paths>(url: Path): Promise<ExtractResponse<paths[Path]["get"]>> {
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Include cookies
  })
  // Using `as` because res.status is a number and not only the defined return status in the type.
  return { [res.status]: await res.json() } as ExtractResponse<paths[Path]["get"]>
}

export async function post<Path extends keyof paths>(
  url: Path,
  body: ExtractRequestBody<paths[Path]["post"]>,
): Promise<ExtractResponse<paths[Path]["post"]>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Include cookies
    body: JSON.stringify(body),
  })
  // Using `as` because res.status is a number and not only the defined return status in the type.
  return { [res.status]: await res.json() } as ExtractResponse<paths[Path]["post"]>
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

// TODO these 3 should match zod schemas ou les enlever et afficher l'erreur retourne par le serv
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
