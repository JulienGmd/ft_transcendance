import z from "zod"

export const PUBLIC_USER_SCHEMA = z.object({
  email: z.email(),
  username: z.string().nullable(),
  avatar: z.string().nullable(),
})
export type PublicUser = z.infer<typeof PUBLIC_USER_SCHEMA>
