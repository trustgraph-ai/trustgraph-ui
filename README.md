# TrustGraph UX

Monorepo for TrustGraph's web UI, built with React 19, TypeScript, and Vite.

## Packages

| Package | Description |
|---|---|
| `@trustgraph/trustkit` | Shared component library and design system |
| `@trustgraph/client` | TypeScript client for TrustGraph APIs |
| `@trustgraph/react-provider` | React provider for TrustGraph WebSocket connections |
| `@trustgraph/react-state` | React state management hooks |
| `@trustgraph/portal` | Portal application showcasing all workflows |

## Getting Started

```bash
npm install
npm run build
npm run dev
```

The dev server starts the portal app at `http://localhost:5173`.

## Scripts

- `npm run dev` — Start the portal app dev server
- `npm run build` — Build all packages and the portal app
- `npm run test` — Run tests across client, provider, and state packages
- `npm run lint` — Lint the entire workspace
