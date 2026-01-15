# ft_transcendence

## Prerequisites

- [Docker engine](https://docs.docker.com/engine/install/)
- [NodeJS](https://nodejs.org/en/download)

## Development

### Features

- **Live Reload**: Code changes auto reload servers or refresh browser
- **Formatting**: dprint + Prettier
- **OpenAPI Docs**: Auto-generated at `/api/user/docs`
- **Type Safety**: Shared types between frontend/backend

### Setup (vscode)

#### Formatters

Prettier is used to format HTML, CSS, dprint is used to format the rest.

- Install [Dprint extension](https://marketplace.visualstudio.com/items?itemName=dprint.dprint)
- Install [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- Add to Settings.json (F1 > Preferences: Open User Settings (JSON)):
  ```json
  "[json]": {
    "editor.defaultFormatter": "dprint.dprint"
  },
  "[typescript]": {
    "editor.defaultFormatter": "dprint.dprint"
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[tailwindcss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  ```
- Enable [format on save](vscode://settings/editor.formatOnSave)

_`F1 > Reload Window` if formatting doesn't work after installing extensions._

#### Intellisense

- Install [Tailwind extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Scripts

```sh
npm run generate-types # Generate types from OpenAPI specs
npm run create-matches # Create fake matches data for the 1st user in the database
npm run list-users     # List all users in the database
```

## Run

```sh
cp .env.example .env
# Edit .env as needed
make dev   # Development with live reload
make start # Production
```

## How it works

### Architecture Overview

This project implements a **microservices architecture** for a real-time multiplayer Pong game. All services communicate over HTTPS and are orchestrated using Docker Compose.

```
Client (Browser)
    ↓ HTTPS
Nginx (Reverse Proxy)
    ↓ HTTPS
├── Frontend Service (Static SPA)
├── User Management Service (REST API)
└── Game Service (WebSocket)
        ↓ NATS
    User Management (Event Listener)
```

### SSL/TLS Everywhere

- Client ↔ Nginx ↔ Services: HTTPS (self-signed cert)
- Game WebSocket: WSS

### Technology Stack

| Backend                 | Frontend     | Infrastructure |
| ----------------------- | ------------ | -------------- |
| Node.js + TypeScript    | TypeScript   | Docker         |
| Fastify                 | Tailwind CSS | Nginx          |
| SQLite + better-sqlite3 | Canvas API   | SSL            |
| NATS                    | WebSocket    |                |
| JWT (RS256)             |              |                |
| Speakeasy               |              |                |
| Zod                     |              |                |
| bcrypt                  |              |                |

### Services Breakdown

#### 1. **Nginx (Gateway)**

- Entry point for all client requests
- Terminates HTTPS connections
- Routes requests to appropriate microservices:
  - `/api/user/*` → User Management Service
  - `/api/game/*` → Game Service
  - `/*` → Frontend Service
- Handles SSL/TLS for secure communication

#### 2. **Frontend Service**

- Serves the Single Page Application (SPA)
- Provides static assets and HTML pages
- **Server:**
  - Serve static files
  - Hot module replacement in development
- **Client:**
  - SPA
  - Router
  - Navigation guard
  - Lifecycle hooks
  - Component-based architecture
  - Type-safe API client
  - Form validation
  - TailwindCSS
  - Canvas-based game rendering

#### 3. **User Management Service**

- API for authentication and user data
- **Authentication:**
  - Email/password
  - Google OAuth 2.0
  - JWT tokens (secure, lax, HTTP-only cookies)
  - Two-Factor Authentication (2FA)
- **Features:**
  - User profiles
  - Friend system
  - Match history
  - Rate limiting
- **Database Schema:**
  - `users` - User accounts and credentials
  - `friendships` - Friend relationships
  - `match_history` - Game results and statistics
- **NATS Subscriber:**
  - Listens for match results from Game Service
  - Persists match data to database

#### 4. **Game Service**

- WebSocket server
- **Game Modes:**
  - Local (1v1 on same device)
  - Normal (1v1 matchmaking)
  - Tournament (4 players, bracket system)
- **Architecture:**
  - **Engine**: Server-side physics simulation
    - Deterministic ball physics with prediction
    - Paddle movement and collision detection
    - Mathematical trajectory calculation (no loops)
  - **GameManager**: Lifecycle management for active games
  - **Matchmaking**: Queue system
  - **Communication**: WebSocket
- **Server-Authoritative:**
  - All game logic runs on server
  - Client receives state updates for rendering
- **NATS Publisher:**
  - Sends match results to User Management Service

#### 5. **NATS (Message Broker)**

- Pub/Sub messaging between microservices
- Decouples Game Service from User Management Service
- Topics:
  - `match.create` - Game → User Management

## Troubleshoot

### Npm errors on `make dev`: Update NodeJS

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec $SHELL # reload shell
\. "$HOME/.nvm/nvm.sh"
nvm install 25
```
