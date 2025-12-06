import type { ApiEndpoint } from "./types.d.ts"

interface User {
  id: number
  email: string
  twofa_enabled: boolean
  username?: string
  avatar?: string
  google_id?: string
}

interface MatchData {
  id: number
  player1_id: number
  player2_id: number
  player1_score: number
  player2_score: number
  player1_precision: number
  player2_precision: number
  winner_id: number
  created_at: string
  player1_username?: string
  player2_username?: string
}

interface PlayerStats {
  totalMatches: number
  totalWins: number
  globalPrecision: number
}

// /api/user/me
interface ApiUserMeGetRequest {}
interface ApiUserMeGetResponse {
  user: User
}
type ApiUserMeGetEndpoint = ApiEndpoint<ApiUserMeGetRequest, ApiUserMeGetResponse>

// /api/user/login
interface ApiUserLoginPostRequest {
  email: string
  password: string
}
interface ApiUserLoginPostResponse {
  user?: User
  needsTwoFA: boolean
}
type ApiUserLoginPostEndpoint = ApiEndpoint<ApiUserLoginPostRequest, ApiUserLoginPostResponse>

// /api/user/register
interface ApiUserRegisterPostRequest {
  username: string
  email: string
  password: string
}
interface ApiUserRegisterPostResponse {
  user: User
}
type ApiUserRegisterPostEndpoint = ApiEndpoint<ApiUserRegisterPostRequest, ApiUserRegisterPostResponse>

// /api/user/logout
interface ApiUserLogoutPostRequest {}
interface ApiUserLogoutPostResponse {
  success: boolean
}
type ApiUserLogoutPostEndpoint = ApiEndpoint<ApiUserLogoutPostRequest, ApiUserLogoutPostResponse>

// /api/user/set-avatar
interface ApiUserSetavatarPostRequest {
  avatar: string
}
interface ApiUserSetavatarPostResponse {
  success: boolean
}
type ApiUserSetavatarPostEndpoint = ApiEndpoint<ApiUserSetavatarPostRequest, ApiUserSetavatarPostResponse>

// /api/user/set-username
interface ApiUserSetusernamePostRequest {
  username: string
}
interface ApiUserSetusernamePostResponse {
  success: boolean
}
type ApiUserSetusernamePostEndpoint = ApiEndpoint<ApiUserSetusernamePostRequest, ApiUserSetusernamePostResponse>

// /api/user/2fa/setup
interface ApiUser2FASetupPostRequest {}
interface ApiUser2FASetupPostResponse {
  secret: string
  qrCode: string
}
type ApiUser2FASetupPostEndpoint = ApiEndpoint<ApiUser2FASetupPostRequest, ApiUser2FASetupPostResponse>

// /api/user/2fa/enable
interface ApiUser2FAEnablePostRequest {
  secret: string
  totp: string
}
interface ApiUser2FAEnablePostResponse {
  success: boolean
}
type ApiUser2FAEnablePostEndpoint = ApiEndpoint<ApiUser2FAEnablePostRequest, ApiUser2FAEnablePostResponse>

// /api/user/2fa/disable
interface ApiUser2FADisablePostRequest {}
interface ApiUser2FADisablePostResponse {
  success: boolean
}
type ApiUser2FADisablePostEndpoint = ApiEndpoint<ApiUser2FADisablePostRequest, ApiUser2FADisablePostResponse>

// /api/user/2fa/verify
interface ApiUser2FAVerifyPostRequest {
  code: string
}
interface ApiUser2FAVerifyPostResponse {
  success: boolean
}
type ApiUser2FAVerifyPostEndpoint = ApiEndpoint<ApiUser2FAVerifyPostRequest, ApiUser2FAVerifyPostResponse>

// /api/user/matches/player/:playerId
interface ApiUserMatchesPlayerGetRequest {}
interface ApiUserMatchesPlayerGetResponse {
  matches: MatchData[]
}
type ApiUserMatchesPlayerGetEndpoint = ApiEndpoint<ApiUserMatchesPlayerGetRequest, ApiUserMatchesPlayerGetResponse>

// /api/user/matches/player/:playerId/stats
interface ApiUserMatchesPlayerStatsGetRequest {}
interface ApiUserMatchesPlayerStatsGetResponse {
  stats: PlayerStats
}
type ApiUserMatchesPlayerStatsGetEndpoint = ApiEndpoint<
  ApiUserMatchesPlayerStatsGetRequest,
  ApiUserMatchesPlayerStatsGetResponse
>
