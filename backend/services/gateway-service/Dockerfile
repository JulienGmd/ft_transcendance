# backend/services/gateway-service/Dockerfile
FROM node:21-alpine

WORKDIR /app

# Copier les fichiers du gateway-service
COPY ft_transcendance/backend/services/gateway-service/package*.json ./
COPY ft_transcendance/backend/services/gateway-service/tsconfig.json ./
COPY ft_transcendance/backend/services/gateway-service/src/ ./src/

# Copier le dossier shared depuis la racine
COPY ft_transcendance/shared/ ./src/shared/

# Installer les dépendances
RUN npm install

# Build du TypeScript
RUN echo "=== Avant build ===" && ls -la src/
RUN npm run build
RUN echo "=== Après build ===" && ls -la dist/

# Vérifier le build
RUN echo "=== Contenu index.js ===" && head -10 dist/index.js
RUN echo "=== Contenu app.js ===" && head -10 dist/app.js

EXPOSE 3000
CMD ["npm", "start"]