# Runtime UX Tailoring — Tech Spec

## Problem statement

### The tension

TrustGraph's UX is currently static — the pages, toolbar actions, and
on-screen guidance are baked into code. Different deployments have
different users with different needs: an analyst exploring a knowledge
graph for the first time needs orientation; a developer debugging an
agent pipeline does not. There is currently no way to tailor the
experience at deploy-time without modifying source code.

### What this creates

- **No onboarding path.** New users land on pages with no context
  about what they're looking at or what to do next. Help text would
  need to be hardcoded per page and would ship to every deployment
  whether relevant or not.

- **No deploy-time customisation.** A customer who wants a "Report a
  bug" button, a link to their internal docs, or a welcome message
  for their team has no mechanism to add one without forking the app.

- **Rigid landing pages.** The Workflows and Demos pages are driven
  by `plugins.json`, but the page titles, descriptions, and structure
  are hardcoded. A deployment that uses different terminology or wants
  a different framing cannot change it.

### What we need

A runtime tailoring system that lets deployers customise three aspects
of the UX through configuration (not code):

1. **Guidance overlays** — dismissible, markdown-formatted help
   messages that appear on specific pages to orient users.

2. **Custom action buttons** — toolbar-level buttons (with icon and
   label) that open markdown content overlays, useful for linking to
   external resources, bug trackers, documentation, etc.

3. **Landing page tailoring** — customisable titles, descriptions,
   and framing for the Workflows and Demos index pages via the
   existing `plugins.json` manifest.

---

## Design

### 1. Guidance overlays

A guidance overlay is a floating, dismissible card that appears on a
page to provide contextual help. It is identified by a free-text
string ID that is scoped to the page — IDs only need to be unique
within a single config key, not globally across the app. Pages embed
`<GuidanceBanner id="some-id" />` components at points where guidance
is relevant — if the fetched config contains an entry with that ID,
the banner renders; if not, nothing appears.

#### Content source

Guidance content is stored in config-svc as a standard config entry:

- **type:** `ui-guidance`
- **key:** a page or view identifier, e.g. `"workflows"`,
  `"graph-rag-query"`, `"agent-config"`
- **value:** an array of guidance entries

Each page fetches its own key and receives a list of guidance items.
This allows multiple overlays per page (e.g. one for the query input,
one for the results panel) without any cross-page coordination.

```typescript
// Config-svc record
// type: "ui-guidance", key: "graph-rag-query"
// value:
GuidanceEntry[]

interface GuidanceEntry {
  id: string;           // page-local ID, matched by <GuidanceBanner>
  title?: string;       // optional heading
  body: string;         // markdown content
  color?: string;       // accent colour (theme palette key or hex)
  position?: Position;  // where the overlay appears on screen
}

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right";
```

IDs are free-text strings — there is no global naming scheme. They
are scoped to the config key (i.e. the page), so `"welcome"` in the
`"workflows"` key and `"welcome"` in the `"agent-config"` key are
independent. The page component decides which IDs it looks for; the
config decides which IDs have content. If a page asks for an ID that
doesn't exist in config, nothing renders.

#### Positioning

The overlay is positioned using CSS `fixed` placement. The `position`
field maps to anchor points:

| Position       | CSS                              |
|----------------|----------------------------------|
| `top-left`     | `top: 20px; left: 20px`          |
| `top-right`    | `top: 20px; right: 20px`         |
| `bottom-left`  | `bottom: 20px; left: 20px`       |
| `bottom-right` | `bottom: 20px; right: 20px`      |
| `top`          | `top: 20px; left: 50%` centered  |
| `bottom`       | `bottom: 20px; left: 50%` centered |
| `left`         | `top: 50%; left: 20px` centered  |
| `right`        | `top: 50%; right: 20px` centered |

Default position is `bottom-right` (matching the current prototype).

#### Dismissal

- Dismissal is persisted to `localStorage` keyed by the guidance ID.
- A small `?` button remains at the same position after dismissal,
  allowing the user to re-open the guidance.
- Dismissal state is per-browser, not per-user — this is intentional,
  as guidance is about the local user's familiarity, not their
  identity.

#### Markdown rendering

Body content is rendered using `react-markdown`. Links open in a new
tab by default. Styling inherits from the theme (fonts, colours,
line-height).

### 2. Custom action buttons

Custom action buttons appear in the app toolbar (or page-level
toolbar) and behave like guidance overlays triggered by a click
rather than appearing automatically.

#### Content source

Stored in config-svc using the same pattern as guidance:

- **type:** `ui-action-buttons`
- **key:** a toolbar/placement identifier, e.g. `"global"`,
  `"workflows"`, `"graph-explorer"`
- **value:** an array of action button entries

```typescript
// Config-svc record
// type: "ui-action-buttons", key: "global"
// value:
ActionButton[]

interface ActionButton {
  id: string;           // unique within this key
  label: string;        // button text
  icon?: string;        // emoji or icon identifier
  body: string;         // markdown content shown on click
  color?: string;       // button/overlay accent colour
  position?: Position;  // where the overlay appears when opened
  order?: number;       // toolbar position (lower values first)
}
```

#### Behaviour

- Button renders in the toolbar with `icon` and `label`.
- Clicking the button opens a markdown overlay (reusing the same
  `GuidanceBanner` rendering) at the configured `position`.
