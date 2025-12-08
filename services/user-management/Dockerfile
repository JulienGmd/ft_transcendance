# Note:
# - certs allow to create https server
# - root package.json defines workspaces

FROM node:22-alpine

WORKDIR /app

COPY certs /certs
COPY package*.json ./
COPY shared ./shared
COPY services/user-management ./services/user-management

RUN npm ci --workspaces
RUN npm run build --workspaces
RUN npm ci --workspaces --production --silent && npm cache clean --force

WORKDIR /app/services/user-management
CMD ["npm", "start"]
