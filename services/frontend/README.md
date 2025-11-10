# Frontend

Frontend service for ft_transcendence which provides a client-side Single Page Application (SPA) and serves static assets using a Fastify server.

## Project Structure

```
src/
├── server/           # Backend code
└── client/           # Client code

public/               # Static HTML files and assets (exposed to /public/*)
├── _index.html       # Main SPA template
├── [.../...].html    # Pages content (will be injected in _index.html #app)
└── [.../...].xxx     # Other static assets (images, etc.)

dist/                 # Compiled typescript
├── server/           # Compiled backend code
└── public/           # Compiled client code (exposed to /public/*.js and /public/*.css)
```

## Routing

The server implements a SPA routing system:

- `/*` - Serves the main `_index.html`.
- `/public/*` - Serves static assets:
  - Files from `dist/public/` (.js, .css)
  - Other files from `public/` (.html, .png, .svg, etc...)

### How it works

- On first navigation, for example on /home, the server will serve `public/_index.html`, which will then request `public/home.html`, cache it and place its content inside #app.
- Anchor tags (`<a>`) are overridden to navigate using the SPA router:
  - On anchor hover, if the corresponding HTML file is not cached, the router will request and cache the file (e.g. `public/user.html`).
  - On anchor click, the router will update #app with the cached content.

### Navigate to a page

`<a href="/some/page">link</a>`

Will load `public/some/page.html` in #app.

### Import a script

`<script src="/public/myscript.js"></script>`

Will serve `dist/public/myscript.js`.

### Import CSS file

`<link rel="stylesheet" href="/public/styles.css">`

Will serve `dist/public/styles.css`.

### Import an image

`<img src="/public/images/logo.png">`

Will serve `public/images/logo.png`.

## Typescript

When running `npm run dev`:

- `src/server` typescript files are transpiled on-the-fly to memory using tsx.
- `src/client` typescript files are transpiled on-the-fly to `dist/public` using `tsconfig.client.json` (browser config).
- `src/client/tailwind.css` is processed to `dist/public/styles.css` using Tailwind CLI in watch mode.

When running `npm run build`:

- `src/server` typescript files are transpiled to `dist/server` using `tsconfig.json` (node config).
- `src/client` files are transpiled to `dist/public` using `tsconfig.client.json` (browser config).
- `src/client/tailwind.css` is processed to `dist/public/styles.css` using Tailwind CLI.

## Environment Variables

- `PORT`: Server port (default: 3000)

## Development

### With Docker

- `make dev`

### Locally

- Install dependencies: `npm i`
- Start development server: `npm run dev`

## Production

### With Docker

- `make start`

### Locally

- Install dependencies: `npm i`
- Build the project: `npm run build`
- Start the server: `npm start`
