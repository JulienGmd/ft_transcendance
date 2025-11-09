# Auth Service

## Build & Run (local)

```sh
npm install
npm run start
```

## Build & Run (Docker)

```sh
docker build -t auth .
docker run --env-file .env -p 4000:4000 auth
```

## Configuration via variables d'environnement

- `PORT` (par défaut 4000)
- `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc. (voir `.env.example`)

## Exposer le port

Le service écoute sur le port 4000 (modifiable via la variable d'environnement `PORT`).
