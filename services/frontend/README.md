# Frontend

Frontend service for ft_transcendence which provides a client-side Single Page Application (SPA) and serves static assets using a Fastify server.

## Project Structure

```
src/
├── server/           # Backend code
└── public/           # Client code

public/               # Static HTML files and assets (exposed to /public/*)
├── _index.html       # Main SPA template
├── [.../...].html    # Pages content (will be injected in _index.html #app)
└── [.../...].xxx     # Other static assets (CSS, images, etc.)

dist/                 # Compiled typescript
├── server/           # Compiled backend code
└── public/           # Compiled client code (exposed to /public/*.js)
```

## Routing

The server implements a SPA routing system:

- `/*` - Serves the main `_index.html`.
- `/public/*` - Serves static assets:
  - Javascript files from `dist/public/` (.js)
  - Other files from `public/` (.html, .css, .png, etc...)

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

Will serve `public/styles.css`.

### Import an image

`<img src="/public/images/logo.png">`

Will serve `public/images/logo.png`.

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
