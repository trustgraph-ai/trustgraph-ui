# TrustGraph React Toolkit — Vision & Requirements

## What this is

A modular React component toolkit for building UX experiences on top of
TrustGraph. It provides composable, themeable widgets and data hooks that
can be dropped into any React application — from a single embedded graph
panel to a full multi-view knowledge exploration workspace.

The toolkit builds on the existing `@trustgraph/react-provider` and
`@trustgraph/react-state` packages. It does not replace them — it provides
the UI layer on top.

## Who it's for

- Teams building custom applications that need to visualise, query, or
  explore TrustGraph data
- Developers who want a polished, consistent TG experience without
  building UI from scratch
- Internal use: the TrustGraph demo/reference app is itself built entirely
  from toolkit components

## Design principles

### Composable, not monolithic

Every component is independently useful. Import a graph renderer without
pulling in the query panel. Use a search widget without importing the
ontology viewer. The toolkit is tree-shakeable — consumers pay only for
what they use.

### No framework opinions

The toolkit does not impose routing, state management libraries, or
application structure. Components accept props and expose callbacks.
Hooks return data. The app developer decides how to wire things together.

### Widgets as data producers and consumers

Widgets can produce output data (a selected node, a set of search results,
embeddings) and accept input data (entities to highlight, a filter to
apply). The toolkit does not wire widgets to each other — the app
developer controls data flow between them. Widgets expose their outputs
via hooks and callbacks, and accept inputs via props.

This means:
- A search widget can feed results into a graph widget
- A node selection in a graph can populate a detail panel
- An embedding result set can drive a data table
- All of these connections are explicit, not implicit

### Multi-instance data contexts (channels)

The data layer is not a global singleton. Data connectivity is managed
through **channels** — named, shared data contexts that hold a
TrustGraph connection, collection, and all cached state. A single
`TrustGraphProvider` wraps the entire application and manages channels
dynamically:

```tsx
<TrustGraphProvider>
  {/* Two independent data contexts on the same page */}
  <GraphCanvas channel="sales" connection={connA} collection="sales" />
  <QueryPanel channel="sales" />

  <GraphCanvas channel="research" connection={connB} collection="research" />
  <QueryPanel channel="research" />
</TrustGraphProvider>
```

Channels are created dynamically on first use — the first component or
hook to reference a channel name with connection details creates it.
Subsequent references join by name. Components that don't specify a
channel use `"default"`, so simple single-connection apps don't need to
think about channels at all.

Cross-channel data flow is possible but always explicit — the app
developer chooses to pipe data from one channel into another.

### Controllable data persistence

Channel state lives in the provider, not in individual components.
Mounting and unmounting components does not destroy cached data — a tab
switch that unmounts a graph does not lose the fetched entities. When
the graph remounts with the same channel name, the data is still there.

The application controls data lifecycle through explicit actions:
- `resetChannel(name)` — clears cached data, keeps connection alive
- `destroyChannel(name)` — tears down connection and removes all state

Nothing is cleared automatically on component unmount. The application
decides when information is wiped, not the component lifecycle.

### Themeable

The toolkit ships with a default dark theme that matches the current
TrustGraph look and feel. Consumers can:

- Switch between dark and light modes
- Override the colour scheme (palette, semantic colours, surfaces, borders)
- Override layout spacing and typography on individual components
- Apply their own styling approach (CSS modules, styled-components,
  Tailwind, inline styles) via className and style prop escape hatches

### TypeScript-first

All components, hooks, and utilities export full TypeScript types.
Data structures for entities, triples, ontology elements, and
relationships are part of the public API.

### Accessible

Components support keyboard navigation, screen reader announcements,
and ARIA attributes. Interactive elements are focusable and operable
without a mouse.

### Responsive

Components work at different sizes — a graph canvas in a full viewport,
a sidebar, or a small embedded panel. Layout adapts rather than assuming
a fixed page structure.

## Requirements

### Theming & styling

- [ ] Default dark theme preserving current look and feel
- [ ] Light theme
- [ ] Theme provider with full palette/spacing/typography override
- [ ] Per-component style and className overrides
- [ ] Consistent design tokens (colour, spacing, typography, radii, shadows)

### Component library

- [ ] Graph visualisation (canvas and/or SVG, node/edge customisation)
- [ ] Node detail panel
- [ ] Query/chat panel (agent interaction)
- [ ] Ontology viewer
- [ ] Data/schema search
- [ ] Embeddings search
- [ ] Filter bar and filter controls
- [ ] Common primitives: Card, Badge, SearchInput, LoadingState, Toast

### Data hooks

- [ ] Triple fetching and caching
- [ ] OWL/RDF parsing (classes, properties, instances)
- [ ] Entity and relationship extraction
- [ ] Ontology schema resolution
- [ ] Embeddings and graph embeddings
- [ ] Chat/agent interaction
- [ ] Composable — small hooks that combine, not monolithic hooks
- [ ] Persistence-aware — consumer controls data lifecycle

### Data architecture

- [ ] Provider-scoped data contexts (not global singletons)
- [ ] Multiple independent data contexts on one page
- [ ] Widgets expose outputs via hooks/callbacks, accept inputs via props
- [ ] Cross-context data flow is explicit, not automatic

### Build & packaging

- [ ] Tree-shakeable ES module output
- [ ] No bundled React — peer dependency
- [ ] Works with Vite, Next.js, CRA, and other React build tools
- [ ] Monorepo structure: toolkit package + demo/reference app

### Quality

- [ ] Full TypeScript types exported
- [ ] Accessible (keyboard, screen reader, ARIA)
- [ ] Responsive at different container sizes
- [ ] No routing or state management library imposed on consumers

## Future

Requirements not in scope for the initial toolkit but planned for later:

- [ ] **Multilingual / i18n support** — all user-facing text in components
  should be externalisable so the toolkit can be used in non-English
  applications. This includes labels, placeholders, status messages,
  ARIA descriptions, and any text the toolkit renders. The approach
  (key-based lookup, render props, or integration with a standard i18n
  library) is TBD.
