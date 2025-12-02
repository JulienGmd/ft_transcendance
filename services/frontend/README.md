# Frontend Service

SPA frontend with client-side routing and auto-import features.

## Features

- Client-side SPA routing with page caching
- Script loading with lifecycle hooks (`onMount`, `onDestroy`)
- TypeScript compilation
- Tailwind CSS processing
- Live reload in development

## Structure

```
./
├─ tsconfig.json         # Server typescript config
├─ tsconfig.client.json  # Client typescript config
│
├─ src/
│  ├─ server/            # Fastify server - serve public files
│  └─ client/
│     ├─ tailwind.css    # Theme, base styles, custom classes, etc.
│     ├─ components/     # Reusable HTML components
│     ├─ pages/          # Scripts that have onMount and onDestroy hooks
│     └─ persistent/     # Scripts that persist across page navigation
│  
├─ public/
│  ├─ _index.html        # SPA template
│  ├─ pages/             # Pages content
│  └─ assets/            # Static assets (images, fonts, etc.)
│
└─ dist/
   ├─ server/            # Transpiled `src/server/**.ts`
   └─ public/
      ├─ styles.css      # Processed `src/client/tailwind.css`
      └─ ...             # Transpiled `src/client/**.ts`
```

## Usage

### Navigation

URLs map directly to files in the `public/pages/` directories.
Use standard anchor tags for SPA navigation:

```html
<!-- On click, `/public/pages/user/info.html` will be injected in #app -->
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

- The scripts can have imports and they will be resolved correctly.
- **Important:** Scripts are preloaded on `<a>` hover, so top level code will execute before the page is loaded, use lifecycle hooks instead.

```html
<!-- Load `dist/public/pages/user.js` (transpiled from `src/client/pages/user.ts`) -->
<script src="/public/pages/user.js"></script>
```

Lifecycle hooks:

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
