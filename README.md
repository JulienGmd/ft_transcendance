# ft_transcendence

## Prerequisites

- [Docker engine](https://docs.docker.com/engine/install/)
- [NodeJS](https://nodejs.org/en/download)

## SSL Configuration

The project uses SSL for secure communication between client <-> gateway <-> services.

- Caddy communicates with clients over HTTPS (using self-signed certificates in localhost).
- All services (auth, frontend, ...) have `cert.pem` and `key.pem` (mounted from `./certs` to `/certs`).
- Internal services run HTTPS servers using these self-signed certificates.
- Caddy has `cert.pem` (mounted from `./certs/cert.pem` to `/certs/cert.pem`).
- Caddy reverse proxies requests to services over HTTPS, using the cert, so services can trust Caddy.

## Development

### Setup (vscode)

#### Formatter

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
- `make setup`
- F1 > Reload Window

#### Intellisense

- Install [Tailwind extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### Add new service

- Add folder in `services/`
- Copy paste `Dockerfile` and `tsconfig.json` from another service
- Copy paste and rename service block in `docker-compose.yml` and `docker-compose.dev.yml`
- Add `package.json`:
  ```ts
  {
    "name": "servicename",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "scripts": {
      "dev": "tsx watch src/server/_index.ts",
      "build": "tsc",
      "start": "node dist/server/_index.js"
    },
    "devDependencies": {
      "@types/node": "^22.7.4",
      "tsx": "^4.20.6",
      "typescript": "^5.6.3"
    },
    "dependencies": {
      "fastify": "^5.6.1"
    }
  }
  ```
- Add `src/_index.ts`:
  ```ts
  import Fastify from "fastify"

  // Create HTTPS server (/certs mounted from ./certs in docker-compose.yml)
  const fastify = Fastify({
    https: {
      key: readFileSync("/certs/key.pem"),
      cert: readFileSync("/certs/cert.pem"),
    },
  })

  // Routes
  fastify.get("/user/dashboard", async (req, res) => res.send({ some: "data" }))

  // Start server
  await fastify.listen({ port: 3000, host: "0.0.0.0" })
  ```
- Add in `caddy/Caddyfile` (will redirect all `/user/*` requests to the new service):
  ```
  reverse_proxy /user/* https://servicename:3000 {
  	transport http {
  		tls
  		tls_trusted_ca_certs /certs/cert.pem
  	}
  }
  ```

### Run

```sh
make dev
```

## Production

### Run

```sh
make start
```
