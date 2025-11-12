# Frontend Service

A Single Page Application (SPA) frontend service built with TypeScript and Fastify that serves static assets and provides client-side routing for the ft_transcendence project.

## Features

- Client-side SPA routing with HTML page caching
- TypeScript compilation for both server and client code
- Tailwind CSS processing
- Static asset serving
- Development and production builds

## Project Structure

```
src/
├── server/           # Fastify server code
└── client/           # Client-side TypeScript and styles

public/               # Static assets
├── _index.html       # Main SPA template
├── *.html            # Page content (injected into #app)
└── assets/           # Images, icons, etc.

dist/                 # Compiled output
├── server/           # Compiled server code
└── public/           # Compiled client code and styles
```

## Routing

### Server Routes

- `/*` - Serves the main SPA (`_index.html`)
- `/public/*` - Serves static assets (JS, CSS, images, HTML)

### Client-side Navigation

- Navigation links: `<a href="/some/page">Link</a>`

Anchor tags (`<a>`) are enhanced to provide SPA navigation with lazy loading and caching:

- On hover: Pages are preloaded and cached if not already available
- On click: Cached content is instantly injected into the `#app` element

## Development

### Prerequisites

- Node.js
- Docker (optional)

### Development Guidelines

- **Client code**: `src/client/` for TypeScript logic
- **HTML pages**: `public/**/*.html` for page content
- **Assets**: `public/assets/` for images and static files
- **Styling**: Use Tailwind classes inline, avoid separate CSS files

```html
<div class="bg-blue-500 text-white p-4 rounded">
  <h2 class="text-xl font-bold">Card Title</h2>
  <p class="text-sm">Card content</p>
</div>
```

### Development Features

- **Auto Refresh**: Browser automatically refreshes when frontend code changes
- **Auto Restart**: Server automatically restarts when backend code changes

### Local Development

```bash
npm i
npm run dev
```

### Docker Development

```bash
make dev
```

## Production

### Local Build

```bash
npm i
npm run build
npm start
```

### Docker Production

```bash
make start
```

## Configuration

| Variable   | Description                                      | Default       |
| ---------- | ------------------------------------------------ | ------------- |
| `PORT`     | Server port                                      | `3000`        |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |

## Build Process

### Development Mode

- Server: TypeScript transpiled in memory in watch mode
- Client: TypeScript transpiled to `dist/public/` with browser config in watch mode
- Styles: Tailwind CSS processed to `dist/public/styles.css` in watch mode

### Production Mode

- Server: TypeScript transpiled to `dist/server/`
- Client: TypeScript transpiled to `dist/public/`
- Styles: Tailwind CSS processed and optimized
