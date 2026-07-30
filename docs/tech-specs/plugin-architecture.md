# Plugin Architecture — Tech Spec

## Problem statement

### The tension

TrustKit is a public, open-source toolkit. Some visualization modules
built on top of it — such as customer's own / user's own
are private and/or the user's own IP.  There should be a way of loading
them without adding to this public repository.

Today, every module is hardcoded into trustkit's barrel export
(`src/index.ts`) and the demo app's route table. There is no way to
ship a subset of modules publicly while keeping others private without
maintaining a fork or manually stripping files before release.

### What this creates

- **All-or-nothing publishing.** Every module ships in the public
  package, or someone has to manually delete files and edit imports
  before each release. Both are unsustainable.

- **Tight coupling in the demo app.** The demo app imports every
  explorer by name and wires each one into its route table. Adding a
  module means touching the demo app — removing one means breaking it.

- **No path for external contributions.** A partner or customer who
  builds a domain-specific explorer has nowhere to put it. It either
  goes into the public repo or it doesn't integrate at all.

- **Monolithic bundle.** Consumers who only need the graph components
  still pull in every explorer, hook, and data model in the package.

### What we need

A plugin architecture that lets visualization modules live in separate
packages, repos or bundles (public or private) and register themselves at
runtime so that:

1. The public trustkit repo has **zero references** to private modules —
   no imports, no route entries, no type dependencies.

2. A private package (e.g. `@acme-corp/insider-trading`) can add
   modules that appear in the demo app without modifying the demo app's
   source code.

3. The demo app renders whatever modules are installed — nothing more,
   nothing less.

4. Each module is self-describing: it declares its own name, route,
   icon, and entry component.

5. Tree-shaking still works — unused modules are not bundled.

### Why plugins can't self-register

A plugin living in a separate repo or private package has no way to
inject itself into the running app — it isn't part of the bundle.
The app must be told what plugins exist and where to load them.

This means the app needs a **plugin manifest** supplied at launch time:
a list of modules to load, where to fetch them from, and enough
metadata to wire them into the UI (name, route, icon, etc.) before
the plugin code has even arrived.

This is a user-facing requirement, not just an implementation detail:
deployers need to control which modules appear in their instance
without rebuilding the app. A customer running a private deployment
should be able to add their own explorers by updating a configuration,
not by forking the source.

---

## Design

### Plugin descriptor

A plugin is a plain object describing one UI module. The interface
mirrors the existing `DemoCard` / `WorkflowCard` shapes already used
in the demo app's landing pages — so migration is mechanical.

```typescript
// trustkit/src/plugin/types.ts

import type { ComponentType } from "react";
import type { ThemePalette } from "../theme/types";

type PluginPlacement = "workflow" | "demo";

interface TrustKitPlugin {
  id: string;                        // unique key, doubles as route path
  title: string;                     // card title
  icon: string;                      // card icon
  paletteKey: keyof ThemePalette;    // card colour
  description: string;               // card subtitle
  placement?: PluginPlacement;       // "workflow" | "demo" (default: "demo")
  screenshot?: string;               // optional card thumbnail
  component: ComponentType;          // the React component to render
}
```

Notes:
- `id` doubles as the route path (`/risk`, `/solar-missions`). One
  concept, one field.
- `component` is a resolved `ComponentType`, not a lazy reference.
  Code-splitting is handled by the loading mechanism, not the
  descriptor.
- No `props` field. Plugins use hooks internally (`useTheme`,
  `useSocket`, etc.), matching the existing pattern where most
  explorer props interfaces are empty.
- Components that require shell-level props (e.g. `GraphView` with
  `activeFilter`) are **not plugins** — they remain direct routes.

### Plugin manifest

The manifest is an array of entries supplied at app launch time. Each
entry provides metadata synchronously (for rendering cards before
code loads) and a loading strategy for the component.

```typescript
interface PluginMeta {
  id: string;
  title: string;
  icon: string;
  paletteKey: keyof ThemePalette;
  description: string;
  placement?: PluginPlacement;
  screenshot?: string;
}

type PluginManifestEntry =
  | { type: "static"; plugin: TrustKitPlugin }
  | PluginMeta & {
      type: "lazy";
      load: () => Promise<{ default: ComponentType }>;
    }
  | PluginMeta & {
      type: "remote";
      url: string;
    };

type PluginManifest = PluginManifestEntry[];
```

Why metadata is duplicated in lazy entries: the landing page needs
title/icon/description to render cards *before* the plugin chunk has
loaded. The component itself arrives only when the user navigates to
the route. A `definePlugin` helper can reduce the boilerplate.

### Loading strategies

**Static** — component is already bundled. Used for built-in modules
during migration or modules that are always needed.

**Lazy** — `load()` returns a dynamic `import()`. Vite code-splits
these automatically into separate chunks. This is the default for
most plugins, including all existing explorers.

**Remote** — the manifest entry carries a URL. The registry fetches
the ES module at runtime and extracts the default export as the
component. The caller never writes `import(url)` — they declare
`{ type: "remote", url: "https://plugins.acme.com/widget.js" }` and
the registry handles the fetch internally. This keeps the loading
mechanism explicit (not inferred from whether an import argument is a
string literal or variable) and encapsulated (if the underlying
fetch strategy needs to change — e.g. from dynamic `import()` to a
`<script type="module">` tag — plugin authors don't notice).

Remote plugins must be compiled as ES modules that export a default
React component. They must externalise React and ReactDOM so they
share the host app's instance (multiple React instances on one page
break Context and Hooks).

