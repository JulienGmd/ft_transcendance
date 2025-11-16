# ft_transcendence

## Prerequisites

- [Docker engine](https://docs.docker.com/engine/install/)
- [NodeJS](https://nodejs.org/en/download)

## Development

### Setup (vscode)

#### Formatter

- Install [Dprint extension](https://marketplace.visualstudio.com/items?itemName=dprint.dprint)
- Install [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- Add to Settings.json (F1 > Preferences: Open User Settings (JSON)):
  ```json
  "[json]": {
    "editor.defaultFormatter": "dprint.dprint"
  },
  "[typescript]": {
    "editor.defaultFormatter": "dprint.dprint"
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[tailwindcss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  ```
- Enable [format on save](vscode://settings/editor.formatOnSave)
- `make setup`
- F1 > Reload Window

#### Intellisense

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
