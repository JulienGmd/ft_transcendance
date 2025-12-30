import { JWTUser } from "@ft_transcendence/shared"
import { FastifyRequest } from "fastify"
import { readFileSync } from "fs"
import jwt from "jsonwebtoken"

export async function getJWT(req: FastifyRequest): Promise<JWTUser | null> {
  const jwtToken = req.cookies.authToken
  if (!jwtToken)
    return null

  try {
    const publicKey = readFileSync("/secrets/jwt/public.pem").toString()
    return jwt.verify(jwtToken, publicKey, { algorithms: ["RS256"] }) as JWTUser
  } catch (err) {
    return null
  }
}
