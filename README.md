# SPA

## Prerequesites

[Docker engine](https://docs.docker.com/engine/install/)
[NodeJS](https://nodejs.org/en/download)

## Development

### Setup (vscode)

Install [dprint extension](https://marketplace.visualstudio.com/items?itemName=dprint.dprint)

### Run

```sh
# Inside docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# Or locally
npm i
npm run dev
```

## Production

### Run

```sh
docker compose up --build
```
