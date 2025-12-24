# ft_transcendence

## Prerequisites

- [Docker engine](https://docs.docker.com/engine/install/)
- [NodeJS](https://nodejs.org/en/download)

## SSL Configuration

The project uses SSL for secure communication between client <-> gateway <-> services.

- SSL certificates (`./shared/certs`) are generated with `make setup` or `make start` or `make dev`.
- Caddy communicates with clients over HTTPS by default.
- All services (auth, frontend, ...) have cert.pem + key.pem copy.
- Caddy have cert.pem copy.
- Internal services run HTTPS servers using these self-signed certificates.
- Caddy reverse proxies requests to services over HTTPS, using the cert.pem to verify service identity.

## Development

### Setup (vscode)

#### Formatters

Prettier is used to format HTML, CSS, dprint is used to format the rest.

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

_`F1 > Reload Window` if formatting doesn't work after installing extensions._

#### Intellisense

- Install [Tailwind extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Scripts

```sh
npm run generate-types # Generate types from OpenAPI specs
npm run create-matches # Create fake matches data for the 1st user in the database
npm run list-users     # List all users in the database
```

## Run

```sh
make dev # Development with live reload
make start # Production
```

## Troubleshoot

### Npm errors on `make dev`: Update NodeJS

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec $SHELL # reload shell
\. "$HOME/.nvm/nvm.sh"
nvm install 25
```
