FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm ci
COPY . .
EXPOSE 4000
ENV PORT=4000
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
EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
