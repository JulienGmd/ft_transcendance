# ft_transcendence

## Prerequisites

- [Docker engine](https://docs.docker.com/engine/install/)
- [NodeJS](https://nodejs.org/en/download)

## Development

### Setup (vscode)

#### Formatter

- Install [Dprint extension](https://marketplace.visualstudio.com/items?itemName=dprint.dprint)
- Enable [format on save](vscode://settings/editor.formatOnSave)
- `npm i`
- F1 > Reload Window
- On any typescript file: F1 > Format Document With... > dprint

#### Tailwind intellisense

- Install [Tailwind extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

### Add new service

- Add folder in `services/`
- Copy Dockerfile from another service, change or remove port
- Add service in `docker-compose.yml`
- Add service in `docker-compose.dev.yml`
- Install tsx and add dev rule:
  - `npm i -D tsx`
  - `"dev": "tsx watch src/_index.ts",`

### Run

```sh
make dev
```

## Production

### Run

```sh
make start
```
