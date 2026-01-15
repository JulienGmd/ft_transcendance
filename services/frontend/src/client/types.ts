import { paths } from "@ft_transcendence/shared"

type Extract200Response<Path extends keyof paths, Method extends keyof paths[Path]> = paths[Path][Method] extends {
  responses: { 200: { content: { "application/json": infer U } } }
} ? U
  : {}

export type User = Extract200Response<"/api/user/me", "get">["user"]
export type Stats = Extract200Response<"/api/user/stats", "get">["stats"]
export type Match = Extract200Response<"/api/user/matches", "get">["matches"][0]
export type Friend = Extract200Response<"/api/user/friends/me", "get">["friends"][0]
export type FriendRequest = Extract200Response<"/api/user/friends/pending", "get">["requests"][0]
