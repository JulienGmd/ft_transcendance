FROM alpine:latest

RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY . .

CMD ["node", "dist/index.js"]
