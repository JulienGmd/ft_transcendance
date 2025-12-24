import { FastifyReply, FastifyRequest } from "fastify"
import jwt from "jsonwebtoken"
import config from "../config"
import { User } from "../db"

export function setJWT(res: FastifyReply, user: User): void {
  const jwtToken = jwt.sign({ email: user.email }, config.JWT_PRIVATE, { algorithm: "RS256", expiresIn: "365d" })

  res.setCookie("authToken", jwtToken, {
    httpOnly: true, // no javascript access (XSS protection)
    secure: true, // HTTPS only
    sameSite: "lax", // no send from other sites (CSRF protection)
    path: "/", // available for all routes
    maxAge: 365 * 24 * 60 * 60, // 1 year
  })
}

export function getJWT(req: FastifyRequest): { email: string } | null {
  const jwtToken = req.cookies.authToken
  if (!jwtToken)
    return null

  try {
    return jwt.verify(jwtToken, config.JWT_PUBLIC, { algorithms: ["RS256"] }) as { email: string }
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
