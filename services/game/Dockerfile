FROM node:22-alpine AS base

# For healthcheck
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY services/game ./services/game

RUN npm ci --workspaces

FROM base AS development
RUN npm run build --workspace=shared
CMD ["npm", "run", "dev", "--workspaces"]

FROM base AS production
RUN npm run build --workspaces
CMD ["npm", "run", "start", "--workspaces"]
