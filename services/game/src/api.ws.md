# WebSocket Game API

This page describes the WebSocket API to interact with the Pong game server.

## Connection

- **URL**: `ws(s)://<host>/api/game/ws`
- Authentication: JWT in httpOnly cookie (same as the frontend)

## Client → Server Messages

- `join_normal`: join the normal queue
  ```json
  { "type": "join_normal" }
  ```
- `join_tournament`: join the tournament queue
  ```json
  { "type": "join_tournament" }
  ```
- `leave_queue`: leave the queue
  ```json
  { "type": "leave_queue" }
  ```
- `input`: send a paddle action
  ```json
  { "type": "input", "key": "up"|"down", "action": "press"|"release" }
  ```
- `ping`: ping the server
  ```json
  { "type": "ping" }
  ```

## Server → Client Messages

- `queue_joined`, `queue_left`, `game_found`, `countdown`, `game_start`, `game_sync`, `paddle_update`, `score_update`, `game_over`, `tournament_result`, `error`, `pong`

See the code for detailed payloads (see `ServerMessage` types in both frontend and backend).

## Example Sequence

1. Connect to the WebSocket
2. Send `{ "type": "join_normal" }`
3. Receive `queue_joined`, then `game_found`, then `countdown`, etc.
4. During the game, send `{ "type": "input", ... }` to move the paddle

## Notes

- All commands are JSON.
- Types and payloads are documented in `src/types.ts`.
- To automate a bot or AI, simply implement this protocol.

---

**Contact**: See README or source code for more details.
