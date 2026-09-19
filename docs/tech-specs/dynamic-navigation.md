# Dynamic Navigation — Tech Spec

## Problem statement

### Where we are

The portal's navigation is driven by `components.json`, a static
manifest that declares tabs, each containing a flat list of components.
Every tab renders the same card-grid layout (`DemosPage`), and every
component gets a permanent route at `/<component-id>`. Clicking a card
navigates to that route.

This was sufficient when the portal was a catalogue of independent
tools, but as the product matures the navigation model is hitting
limits.

### What's missing

1. **No parameterised navigation.** There is no way to navigate to a
   component with context — e.g. "open the Graph RAG page with this
   query pre-filled" or "open the ontology viewer focused on this
   class." Every route is a bare `/<id>` with no parameters, query
   strings, or state transfer. Users who discover something in one
   component must manually re-enter context when they switch to another.

2. **All tabs are card grids.** Every tab renders the same `DemosPage`
   layout — a title, description, and grid of component cards. There
   is no way to make a tab do something richer: a search page, a
   workspace overview dashboard, a getting-started wizard, or a
   context-sensitive landing page. The recently added `component` field
   on tab sections is a first step, but there is no broader design for
   what these custom tab components can do or how they interact with
   the navigation system.

3. **No programmatic navigation with intent.** Components cannot
   express "when the user clicks this, take them to view X on tab Y
   with parameters Z." There is no shared vocabulary for describing a
   navigation target beyond a route string. This means:
   - A demo app can't offer a "try this query" button that opens
     Graph RAG with the query pre-loaded.
   - An ontology viewer can't link to "ingest documents using this
     ontology."
   - A search results page can't route clicks to the right component
     with the right context.
   - A workspace overview can't deep-link into specific tools with
     workspace-relevant state.

### What this creates

- **Dead-end experiences.** Each component is an island. Users
  navigate away, lose context, and start over.

- **No cross-component workflows.** Multi-step tasks that span
  components (explore → query → ingest → explore again) require the
  user to manually carry context between pages.

- **Limited tab utility.** Tabs that could be powerful entry points
  (search, overview, getting-started) can't exist because the only
  tab layout is a card grid.

- **Rigid for deployers.** A deployer who wants a custom landing page,
  a guided onboarding flow, or a domain-specific dashboard has no
  mechanism to wire one in.

## Design goals

1. **Parameterised routes.** Components can receive parameters through
   the URL or navigation state, so context transfers naturally between
   views.

2. **Custom tab components.** Tabs can render any component — not just
   the card grid — loaded via the existing plugin architecture.

3. **Intent-based navigation.** A shared mechanism for expressing
   "navigate to component X with context Y" that works across plugins,
   builtins, and custom tab components.

4. **Backward compatibility.** Existing `components.json` files
   continue to work unchanged. New capabilities are opt-in.

5. **Deployer control.** Everything remains configuration-driven.
   Deployers can customise navigation, landing pages, and cross-links
   without modifying source code.

## Current architecture

### components.json structure

```json
[
  {
    "title": "Section Title",
    "description": "Section description text.",
    "tab": "tab-key",
    "navLabel": "Tab Label",
    "navIcon": "⌂",
    "components": [
      {
        "id": "component-id",
        "title": "Component Title",
        "icon": "◈",
        "paletteKey": "emerald",
        "description": "Short description.",
        "url": "/plugins/plugin.iife.js",
        "globalName": "PluginGlobal",
        "componentName": "ExportName",
        "screenshot": "/screenshot.jpg"
      }
    ]
  }
]
```

### Routing (App.tsx)

- Each unique `tab` value generates a route `/<tab>` that renders
  `DemosPage` (or a custom `TabComponent` if the section specifies one).
- Each component with a resolved `Component` gets a route
  `/<component-id>`.
- Navigation is `useNavigate("/<id>")` — no parameters, no state.

### Plugin loading (usePluginManifest.ts)

- Remote plugins are loaded via `loadRemotePlugin(url, globalName)`.
- Builtins are registered in a `BUILTIN_COMPONENTS` map.
- Tab-level components are resolved via an optional `component` field
  on sections.

## Design exploration

### Navigation model: declarative vs imperative

The fundamental question: what does a navigation URL *mean*?

