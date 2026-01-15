import { navigate } from "../../../persistent/router.js"
import { post, setUser, showNotify, sleep } from "../../../utils.js"

let code = ""

export function onGuard(route: string): boolean {
  code = new URLSearchParams(route.split("?")[1]).get("code") || ""
  return !!code
}

export async function onMount(): Promise<void> {
  await sleep(3000)
  const data = await post("/api/user/google/callback", { code })
  if (data[200]) {
    setUser(data[200].user)
    navigate("/", "Login successful")
  } else if (data[202])
    navigate(`/2fa/verify?email=${encodeURIComponent(data[202].email)}`)
  else if (data[401])
    navigate("/login", "Google authentication failed, please try again", "error")
  else if (data[403])
    navigate("/login", "An account already exists with this email, please login using your password", "error")
  else if (data[429])
    showNotify("Too many tries, try again later", "error")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
