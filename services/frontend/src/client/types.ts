import { paths } from "@ft_transcendence/shared"

type Get200Response<T> = T extends {
  responses: { 200: { content: { "application/json": infer U } } }
} ? U
  : {}

export type User = Get200Response<paths["/api/user/me"]["get"]>["user"]
export type Stats = Get200Response<paths["/api/user/stats/me"]["get"]>["stats"]
export type Match = Get200Response<paths["/api/user/matches/me"]["get"]>["matches"][0]
