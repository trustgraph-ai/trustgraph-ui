# TrustGraph UX

Monorepo for TrustGraph's web UI, built with React 19, TypeScript, and Vite.

## Packages

| Package | Description |
|---|---|
| `@trustgraph/trustkit` | Shared component library and design system |
| `@trustgraph/client` | TypeScript client for TrustGraph APIs |
| `@trustgraph/react-provider` | React provider for TrustGraph WebSocket connections |
| `@trustgraph/react-state` | React state management hooks |
| `@trustgraph/demo` | Demo application showcasing all workflows |

## Getting Started

```bash
npm install
npm run build
npm run dev
```

The dev server starts the demo app at `http://localhost:5173`.

## Scripts

- `npm run dev` — Start the demo app dev server
- `npm run build` — Build all packages and the demo app
- `npm run test` — Run tests across client, provider, and state packages
- `npm run lint` — Lint the entire workspace
