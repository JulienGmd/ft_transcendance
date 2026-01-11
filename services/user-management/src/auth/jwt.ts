import { JWTUser } from "@ft_transcendence/shared"
import { FastifyReply, FastifyRequest } from "fastify"
import jwt from "jsonwebtoken"
import config from "../config.js"
import { User } from "../db.js"

export function setJWT(res: FastifyReply, user: User): void {
  const content: JWTUser = {
    id: user.id,
    email: user.email,
    username: user.username,
  }

  // RS256 is asymmetric: we sign with private key and verify with public key
  const jwtToken = jwt.sign(content, config.JWT_PRIVATE, { algorithm: "RS256", expiresIn: "365d" })

  res.setCookie("authToken", jwtToken, {
    httpOnly: true, // no javascript access (XSS protection)
    secure: true, // HTTPS only
    sameSite: "lax", // no send from other sites (CSRF protection)
    path: "/", // available for all routes
    maxAge: 365 * 24 * 60 * 60, // 1 year
  })
}

export function getJWT(req: FastifyRequest): JWTUser | null {
  const jwtToken = req.cookies.authToken
  if (!jwtToken)
    return null

  try {
    return jwt.verify(
      jwtToken,
      config.JWT_PUBLIC,
      { algorithms: ["RS256"] },
    ) as JWTUser
  } catch (err) {
    return null
  }
}

export function clearJWT(res: FastifyReply): void {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  })
}
