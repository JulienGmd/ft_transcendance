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
- **Important:** Scripts are preloaded on `<a>` hover, so top level code will execute before the page is loaded, use lifecycle hooks instead.

```html
<!-- Load `dist/public/page.js` (transpiled from `src/client/page.ts`) -->
<script src="/public/page.js"></script>
```

Lifecycle events:

- `onMount()` is called after the page HTML is injected, can be used to query, manipulate DOM and set up event listeners. Can be async.
- `onDestroy()` is called before the page HTML is removed, can be used to clean up event listeners.

```ts
console.log("Page not loaded yet")

export async function onMount(): Promise<void> {
  console.log("Page loaded")
}

export function onDestroy(): void {
  console.log("Page will be removed")
}
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
