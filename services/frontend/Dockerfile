FROM node:20-alpine AS base
# User node have UID=1000 and GID=1000, which corresponds to default user on host
# This fix permissions issues when mounting volumes (e.g. can't rm the dirs dist and node_modules created by docker from host)
USER node
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
