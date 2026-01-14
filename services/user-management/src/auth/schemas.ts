import z from "zod"

export const PUBLIC_USER_SCHEMA = z.object({
  email: z.email(),
  username: z.string(),
  avatar: z.string().nullable(),
  twofa_enabled: z.boolean(),
})
export type PublicUser = z.infer<typeof PUBLIC_USER_SCHEMA>

export const PUBLIC_FRIENDSHIP_SCHEMA = z.object({
  username: z.string(),
  last_active_time: z.string(),
})
export type PublicFriendship = z.infer<typeof PUBLIC_FRIENDSHIP_SCHEMA>

export const PUBLIC_FRIEND_REQUEST_SCHEMA = z.object({
  username: z.string(),
  created_at: z.string(),
})
export type PublicFriendRequest = z.infer<typeof PUBLIC_FRIEND_REQUEST_SCHEMA>

export const PUBLIC_MATCH_SCHEMA = z.object({
  p1_username: z.string(),
  p2_username: z.string(),
  p1_score: z.number(),
  p2_score: z.number(),
  p1_precision: z.number(),
  p2_precision: z.number(),
  winner_username: z.string().nullable(),
  created_at: z.string(),
})
export type PublicMatch = z.infer<typeof PUBLIC_MATCH_SCHEMA>

export const PUBLIC_STATS_SCHEMA = z.object({
  numMatches: z.number(),
  numWins: z.number(),
  precision: z.number(),
})
export type PublicStats = z.infer<typeof PUBLIC_STATS_SCHEMA>

export const PUBLIC_VALIDATION_ERROR_SCHEMA = z.object({
  message: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })),
})
export type PublicValidationError = z.infer<typeof PUBLIC_VALIDATION_ERROR_SCHEMA>
