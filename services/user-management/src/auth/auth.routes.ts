import bcrypt from "bcrypt"
import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import z from "zod"
import { generate2FAQrCode, generate2FASecret, verify2FACode } from "./2fa.js"
import {
  acceptFriendRequest,
  addFriend,
  createGoogleUser,
  createUser,
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  getUser,
  getUserByUsername,
  rejectFriendRequest,
  removeFriend,
  updateUser,
  userToPublicUser,
} from "./auth.service.js"
import { getGoogleAuthUrl, getGoogleProfile } from "./google.js"
import { clearJWT, getJWT, setJWT } from "./jwt.js"
import {
  PUBLIC_FRIEND_REQUEST_SCHEMA,
  PUBLIC_FRIENDSHIP_SCHEMA,
  PUBLIC_USER_SCHEMA,
  PUBLIC_VALIDATION_ERROR_SCHEMA,
} from "./schemas.js"

export async function authRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/google", {
    schema: {
      response: { 200: z.object({ url: z.string() }) },
    },
  }, async (req, res) => {
    res.send({ url: getGoogleAuthUrl() })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/google/callback", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: z.object({ code: z.string() }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        202: z.object({ needsTwoFA: z.literal(true), email: z.email() }),
        401: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
        409: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const googleProfile = await getGoogleProfile(req.body.code)
    if (!googleProfile)
      return res.status(401).send({ message: "Invalid Google code" })

    let user = getUser(googleProfile.email)
    // If this user was created with email+pwd, there is no way to check that the previous registrant owns the email,
    // so we prevent login using Google OAuth for that email for security reasons.
    if (user && !user.google_id)
      return res.status(403).send({ message: "Account exists and is not linked to Google" })
    if (user && user.google_id !== googleProfile.id)
      return res.status(409).send({ message: "Google account mismatch" })
    if (!user)
      user = createGoogleUser(googleProfile.email, googleProfile.id)

    if (user.twofa_secret) {
      user.twofa_verify_time = new Date().toISOString()
      updateUser(user)
      return res.status(202).send({ needsTwoFA: true, email: user.email })
    }

    setJWT(res, user)
    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/register", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: z.object({
        email: z.email(),
        password: z.string()
          .min(8, "Password must be at least 8 characters long")
          .max(128, "Password must be at most 128 characters long")
          .regex(/^(?=.*[a-zA-Z])(?=.*\d).+$/, "Password must contain at least one letter and one number"),
        username: z.string()
          .min(3, "Username must be at least 3 characters long")
          .max(20, "Username must be at most 20 characters long")
          .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
          .refine((val) => !val.toLowerCase().includes("user"), { message: "Username cannot contain the word 'user'" }),
      }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        409: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    try {
      // If the user was created using Google OAuth, there is no way to verify that the registrant owns the email,
      // so we prevent registration using email+password for that email for security reasons.
      const passwordHash = await bcrypt.hash(req.body.password, 10)
      const user = createUser(req.body.email, passwordHash, req.body.username)

      setJWT(res, user)
      res.send({ user: userToPublicUser(user) })
    } catch (error) {
      if (error instanceof Error && error.message === "UNIQUE constraint failed: users.email")
        return res.status(409).send({ message: "Email already taken" })
      if (error instanceof Error && error.message === "UNIQUE constraint failed: users.username")
        return res.status(409).send({ message: "Username already taken" })
      throw error
    }
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: z.object({ email: z.email(), password: z.string() }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        202: z.object({ needsTwoFA: z.literal(true), email: z.email() }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    let user = getUser(req.body.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    if (!user.password_hash || !(await bcrypt.compare(req.body.password, user.password_hash)))
      return res.status(401).send({ message: "Invalid credentials" })

    if (user.twofa_secret) {
      user.twofa_verify_time = new Date().toISOString()
      updateUser(user)
      return res.status(202).send({ needsTwoFA: true, email: user.email })
    }

    setJWT(res, user)
    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/logout", {
    schema: {
      response: { 200: z.void() },
    },
  }, async (req, res) => {
    clearJWT(res)
    res.send()
  })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/me", {
    schema: {
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/friends/me", {
    schema: {
      response: {
        200: z.object({ friends: z.array(PUBLIC_FRIENDSHIP_SCHEMA) }),
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    res.send({ friends: getFriends(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/friends/add", {
    schema: {
      body: z.object({ username: z.string() }),
      response: {
        200: z.object({ friends: z.array(PUBLIC_FRIENDSHIP_SCHEMA) }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    const friend = getUserByUsername(req.body.username)
    if (!friend)
      return res.status(404).send({ message: "User not found" })

    try {
      addFriend(user.id, friend.id)
    } catch (error) {
      return res.status(400).send({ message: (error as Error).message, details: [] })
    }

    res.send({ friends: getFriends(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/friends/remove", {
    schema: {
      body: z.object({ username: z.string() }),
      response: {
        200: z.object({ friends: z.array(PUBLIC_FRIENDSHIP_SCHEMA) }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    const friend = getUserByUsername(req.body.username)
    if (!friend)
      return res.status(404).send({ message: "User not found" })

    try {
      removeFriend(user.id, friend.id)
    } catch (error) {
      return res.status(400).send({ message: (error as Error).message, details: [] })
    }

    res.send({ friends: getFriends(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/friends/pending", {
    schema: {
      response: {
        200: z.object({ requests: z.array(PUBLIC_FRIEND_REQUEST_SCHEMA) }),
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    res.send({ requests: getPendingFriendRequests(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().get("/api/user/friends/sent", {
    schema: {
      response: {
        200: z.object({ requests: z.array(PUBLIC_FRIEND_REQUEST_SCHEMA) }),
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    res.send({ requests: getSentFriendRequests(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/friends/accept", {
    schema: {
      body: z.object({ username: z.string() }),
      response: {
        200: z.object({ friends: z.array(PUBLIC_FRIENDSHIP_SCHEMA) }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    const sender = getUserByUsername(req.body.username)
    if (!sender)
      return res.status(404).send({ message: "User not found" })

    try {
      acceptFriendRequest(sender.id, user.id)
    } catch (error) {
      return res.status(400).send({ message: (error as Error).message, details: [] })
    }

    res.send({ friends: getFriends(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/friends/reject", {
    schema: {
      body: z.object({ username: z.string() }),
      response: {
        200: z.object({ requests: z.array(PUBLIC_FRIEND_REQUEST_SCHEMA) }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    const sender = getUserByUsername(req.body.username)
    if (!sender)
      return res.status(404).send({ message: "User not found" })

    try {
      rejectFriendRequest(sender.id, user.id)
    } catch (error) {
      return res.status(400).send({ message: (error as Error).message, details: [] })
    }

    res.send({ requests: getPendingFriendRequests(user.id) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/set-username", {
    schema: {
      body: z.object({
        username: z.string()
          .min(3, "Username must be at least 3 characters long")
          .max(20, "Username must be at most 20 characters long")
          .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
          .refine((val) => !val.toLowerCase().includes("user"), { message: "Username cannot contain the word 'user'" }),
      }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        409: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    try {
      const jwt = getJWT(req)
      if (!jwt)
        return res.status(401).send({ message: "Invalid token" })

      const user = getUser(jwt.email)
      if (!user)
        return res.status(401).send({ message: "Invalid credentials" })

      user.username = req.body.username
      updateUser(user)
      setJWT(res, user)

      res.send({ user: userToPublicUser(user) })
    } catch (error) {
      if (error instanceof Error && error.message === "UNIQUE constraint failed: users.username")
        return res.status(409).send({ message: "Username already taken" })
      throw error
    }
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/set-avatar", {
    schema: {
      body: z.object({
        avatar: z.string()
          .max(3 * 1024 * 1024, "Avatar image size must be less than 3MB")
          .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/, "Avatar must be a valid base64-encoded image"),
      }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    user.avatar = req.body.avatar
    updateUser(user)

    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/2fa/setup", {
    schema: {
      response: {
        200: z.object({ secret: z.string(), qrCode: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    const secret = generate2FASecret(user.email)
    const qrCode = await generate2FAQrCode(secret.otpauth_url!)

    res.send({ secret: secret.base32, qrCode })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/2fa/enable", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: z.object({ secret: z.string(), totp: z.string() }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    if (!verify2FACode(req.body.secret, req.body.totp))
      return res.status(403).send({ message: "Invalid verification code" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    user.twofa_secret = req.body.secret
    updateUser(user)

    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/2fa/disable", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: z.object({ totp: z.string() }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.status(401).send({ message: "Invalid token" })

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    if (!user.twofa_secret)
      return res.status(404).send({ message: "2FA not enabled" })

    if (!verify2FACode(user.twofa_secret, req.body.totp))
      return res.status(403).send({ message: "Invalid verification code" })

    user.twofa_secret = null
    updateUser(user)

    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/2fa/verify", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
    schema: {
      body: z.object({ totp: z.string(), email: z.email() }),
      response: {
        200: z.object({ user: PUBLIC_USER_SCHEMA }),
        400: PUBLIC_VALIDATION_ERROR_SCHEMA,
        401: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const user = getUser(req.body.email)
    if (!user)
      return res.status(404).send({ message: "User not found" })

    if (!user.twofa_secret)
      return res.status(404).send({ message: "2FA not enabled" })

    // Limit the time window to make sure the user did logged in recently (credentials or oauth)
    const maxDuration = 5 * 60 * 1000 // 5 minutes
    if (!user.twofa_verify_time || Date.now() - new Date(user.twofa_verify_time).getTime() > maxDuration)
      return res.status(401).send({ message: "2FA verification time expired" })

    if (!verify2FACode(user.twofa_secret, req.body.totp))
      return res.status(403).send({ message: "Invalid verification code" })

    user.twofa_verify_time = null
    setJWT(res, user)
    res.send({ user: userToPublicUser(user) })
  })

  fastify.withTypeProvider<ZodTypeProvider>().post("/api/user/active", {
    schema: {
      response: {
        200: z.void(),
        401: z.object({ message: z.string() }),
      },
    },
  }, async (req, res) => {
    const jwt = getJWT(req)
    if (!jwt)
      return res.send()

    const user = getUser(jwt.email)
    if (!user)
      return res.status(401).send({ message: "Invalid credentials" })

    updateUser(user)

    res.send()
  })
}
