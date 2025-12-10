import { navigate } from "../../../persistent/router.js"
import { post, setUser } from "../../../utils.js"

export async function onMount(): Promise<void> {
  const code = new URLSearchParams(window.location.search).get("code")

  if (!code) {
    navigate("/login")
    return
  }

  const data = await post("/api/user/google/callback", { code })
  if (data[200]) {
    setUser(data[200].user)
    navigate("/")
  } else if (data[202])
    navigate(`/2fa/verify?email=${encodeURIComponent(data[202].email)}`)
  else if (data[401])
    navigate("/login")
  else if (data[403])
    navigate("/login")
  else
    throw new Error("Unexpected response from server: " + JSON.stringify(data))
}