#### Option A: Intent-based (object + action, caller doesn't choose the component)

The caller describes *what* they want to happen — an object and an
action — and the routing system decides which component handles it.
The caller doesn't know or care which component will render.

```
navigate({ object: "urn:doc:abc123", action: "view" })
navigate({ object: "urn:ontology:Risk", action: "edit" })
navigate({ type: "query", action: "run", params: { q: "..." } })
```

The system resolves the intent to a component based on registered
handlers, object type, installed plugins, or configuration.

**Pros:**
- Loose coupling — callers don't depend on specific components,
  so plugins can be swapped without changing call sites
- Extensible — a new plugin can register as a handler for an
  object type and existing navigation links automatically route
  to it
- Domain-driven — navigation speaks the language of the data
  ("view this entity") not the UI ("open component X")
- Multiple components could handle the same object type — the
  system can offer a choice or apply a default

**Cons:**
- Needs a resolution mechanism — a registry or convention that
  maps (object type, action) → component, adding framework
  complexity
- Ambiguity — if multiple plugins can handle the same intent,
  who wins? Needs conflict resolution
- Harder to debug — "why did I end up here?" requires
  understanding the resolution rules
- Indirection can surprise plugin authors — the target may change
  depending on what's installed
- Risk of over-engineering if most navigations are actually
  "go to this known component"

#### Option B: Direct invocation (caller names the component)

The caller specifies exactly which component to open and what
parameters to pass. The caller knows the target.

```
navigate({ component: "graph-rag", params: { q: "..." } })
navigate({ component: "explore", params: { entity: "urn:doc:abc123" } })
```

**Pros:**
- Simple and predictable — what you ask for is what you get
- Easy to debug — the target is explicit in the call
- No resolution mechanism needed — no registry, no ambiguity
- Easy for plugin authors to understand — "call this ID with
  these args"
- Works well for known, stable components (builtins, first-party
  plugins)

**Cons:**
- Tight coupling — callers must know component IDs, so swapping
  a plugin means updating all call sites
- Not extensible — a new plugin that handles the same data type
  better won't automatically receive existing navigations
- Fragile — if a component is renamed, removed, or not installed,
  callers break silently
- Cross-component links in configuration (components.json) become
  a maintenance burden — renaming a component means updating
  every reference

#### Option C: Support both

Provide both mechanisms. Intent-based navigation for when the caller
doesn't know or care which component handles it, and direct
invocation for when the caller knows exactly where to go. The
framework offers both and the caller picks what fits.

```
// Intent-based — system resolves the handler
navigate({ object: "urn:doc:abc123", action: "view" })

// Direct — caller names the target
navigate({ component: "graph-rag", params: { q: "..." } })
```

**Pros:**
- Covers all use cases — loose coupling where it matters, simple
  direct calls where it doesn't
- Incremental adoption — start with direct invocation (easy),
  add intent handlers as the plugin ecosystem matures
- Plugin authors choose the right tool — builtins can use direct
  calls, extensible actions can use intents

**Cons:**
- Two navigation patterns to learn and maintain
- Risk of inconsistency — when should a caller use which? Needs
  clear guidance or conventions
- More framework surface area — both a resolution registry and
  direct routing must be supported and tested
- Could lead to a mix of styles across the codebase if conventions
  aren't established early

## Use cases

### Search

- Full-screen search component, likely a custom tab
- User types a query, system searches graph embeddings
- Results are objects from the knowledge graph — each result shows
  entity label, type, description
- Each result can have contextual action buttons depending on the
  entity type:
  - **Ontology view** — `{ view: "ontology", entity: "urn:..." }`
  - **Entity explorer** — `{ view: "explore", entity: "urn:..." }`
  - **Graph RAG** — `{ view: "graph-rag", q: "Tell me about ..." }`
- The search component doesn't know which components are installed —
  it knows the *kind of thing* the result is and what actions make
  sense for that kind
- Implies intent-based: search shouldn't hard-code component IDs,
  it should say "view this entity" and let the system resolve it
- View actions should say "view this in a graph viewer" not "open
  component X" — the routing system picks the appropriate viewer
- Advanced: multiple graph viewers could be installed (e.g. raw
  graph, domain-specific explorer) — routing could choose based on
  the entity's ontology class or graph structure
