# Frontend Service

SPA frontend with client-side routing and auto-import features.

## Features

- Client-side SPA routing with page caching
- Script loading with lifecycle hooks (`onMount`, `onDestroy`)
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
├── *.html            # Page content
└── assets/           # Static assets (images, fonts, etc.)
```

## Usage

### Navigation

URLs map directly to files in the `public/` directories.
Use standard anchor tags for SPA navigation:

```html
<!-- On click, `/public/user/info.html` will be injected in #app -->
<a href="/user/info">Link</a>
```

### Styling

Use Tailwind classes inline:

```html
<div class="bg-blue-500 text-white p-4 rounded">
  Some content
</div>
```

### Script Loading

Scripts are extracted from `<script src="...">` tags in the HTML and loaded dynamically.

Notes:

- JS and CSS files are served on the `/public/*` routes, even if they are in `dist/public/.
- The scripts can have imports and they will be resolved correctly.

```html
<!-- This will load `dist/public/page.js`, which is transpiled from `src/client/page.ts` -->
<script src ="/public/page.js"></script>
```

Lifecycle events:

- `onMount()` is called when the page loads
- `onDestroy()` is called before navigating away

```ts
export function onMount(): void {}
export function onDestroy(): void {}
```

### Run

```sh
npm i && npm run dev # Local development
make dev # Docker development
```

## Production

### Run

```bash
npm i && npm run build && npm start # Local build
make start # Docker production
```

## Configuration

These are set in Dockerfile.

| Variable   | Description | Development   | Production   |
| ---------- | ----------- | ------------- | ------------ |
| `PORT`     | Server port | `3000`        | `3000`       |
| `NODE_ENV` | Environment | `development` | `production` |
