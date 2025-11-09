FROM alpine:3.22.1

WORKDIR /app

RUN apk add --no-cache nodejs npm

# Copy and npm install first so docker can cache this layer if package.json hasn't changed
COPY package*.json ./
# not using --production because typescript is needed to build
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
