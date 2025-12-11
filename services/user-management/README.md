# User Management

Fastify server for handling authentication and user profiles.

## Features

- User registration and login
- OAuth2 integration (Google)
- User profile management
- JWT-based authentication
- sqlite database
- RESTful API endpoints
- OpenAPI documentation
- Schema validation with Zod
- Secure password hashing with bcrypt

## Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services** → **Credentials**
4. Click on **Create Credentials** → **OAuth client ID**
5. If necessary, configure the OAuth consent screen
6. Application type: **Web application**
7. Name: `Transcendence Auth`
8. **Authorized redirect URIs**: `https://localhost:8080/auth/google/callback`
9. Copy the **Client ID** and **Client Secret**

## Configuration

Create a `.env` file in the with the following variables:

| Variable               | Default            | Description                |
| ---------------------- | ------------------ | -------------------------- |
| `NODE_ENV`             | `development`      | Environment                |
| `PORT`                 | `3000`             | Server port                |
| `NATS_URL`             | `nats://nats:4222` | NATS server URL            |
| `JWT_SECRET`           |                    | Secret for signing JWTs    |
| `GOOGLE_CLIENT_ID`     |                    | Google OAuth Client ID     |
| `GOOGLE_CLIENT_SECRET` |                    | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI`  |                    | Google OAuth Redirect URI  |
