# Note:
# - certs allow to create https server
# - root package.json defines workspaces

FROM node:22-alpine AS base

WORKDIR /app

COPY certs /certs
COPY package*.json ./
COPY shared ./shared
COPY services/frontend ./services/frontend

RUN npm ci --workspaces

FROM base AS development
CMD ["npm", "run", "dev", "--workspaces"]

FROM base AS production
RUN npm run build --workspaces
CMD ["npm", "run", "start", "--workspaces"]
