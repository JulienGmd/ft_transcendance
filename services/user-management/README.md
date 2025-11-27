# Auth Service

## Configuration Google OAuth

### 1. Créer les credentials Google OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez ou sélectionnez un projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur **Create Credentials** → **OAuth client ID**
5. Si nécessaire, configurez l'écran de consentement OAuth
6. Type d'application: **Web application**
7. Nom: `Transcendence Auth`
8. **Authorized redirect URIs**: 
   ```
   https://localhost:8080/auth/google/callback
   ```
9. Copiez le **Client ID** et **Client Secret**

### 2. Configurer le fichier `.env`

Copiez `.env.example` vers `.env` et remplissez les valeurs:

```sh
cp .env.example .env
```

Éditez `.env` et remplacez:
- `GOOGLE_CLIENT_ID`: votre Client ID de Google
- `GOOGLE_CLIENT_SECRET`: votre Client Secret de Google
- `JWT_SECRET`: générez une longue chaîne aléatoire

## Build & Run (local)

```sh
npm install
npm run dev
```

## Build & Run (Docker)

```sh
docker build -t auth-service .
docker run --env-file .env -p 3000:3000 auth-service
```

## Configuration via variables d'environnement

- `JWT_SECRET` - Secret pour signer les tokens JWT
- `GOOGLE_CLIENT_ID` - Client ID de Google OAuth
- `GOOGLE_CLIENT_SECRET` - Client Secret de Google OAuth
- `GOOGLE_REDIRECT_URI` - URI de callback (par défaut: `https://localhost:8080/auth/google/callback`)

## Exposer le port

Le service écoute sur le port 3000 en HTTPS.

