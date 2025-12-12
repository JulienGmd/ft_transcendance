# Frontend Service

SPA frontend with client-side routing, caching and auto-import features.

## Features

- Client-side SPA routing with page caching
- Script loading with lifecycle hooks (`onMount`, `onDestroy`)
- TypeScript compilation for client and server
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

```html
<!-- On click, `/public/pages/user/info.html` will be injected in #app -->
<a href="/user/info">Link</a>
```

### Styling

```html
<div class="bg-blue-500 text-primary p-4 rounded">Content</div>
```

### Script Loading

#### Pages scripts

```html
<!-- Load `dist/public/pages/user.js` (transpiled from `src/client/pages/user.ts`) -->
<script src="/public/pages/user.js"></script>
```

```ts
import { showNotify } from "../utils.js" // .js extension is required

// Top level code runs on preload (on <a> hover), use onMount for page load logic
console.log("Page not loaded yet")

// Called by the router before navigating to this page, return false to cancel navigation
export function onGuard(route: string): boolean {
  return !!getUser()
}

// Called by the router when the page is loaded, can be used to query/manipulate DOM, set up event listeners, etc.
export async function onMount(): Promise<void> {
  showNotify("Page loaded")
}

// Called by the router before the page is removed, can be used to clean up window/document event listeners
export function onDestroy(): void {
  showNotify("Page unloaded", "error")
}
```

#### Persistent scripts

Persistent scripts should be imported in _index.html.

```ts
console.log("Persistent script loaded")

window.addEventListener("onPageLoaded", () => {
  console.log("SPA navigation occurred")
})
```

## Configuration

| Variable   | Default       | Description |
| ---------- | ------------- | ----------- |
| `NODE_ENV` | `development` | Environment |
| `PORT`     | `3000`        | Server port |