The URL can be absolute (`https://plugins.acme.com/widget.js`) or
relative (`/plugins/widget.js`). Relative URLs resolve against the
app's origin, which is convenient when plugins are served from the
same domain as the app itself.

### Registry

A function that resolves a manifest into a list of ready-to-render
plugins:

```typescript
// trustkit/src/plugin/registry.ts

interface ResolvedPlugin {
  id: string;
  title: string;
  icon: string;
  paletteKey: keyof ThemePalette;
  description: string;
  placement: PluginPlacement;
  screenshot?: string;
  Component: ComponentType;  // React.lazy-wrapped for lazy entries
}

function resolvePlugins(manifest: PluginManifest): ResolvedPlugin[];
```

For `static` entries, `Component` is the component directly. For
`lazy` entries, it wraps `load()` in `React.lazy()`. The consumer
wraps rendering in `<Suspense>`.

### Reliability

**Error boundaries.** Any dynamically loaded code can fail — network
errors, incompatible exports, runtime exceptions. Every plugin route
must be wrapped in a React error boundary so a single broken plugin
doesn't crash the entire app. The boundary should show a meaningful
error state (plugin name, retry option) rather than a blank screen.

**React instance sharing.** Remote plugins must use the same React
instance as the host app. If a remote bundle ships its own copy of
React, hooks and context will silently break. Remote plugin builds
must externalise `react` and `react-dom`. The registry should
validate this where possible (e.g. check that the loaded module
doesn't define its own `useState`).

**Loading states.** Lazy and remote plugins have visible load times.
The `<Suspense>` fallback should use trustkit's `LoadingState`
component for visual consistency. Remote plugins may take longer;
consider a timeout after which the error boundary activates.

### What lives where

**In trustkit** (public):
- `src/plugin/types.ts` — interfaces and type exports
- `src/plugin/registry.ts` — `resolvePlugins()`
- `src/plugin/define.ts` — `definePlugin()` helper to reduce
  boilerplate
- `src/plugin/index.ts` — barrel export
- `src/plugins/*.ts` — one descriptor file per built-in explorer,
  exported as secondary entry points
  (`@trustgraph/trustkit/plugins/risk`, etc.)

**In demo app** (deployment-specific):
- `src/plugins.ts` — the manifest, assembling built-in + optional
  private plugins
- `src/App.tsx` — consumes `resolvePlugins()`, renders plugin routes
  and passes plugin list to landing pages
- Route rendering and `<Suspense>` wrappers stay in the demo app
  (avoids adding `react-router-dom` as a trustkit peer dependency)

**In private packages** (e.g. `@acme-corp/explorers`):
- Exports a manifest fragment (`PluginManifest` array)
- Depends on `@trustgraph/trustkit` as a peer dependency
- Zero references to it in the public repo

### How the demo app wires it up

```typescript
// demo/src/plugins.ts
import { definePlugin } from "@trustgraph/trustkit";

export const manifest: PluginManifest = [
  // Built-in explorers, code-split
  definePlugin(
    { id: "risk", title: "Risk Management", icon: "🛡",
      paletteKey: "rose", description: "Enterprise risk explorer..." },
    () => import("@trustgraph/trustkit/plugins/risk"),
  ),
  // ... other built-ins

  // Private plugins (only present when package is installed)
  // ...privateManifest,
];
```

```typescript
// demo/src/App.tsx (simplified)
const plugins = resolvePlugins(manifest);

<Routes>
  {/* Shell routes that take props — not plugins */}
  <Route path="/" element={<HomePage plugins={plugins} ... />} />
  <Route path="/demos" element={<DemosPage plugins={plugins} ... />} />
  <Route path="/graph" element={<GraphView {...graphProps} />} />

  {/* All plugin routes */}
  {plugins.map(p => (
    <Route key={p.id} path={`/${p.id}`} element={
      <Suspense fallback={<LoadingState />}>
        <p.Component />
      </Suspense>
    } />
  ))}
</Routes>
```

`HomePage` and `DemosPage` filter plugins by `placement` and render
cards from the plugin metadata, replacing the current hardcoded arrays.

### Migration path

The migration is gradual. Each step is independently deployable.

1. **Add plugin infrastructure to trustkit** — types, registry,
   `definePlugin` helper. No existing code changes.

2. **Create plugin descriptors for built-in explorers** — one file per
   explorer in `src/plugins/`. Add secondary entry points to
   `package.json` exports. Configure Vite to build them as separate
   chunks.

3. **Create `demo/src/plugins.ts`** — the manifest file listing all
   built-in explorers.

4. **Refactor landing pages** — `HomePage` and `DemosPage` accept a
   `plugins` prop alongside their existing hardcoded cards. Render
   both. Migrate cards one at a time.

5. **Refactor App.tsx routes** — replace hardcoded explorer routes with
   the plugin loop. Keep shell routes (graph, ingest, etc.) as-is.

6. **Clean up** — remove hardcoded card arrays and single-line page
   wrappers (e.g. `RiskPage.tsx` = `<RiskExplorer />`).

7. **Private plugins** — private repo creates its own package with a
   manifest fragment. Demo app imports and spreads it.
