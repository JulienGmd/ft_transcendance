FROM node:20-alpine AS base
ARG UID=1000
ARG GID=1000
RUN apk add --no-cache shadow && rm -rf /home/node && usermod -u $UID node && groupmod -g $GID node
WORKDIR /app
COPY package*.json ./

FROM base AS development
# Install all dependencies
RUN npm ci
COPY . .
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
# Install production dependencies
RUN npm ci --production --silent && npm cache clean --force
# Execute builder stage and copy built files
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
