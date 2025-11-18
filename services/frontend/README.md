# Frontend Service

SPA frontend with client-side routing and auto-import features.

## Features

- Client-side SPA routing with page caching
- Auto script import with `<!-- script -->` comment
- TypeScript compilation (server + client)
- Tailwind CSS processing
- Live reload in development

## Structure

```
src/
├── server/           # Fastify server
└── client/           # Client TypeScript

public/
├── _index.html       # SPA template  
└── *.html            # Page content
```

## Development

```bash
# Local development
npm i && npm run dev

# Docker development  
make dev
```

## Production

```bash
# Local build
npm i && npm run build && npm start

# Docker production
make start
```

## Usage

### Routing

URLs map directly to files in the `public/` and `dist/public/` directories:

- `/user/info` serves `/public/user/info.html`
- Auto script import loads `/dist/public/user/info.js`, which is transpiled from `src/client/user/info.ts`

### Navigation

Use standard anchor tags for SPA navigation:

```html
<a href="/some/page">Link</a>
```

### Styling

Use Tailwind classes inline:

```html
<div class="bg-blue-500 text-white p-4 rounded">
  Content here
</div>
```

### Auto Script Import

Add `<!-- script -->` to the first line of HTML files to auto-import corresponding JavaScript files (the file path must match, e.g., `public/some/page.html` imports `dist/public/some/page.js`, which is transpiled from `src/client/some/page.ts`).

## Configuration

| Variable   | Default       | Description |
| ---------- | ------------- | ----------- |
| `PORT`     | `3000`        | Server port |
| `NODE_ENV` | `development` | Environment |