- Simple case: one default graph viewer, intent resolves to it
- Complex case: entity is a `GameTheoryPlayer` → route to the game
  theory explorer; entity is a `SpaceMission` → route to the solar
  missions explorer; fallback to raw graph viewer

### Component menu (card grid)

- The existing `DemosPage` card grid — user sees a list of
  components and clicks one
- Caller knows exactly which component to open — it's the one the
  user clicked
- No object context, no action to resolve — just "go to this
  component"
- Implies direct invocation: `{ component: "graph-rag" }`
- Intent-based adds nothing here — the user already made the choice

### Tab navigation

- User clicks a tab in the header bar
- Navigates to a known, fixed route — the tab key
- No parameters, no context, no resolution needed
- Implies direct invocation: `{ component: "demos" }`
- Simplest possible case — just a route change

## Recommended model

### Core navigation primitive

Every navigation action is expressed as two optional parameters —
at least one must be present:

- **intent** — a short alphanumeric string describing what the user
  wants to do (e.g. `view`, `edit`, `search`)
- **target** — an IRI identifying the object to act on
  (e.g. `urn:entity:abc123`, `urn:component:graph-rag`)

```ts
interface NavigationRequest {
  intent?: string;
  target?: string;
  params?: Record<string, string>;
}
```

Both are optional, but at least one must be provided:
- Intent only: `{ intent: "search" }` — open search, no specific
  target
- Target only: `{ target: "urn:entity:abc123" }` — default intent
  (view) for this entity
- Both: `{ intent: "edit", target: "urn:entity:abc123" }` — edit
  this specific entity

### URL scheme

The URL encodes intent and target as path segments. The router
distinguishes them by shape: alphanumeric = intent, contains `:`
with a scheme = target IRI.

```
/search                                → intent only
/urn:entity:abc123                     → target only, default intent
/view/urn:entity:abc123                → intent + target
/edit/urn:entity:abc123                → intent + target
/urn:tab:home                          → target only (tab)
/urn:component:graph-rag               → target only (component)
```

Additional parameters are passed as query string arguments on the
URL. These are forwarded to the resolved component as-is:

```
/view/urn:entity:abc123?param1=str&param2=str2
/search?q=lithium+supply+chain
/urn:component:graph-rag?q=What+are+the+key+risks
```

Single segment for the common case, two segments when an explicit
intent is needed. URLs are bookmarkable and shareable — re-opening
a URL re-resolves through the router, so reconfigured routing
applies automatically.

### How use cases map

| Use case | Intent | Target | URL |
|---|---|---|---|
| Search page | `search` | — | `/search` |
| View entity | — | `urn:entity:abc123` | `/urn:entity:abc123` |
| View in ontology | `ontology` | `urn:class:Risk` | `/ontology/urn:class:Risk` |
| Edit entity | `edit` | `urn:entity:abc123` | `/edit/urn:entity:abc123` |
| Card grid click | — | `urn:component:graph-rag` | `/urn:component:graph-rag` |
| Tab click | — | `urn:tab:demos` | `/urn:tab:demos` |

### Resolution

The router resolves a `NavigationRequest` to a component. The
default router does simple string matching against `routes.json`.

- Target-only with `urn:component:` or `urn:tab:` namespace —
  direct routing, no lookup needed
- Target-only with other namespaces — look up default intent for
  that namespace, then match in routes
- Intent-only — match intent in routes with no target constraint
- Intent + target — match both in routes, most specific wins

### Pluggable router

The default router does string matching against `routes.json`. For
advanced deployments, the router itself is configurable — e.g. a
graph-aware router that checks an entity's `rdf:type` to pick the
right viewer.

Configured in `navigation.json`:

```json
{
  "router": {
    "url": "/plugins/custom-router.iife.js",
    "globalName": "CustomRouter"
  }
}
```

Omit `router` for the built-in string matcher.

### Intents and the knowledge graph

Intents are short alphanumeric strings in the UI and URL (`view`,
`edit`, `search`). When stored in the knowledge graph, a convention
prefix is applied (e.g. `view` → `urn:intent:view`). The mapping
is trivial — the short form is the UI concept, the IRI form is the
graph concept. This means an ontology class could declare its
preferred viewer intent as graph data.

### Additional parameters