- Clicking again or pressing the `✕` closes it. No localStorage
  persistence — action button overlays are not "dismissible" in the
  onboarding sense; they toggle on demand.

#### Examples

- A "Report Bug" button that opens an overlay with a markdown body
  containing a link to the bug tracker.
- A "Quick Start" button that opens a short getting-started guide.
- A "Keyboard Shortcuts" button listing available shortcuts.

#### Config examples

##### Guidance

```json
// type: "ui-guidance", key: "workflows"
[
  {
    "id": "welcome",
    "title": "Welcome to TrustGraph",
    "body": "Each card below represents a different **analysis workflow**.\n\nClick any card to get started, or use the sidebar to switch between workflows at any time.\n\nNeed help? See the [documentation](https://docs.trustgraph.ai/workflows).",
    "color": "cyan",
    "position": "below-right"
  }
]
```

```json
// type: "ui-guidance", key: "graph-rag-query"
[
  {
    "id": "query-input",
    "title": "Ask a question",
    "body": "Type a natural language question about your data. TrustGraph will search the knowledge graph and generate an answer with sources.\n\n**Tips:**\n- Be specific — *\"What companies supply lithium?\"* works better than *\"Tell me about lithium\"*\n- Follow-up questions work too",
    "position": "below"
  },
  {
    "id": "results-panel",
    "title": "Understanding results",
    "body": "Results show the AI-generated answer alongside the **graph evidence** that supports it.\n\nClick any entity in the answer to navigate to it in the graph explorer.",
    "color": "cyan",
    "position": "below-left"
  }
]
```

##### Action buttons

```json
// type: "ui-action-buttons", key: "global"
[
  {
    "id": "report-bug",
    "label": "Report Bug",
    "icon": "🐛",
    "body": "Found a problem? Let us know:\n\n- [Open a bug report](https://github.com/trustgraph-ai/trustgraph/issues/new)\n- [Email support](mailto:support@trustgraph.ai)\n\nPlease include the **page you were on** and **what you expected to happen**.",
    "color": "#EF4444",
    "position": "top-right",
    "order": 10
  },
  {
    "id": "quick-start",
    "label": "Quick Start",
    "icon": "🚀",
    "body": "## Getting started\n\n1. **Choose a workflow** from the home page\n2. **Search** for an entity using the search bar\n3. **Explore** by clicking nodes in the graph\n4. **Ask questions** using the RAG query panel\n\nSee the [full guide](https://docs.trustgraph.ai/quickstart) for more.",
    "color": "cyan",
    "position": "top-right",
    "order": 5
  }
]
```

### 3. Landing page tailoring

The Workflows and Demos index pages currently have hardcoded titles
and descriptions. These should be configurable via `plugins.json`:

```json
{
  "workflows": {
    "title": "Analysis Workflows",
    "description": "Select a workflow to begin exploring your data.",
    "plugins": [ ... ]
  },
  "demos": {
    "title": "Component Demos",
    "description": "Interactive demonstrations of trustkit components.",
    "plugins": [ ... ]
  }
}
```

If `title` or `description` are absent, sensible defaults are used
(matching current hardcoded values). This is a minimal extension of
the existing `plugins.json` schema — no new files or services needed.

---

## Implementation approach

### Phase 1 — Guidance overlays (trustkit component)

1. Extend `GuidanceBanner` to accept `position` prop and render at
   the configured screen anchor.
2. Add `react-markdown` as a trustkit dependency.
3. Accept `body` (markdown string) as an alternative to `children`.
4. Build and test with hardcoded content on the Workflows page.

### Phase 2 — Config-svc integration

1. Define config-svc schema for `ui-guidance` type entries.
2. Add a React hook (`useGuidance(key)`) that fetches the guidance
   array for a given page key and provides a lookup-by-ID function.
3. `GuidanceBanner` becomes config-aware: `<GuidanceBanner id="x" />`
   looks up content from the hook, renders nothing if no entry with
   that ID exists in the fetched array.

### Phase 3 — Custom action buttons

1. Define config-svc schema for `ui-action-buttons` type entries.
2. Build `ActionButton` component that renders in toolbars and
   toggles a `GuidanceBanner`-style overlay on click.
3. Add a hook (`useActionButtons(key)`) that fetches configured
   buttons for a given placement key.
4. Wire into the global toolbar and page-level toolbars.

### Phase 4 — Landing page tailoring

1. Extend `plugins.json` schema with optional `title` and
   `description` fields at the section level.
2. Update `usePluginManifest` to expose these fields.
3. Update `HomePage` and any Demos page to use configured values
   with fallback defaults.

---

## Decisions

1. **Scoping.** Guidance and action button entries are scoped to
   workspaces. This aligns with the permission model — users only
   see guidance for workspaces they have access to — and allows
   different workspaces to have different guidance tailored to their
   use case. Entries are set up as part of workspace provisioning.

2. **Ordering.** Guidance items each have their own screen position,
   so ordering within the array is irrelevant. Action buttons share
   a toolbar, so each entry includes an `order` field (numeric,
   lower values render first). Buttons with no `order` sort after
   those with one.

3. **Rich content.** Markdown is sufficient. It natively supports
   links (`[text](url)`) and inline images (`![alt](url)`), which
   covers documentation links, bug tracker links, screenshots, and
   diagrams. No need for a richer format.
