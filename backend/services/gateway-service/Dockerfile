FROM node:21-alpine AS dev

WORKDIR /app

COPY ft_transcendance/backend/services/gateway-service/package*.json ./
COPY ft_transcendance/backend/services/gateway-service/tsconfig.json ./
COPY ft_transcendance/backend/services/gateway-service/src/ ./src/
COPY ft_transcendance/shared/ ./src/shared/

RUN npm install

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:21-alpine AS build

WORKDIR /app

COPY ft_transcendance/backend/services/gateway-service/package*.json ./
COPY ft_transcendance/backend/services/gateway-service/tsconfig.json ./
COPY ft_transcendance/backend/services/gateway-service/src/ ./src/
COPY ft_transcendance/shared/ ./src/shared/

RUN npm install

RUN npm run build

FROM node:21-alpine AS production

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/dist/ ./dist/

RUN npm install --only=production

EXPOSE 3000
CMD ["npm", "start"]