# ft_transcendence

## Prerequisites

- [Docker engine](https://docs.docker.com/engine/install/)
- [NodeJS](https://nodejs.org/en/download)

## Development

### Setup (vscode)

- Install [dprint extension](https://marketplace.visualstudio.com/items?itemName=dprint.dprint)
- Enable [format on save](vscode://settings/editor.formatOnSave)

### Add new service

- Add folder in `services/`
- Add service in `docker-compose.yml`
- Add service in `docker-compose.dev.yml` (if auto reload needed)

### Run

```sh
make dev
```

## Production

### Run

```sh
make start
```
