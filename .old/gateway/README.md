# Gateway Service

Ce module est une passerelle (API Gateway) pour votre application Node.js.

## Prérequis

- Node.js (v20 ou supérieur recommandé)
- npm
- (Optionnel) Docker

## Installation

````bash
Clonez le dépôt et installez les dépendances :

```bash
npm install
````

## Configuration

Copiez le fichier `.env.example` en `.env` et adaptez les variables selon vos besoins :

```bash
cp .env.example .env
```

## Lancement en développement

```bash
npm run dev
```

## Lancement en production

Compilez le projet puis lancez-le :

```bash
npm run build
npm start
```

## Utilisation avec Docker

Construisez et lancez le conteneur :

```bash
docker build -t gateway .
docker run --env-file .env -p 3000:3000 gateway
```

## Variables d'environnement principales

- `PORT` : Port d'écoute du serveur
- `HOST` : Adresse d'écoute
- `JWT_SECRET` : Clé secrète JWT
- `NATS_URL` : URL du serveur NATS
- `CORS_ORIGINS` : Origines autorisées pour CORS

Pour plus de détails, consultez le fichier `.env.example`.
