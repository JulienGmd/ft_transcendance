FROM node:21-alpine AS dev

WORKDIR /app

RUN npm install

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:21-alpine AS build

WORKDIR /app

RUN npm install

RUN npm run build

FROM node:21-alpine AS production

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/dist/ ./dist/

RUN npm install --only=production

EXPOSE 3000
CMD ["npm", "start"]