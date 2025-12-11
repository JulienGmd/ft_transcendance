import { navigate } from "../../../persistent/router.js"
import { post, setUser, sleep } from "../../../utils.js"

export async function onMount(): Promise<void> {
  const code = new URLSearchParams(window.location.search).get("code")

  if (!code) {
    navigate("/login")
    return
  }

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
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
