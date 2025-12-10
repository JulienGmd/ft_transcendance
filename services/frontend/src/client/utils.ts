import type { paths } from "@ft_transcendence/shared"
import type { FormInputElement } from "./components/formInput.js"
import type { NotificationBannerElement } from "./components/persistent/notificationBanner.js"
import { User } from "./types.js"

// Extract all paths names that have a GET method
// It first create an object type with { "route": "route", "route2": never } then filters the never with [keyof paths]
type GetPaths = {
  [K in keyof paths]: paths[K] extends { get: unknown } ? K : never
}[keyof paths]

// Extract all paths names that have a POST method
// It first create an object type with { "route": "route", "route2": never } then filters the never with [keyof paths]
type PostPaths = {
  [K in keyof paths]: paths[K] extends { post: unknown } ? K : never
}[keyof paths]

// Check if T correspond to the structure, if so return "application/json" content type
// Should be used like that: ExtractRequestBody<"/some/route", "method">
export type ExtractRequestBody<Path extends keyof paths, Method extends keyof paths[Path]> = paths[Path][Method] extends
  {
    requestBody: { content: { "application/json": infer U } }
  } ? U
  : {}

// Check if T correspond to the structure, if so return "query" content type
// Should be used like that: ExtractRequestParams<"/some/route", "method">
export type ExtractRequestParams<Path extends keyof paths, Method extends keyof paths[Path]> =
  paths[Path][Method] extends {
    parameters: { query: infer U }
  } ? U
    : {}

// Check if T has responses, if so return an object mapping each response code to its "application/json" content type
// Should be used like that: ExtractResponse<"/some/route", "method">
export type ExtractResponse<Path extends keyof paths, Method extends keyof paths[Path]> = paths[Path][Method] extends {
  responses: infer R
} ? {
    [K in keyof R]?: R[K] extends { content: { "application/json": infer U } } ? U : void
  }
  : {}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function get<Path extends GetPaths>(
  url: Path,
  params?: ExtractRequestParams<Path, "get">,
): Promise<ExtractResponse<Path, "get">> {
  let fullUrl: string = url
  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    fullUrl += `?${queryString}`
  }

  const res = await fetch(fullUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Include cookies
  })
  // Using `as` because res.status is a number and not only the defined return status in the type.
  const data = res.headers.get("content-length") === "0" ? {} : await res.json()
  return { [res.status]: data } as ExtractResponse<Path, "get">
}

export async function post<Path extends PostPaths>(
  url: Path,
  body: ExtractRequestBody<Path, "post">,
): Promise<ExtractResponse<Path, "post">> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Include cookies
    body: JSON.stringify(body),
  })
  // Using `as` because res.status is a number and not only the defined return status in the type.
  const data = res.headers.get("content-length") === "0" ? {} : await res.json()
  return { [res.status]: data } as ExtractResponse<Path, "post">
}

export function checkEls(els: Record<string, Element | null>): void {
  for (const elName in els) {
    if (!els[elName as keyof typeof els])
      throw new Error(`Element ${elName} not found`)
  }
}

export function inputsValuesToObject(form: Element): Record<string, string> {
  const inputs = form.querySelectorAll<HTMLInputElement>("input[name]")
  const body: Record<string, string> = {}
  inputs.forEach((input) => {
    const name = input.getAttribute("name")
    if (name)
      body[name] = input.value
  })
  return body
}

export function reportFormErrors(
  form: Element,
  validationErrors?: { field: string; message: string }[],
  formError?: string,
): void {
  updateFormValidationErrors(form, validationErrors)
  if (formError)
    getNotificationBanner()?.showErrorMessage(formError)
  else
    getNotificationBanner()?.hide()
}

function updateFormValidationErrors(form: Element, errors?: { field: string; message: string }[]): void {
  const FormInputEls = form.querySelectorAll<FormInputElement>("form-input")
  FormInputEls.forEach((input) => input.clearError())

  errors?.forEach((error) => {
    const input = form.querySelector<FormInputElement>(`form-input[name="${error.field}"]`)
    input?.showError(error.message)
  })
}

export function setUser(user: User | null): void {
  if (user)
    localStorage.setItem("user", JSON.stringify(user))
  else
    localStorage.removeItem("user")
  window.dispatchEvent(new Event("userChanged"))
}

export function getUser(): User | null {
  const user = localStorage.getItem("user")
  return user ? JSON.parse(user) as User : null
}

export function getNotificationBanner(): NotificationBannerElement | null {
  return document.querySelector("notification-banner")
}
