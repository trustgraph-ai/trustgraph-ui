# Plugin Development Guide

This guide explains how to create a plugin for the TrustGraph UX.
A plugin is a self-contained React component that builds to an IIFE bundle
and loads dynamically at runtime via a `<script>` tag.

The `plugin-playground` package is a minimal working example you can use as
a starting point.

## How it works

The host app exposes shared libraries (React, trustkit, react-provider,
react-state) on `window.TrustKitShared`. Your plugin builds as an IIFE that
receives these as globals instead of bundling its own copies. This means:

- Your plugin shares the host's React instance (hooks and context work).
- You can import any component, hook, or type from `@trustgraph/trustkit`.
- Your bundle only contains your own code.

## Quick start

### 1. Create the project

```
my-plugin/
  src/
    index.ts          # entry point
    MyExplorer.tsx     # your component
  package.json
  vite.config.js
  tsconfig.json
```

### 2. package.json

```json
{
  "name": "@trustgraph/plugin-my-explorer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/my-explorer.iife.js",
  "scripts": {
    "build": "tsc --noEmit && vite build"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@trustgraph/trustkit": "*",
    "@trustgraph/react-provider": "*",
    "@trustgraph/react-state": "*"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@trustgraph/trustkit": "*",
    "@trustgraph/react-provider": "*",
    "@trustgraph/react-state": "*",
    "vite": "^7.3.1"
  }
}
```

If your plugin lives in the monorepo, the `*` workspace references resolve
automatically. For a standalone repo, replace them with `file:` paths to
the built packages:

```json
"@trustgraph/trustkit": "file:../new-ux/packages/trustkit",
"@trustgraph/react-provider": "file:../new-ux/packages/trustgraph-react-provider",
"@trustgraph/react-state": "file:../new-ux/packages/trustgraph-react-state"
```

### 3. vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: __dirname + 'src/index.ts',
      name: 'MyExplorerPlugin',       // window global name
      formats: ['iife'],
      fileName: 'my-explorer',        // output: dist/my-explorer.iife.js
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@trustgraph/trustkit',
        '@trustgraph/react-provider',
        '@trustgraph/react-state',
      ],
      output: {
        globals: {
          'react': 'TrustKitShared.React',
          'react/jsx-runtime': 'TrustKitShared.ReactJSX',
          'react-dom': 'TrustKitShared.ReactDOM',
          '@trustgraph/trustkit': 'TrustKitShared.TrustKit',
          '@trustgraph/react-provider': 'TrustKitShared.ReactProvider',
          '@trustgraph/react-state': 'TrustKitShared.ReactState',
        },
      },
    },
  },
})
```

The `external` and `globals` sections are critical. They tell Vite not to
bundle these libraries and instead reference the host's shared copies at
runtime.

### 4. tsconfig.json

For monorepo plugins:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

For standalone repos, define compiler options directly:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Entry point (src/index.ts)

For a single-component plugin, export a default:

```ts
export { default } from "./MyExplorer";
```

Your component file should use a default export:

```tsx
import { useTheme, SectionLabel } from "@trustgraph/trustkit";

