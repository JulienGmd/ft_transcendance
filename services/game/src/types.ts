import { JWTUser } from "@ft_transcendence/shared"
import type { WebSocket } from "ws"

export type Player = JWTUser & {
  socket: WebSocket
}