Some navigations need more than intent + target (e.g. a query
string, a return-to breadcrumb). These travel in the `params` bag
and appear as URL query parameters for bookmarkability.

## Configuration

Currently `components.json` is a monolithic file combining tab
definitions, component metadata, and implicit routing. Split into
separate files, each handling one concern.

### `navigation.json` — top-level navigation config

Global navigation settings: default tab and optional custom router.

```json
{
  "default": "home",
  "router": {
    "url": "/plugins/custom-router.iife.js",
    "globalName": "CustomRouter"
  }
}
```

Omit `router` for the built-in string-matching router.

### `tabs.json` — tab bar structure

What tabs exist, their labels, icons, and ordering. Each tab
specifies a target IRI — clicking it navigates to that target.

```json
[
  {
    "label": "Workflows",
    "icon": "⌂",
    "target": "urn:tab:home"
  },
  {
    "label": "Demos",
    "icon": "▷",
    "target": "urn:tab:demos"
  },
  {
    "label": "Search",
    "icon": "⌕",
    "target": "urn:tab:search"
  }
]
```

The `default` in `navigation.json` references a tab target. Tabs
are just navigation entries — they don't know which component
renders them.

### `components.json` — loadable components

What components are available. Each entry is a loadable component
with an optional `config` path pointing to component-specific
configuration.

```json
[
  {
    "id": "home-grid",
    "url": "/plugins/card-grid.iife.js",
    "globalName": "CardGridPlugin",
    "config": "/config/tabs/home.json"
  },
  {
    "id": "demos-grid",
    "url": "/plugins/card-grid.iife.js",
    "globalName": "CardGridPlugin",
    "config": "/config/tabs/demos.json"
  },
  {
    "id": "search",
    "url": "/plugins/search.iife.js",
    "globalName": "SearchPlugin"
  },
  {
    "id": "graph-rag",
    "url": "/plugins/graph-rag.iife.js",
    "globalName": "GraphRagPlugin"
  },
  {
    "id": "solar-missions",
    "url": "/plugins/solar-missions.iife.js",
    "globalName": "SolarMissionsPlugin"
  }
]
```

Builtins don't need entries here — they're registered in code.

The `config` field points to a file whose shape is defined by the
component, not the framework. A card grid component might expect:

```json
{
  "title": "TrustGraph Workflows",
  "description": "Each workflow demonstrates how trustkit components compose.",
  "cards": [
    {
      "title": "Graph RAG Query",
      "icon": "◉",
      "paletteKey": "blue",
      "description": "Ask questions with knowledge graph provenance.",
      "screenshot": "/graph-rag.jpg",
      "target": "urn:component:graph-rag"
    }
  ]
}
```

A search component might need no config at all. The framework
fetches the file and passes it as a prop — it doesn't interpret
the contents.

### `routes.json` — intent → component mapping

Maps intents (and optionally object types) to components. This is
the handler registry.

```json
[
  {
    "target": "urn:tab:home",
    "component": "home-grid"
  },
  {
    "target": "urn:tab:demos",
    "component": "demos-grid"
  },
  {
    "target": "urn:tab:search",
    "component": "search"
  },
  {
    "intent": "view",
    "targetType": "urn:ontology:GameTheoryPlayer",
    "component": "game-theory"
  },
  {
    "intent": "view",
    "component": "explore",
    "priority": 0
  }
]
```

Matching rules:
- Exact `target` match wins outright
- `intent` + `targetType` match wins over intent-only match
- `priority` breaks ties between equally specific routes
- Fallback routes have no `target` or `targetType` constraint

### Deployment benefits

- **Add a plugin** — drop the JS file, add to `components.json`,
  add a route to `routes.json`. No other files change.
- **Customise a tab** — edit that tab's config file without
  touching routing or component loading.
- **Add a tab** — add to `tabs.json`, add a route in
  `routes.json`, add a component entry if needed.
- **Override a viewer** — change one line in `routes.json` to
  point an intent at a different component.
- **Reuse components** — the same card-grid plugin can power
  multiple tabs, each with its own config file.
- **Custom routing** — swap in a graph-aware router via
  `navigation.json` without touching any other config.
- **Customer deployments** — ship different `tabs.json` and tab
  config files per customer while sharing components and routes.