export default function MyExplorer() {
  const { theme } = useTheme();
  return <div style={{ color: theme.text.primary }}>Hello from plugin!</div>;
}
```

### 6. Build

```bash
npm run build
```

This produces `dist/my-explorer.iife.js`.

## Deploying the plugin

### Add to plugins.json

The file at `/config/plugins.json` (volume-mountable in the container)
defines all available plugins:

```json
{
  "id": "my-explorer",
  "title": "My Explorer",
  "icon": "◉",
  "paletteKey": "cyan",
  "description": "A short description for the demo card.",
  "url": "/plugins/my-explorer.iife.js",
  "globalName": "MyExplorerPlugin",
  "placement": "demo"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | URL path and unique key (becomes `/<id>` route) |
| `title` | yes | Display name on the demo card |
| `icon` | yes | Single character or emoji for the card |
| `paletteKey` | yes | Theme palette: amber, blue, cyan, emerald, purple, rose |
| `description` | yes | One-line description for the card |
| `url` | yes | Path to the IIFE bundle (absolute or relative) |
| `globalName` | yes | The `name` field from your vite.config.js |
| `componentName` | no | Named export to use (omit for default export) |
| `screenshot` | no | Path to a screenshot image for the card |
| `placement` | yes | `"demo"` to show on the demos page |

### Copy the bundle

Place the `.iife.js` file where the `url` points to. For the container,
this is typically a volume-mounted `/plugins/` directory.

For local development in the monorepo, add an entry to
`packages/demo/scripts/copy-plugins.mjs` so the build copies it
automatically.

## Multi-component plugins

A single bundle can provide multiple pages. Export named components
instead of a default:

```ts
// src/index.ts
export { RetailAssistant } from "./RetailAssistant";
export { BrandAnalytics } from "./BrandAnalytics";
```

Then use `componentName` in each manifest entry to select which export
to render:

```json
{
  "id": "retail-assistant",
  "url": "/plugins/retail-brand.iife.js",
  "globalName": "RetailBrandPlugin",
  "componentName": "RetailAssistant",
  ...
},
{
  "id": "brand-analytics",
  "url": "/plugins/retail-brand.iife.js",
  "globalName": "RetailBrandPlugin",
  "componentName": "BrandAnalytics",
  ...
}
```

The bundle loads once (cached by URL). Each manifest entry resolves
a different named export from the same global.

## Available imports

Your plugin can import from these packages (all provided by the host):

### @trustgraph/trustkit

UI components and hooks:

- **Components**: `SectionLabel`, `Header`, `LoadingState`, `Card`,
  `SplitPane`, `FilterBar`, `SearchInput`, `GeoMap`, `RawGraphCanvas`,
  `StreamingResponse`, and many more
- **Hooks**: `useTheme`, `useGraphData`, `useRawGraphState`,
  `useRawGraphData`, `useTripleWriter`, `useNodeDetail`
- **Utilities**: `getLocalName`, `getTermValue`, `isUri`, `processTriples`,
  `withGlow`, `toast`
- **Types**: `Theme`, `RawNode`, `RawEdge`, `MapMarker`, `Entity`,
  `DomainKey`

### @trustgraph/react-provider

- `useSocket` - WebSocket connection to the TrustGraph backend
- `useConnectionState` - connection status

### @trustgraph/react-state

- `useSessionStore`, `useWorkspaceStore`, `useSettings` - app state
- `useInference` - LLM inference via the backend
- Types: `Triple`

## Adding your own dependencies

Plugins can bundle their own dependencies (they are not externalized).
Add them as regular `dependencies` in your package.json and import
them normally. They will be included in your IIFE bundle.

For example, `plugin-world-events` bundles `d3-geo`, `topojson-client`,
and `world-atlas` — these are not available from the host.

## Error handling

Every plugin route is wrapped in a `PluginErrorBoundary`. If your
component throws, the error is caught and displayed gracefully without
crashing the host app. During development, check the browser console
for details.

If the plugin bundle fails to load (network error, missing file), the
loader logs a warning and the plugin's demo card is still shown but
the route renders an error state.

## Troubleshooting

**"Plugin did not register global"**: The `globalName` in plugins.json
does not match the `name` in your vite.config.js `build.lib`.

**Hooks throwing "invalid hook call"**: Your plugin is bundling its own
copy of React instead of using the host's. Check that `react`,
`react-dom`, and `react/jsx-runtime` are all listed in
`rollupOptions.external`.

**Types not resolving from @trustgraph/trustkit**: For standalone repos,
rebuild trustkit (`npm run build -w packages/trustkit`) so the
declaration files in `dist/` are up to date.

**Component renders but has no theme**: Make sure you import `useTheme`
from `@trustgraph/trustkit`, not from a relative path.
