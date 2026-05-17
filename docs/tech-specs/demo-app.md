# TrustGraph Demo App

## Purpose

The demo app is a reference implementation and showcase for the
trustkit toolkit. It serves two audiences:

1. **Users** who want to experience TrustGraph's capabilities through
   complete workflows.
2. **Developers** who want to see how the toolkit components compose
   to build each workflow — with inline code examples they can copy.

## Front Page

A grid of workflow cards. Each card has:

- **Name** — e.g. "Knowledge Explorer", "Graph RAG Query"
- **Description** — what it does and why it matters within TrustGraph
- **Click to launch** — navigates to the workflow

No graph, no data on the front page. It's a clean starting point that
shows what's possible and lets the user choose where to go.

## Workflows

Each workflow maps to one or more Tier 3 composites from the toolkit.

| Card | Composite(s) used |
|------|-------------------|
| Knowledge Explorer | GraphExplorer |
| Agent Query | AgentChatPanel |
| Explain (Graph RAG) | GraphRagView |
| Explain (Doc RAG) | DocumentRagView |
| Table Explorer | DataSearchView |
| Ontology Viewer | OntologyOverview |
| Document Ingestion | DocumentIngestionFlow |
| Collection Management | CollectionManager |
| Flow Configuration | FlowManager |
| Export / Import | ExportFlow, ImportFlow |

## Developer Panel

Every workflow page has a small toggle button (e.g. `</>` icon) that
opens a collapsible developer panel. This panel shows:

- **How this page is built** — a short explanation of which toolkit
  components and hooks are composed to create this view.
- **Sample code** — a minimal code snippet showing the key wiring.
  Copy-friendly. Something like:

  ```tsx
  import { GraphExplorer } from "@trustgraph/trustkit";

  function MyGraphPage() {
    return <GraphExplorer renderer="svg" />;
  }
  ```

- **Components used** — a list of the Tier 2 and Tier 3 components
  with brief descriptions.
- **Hooks used** — which Tier 1 hooks power the data.

The panel is hidden by default so it doesn't distract users who just
want to use the workflows.

## Settings

A single settings page accessible from the header. Covers:

- **Connections** — add/edit/delete TrustGraph connections (see
  CONNECTION_UX.md). Connection status visible in the header at all
  times.
- **Active collection** — select which collection to work with.
- **Preferences** — theme (dark/light when available), any other
  user preferences.

The settings page is not a workflow — it's infrastructure. It uses
ConnectionSettings and CollectionPicker composites.

## Navigation

Simple tab/nav bar in the header:

- **Home** — the workflow grid
- **Settings** — connection and preferences
- Each workflow gets its own view (navigated to from the grid, with
  a back button or breadcrumb to return home)

No deep routing needed. Flat structure: home → workflow → home.

## Single Channel

The demo uses a single `"default"` channel. It does not showcase
multi-channel — that's a toolkit capability, not a demo feature.
The demo proves that a simple app doesn't need to think about channels.
