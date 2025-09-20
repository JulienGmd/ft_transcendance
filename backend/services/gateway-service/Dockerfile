FROM node:21-alpine

WORKDIR /app

COPY ft_transcendance/backend/services/gateway-service/package*.json ./
COPY ft_transcendance/backend/services/gateway-service/tsconfig.json ./
COPY ft_transcendance/backend/services/gateway-service/src/ ./src/

COPY ft_transcendance/shared/ ./src/shared/

RUN npm install

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]