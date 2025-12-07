import axios from "axios"
import qs from "querystring"
import config from "../config.js"

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = config.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = config.GOOGLE_REDIRECT_URI

// Utilitaire pour générer l'URL de redirection Google OAuth2
export function getGoogleAuthUrl() {
  const params = qs.stringify({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// Utilitaire pour échanger le code contre le profil Google
export async function getGoogleProfile(code: string) {
  // Échange code contre token
  const tokenRes = await axios.post(
    "https://oauth2.googleapis.com/token",
    qs.stringify({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  )
  const { access_token } = tokenRes.data

  // Récupération du profil utilisateur
  const profileRes = await axios.get(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } },
  )
  return profileRes.data
}
