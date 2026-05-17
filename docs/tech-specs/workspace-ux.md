# TrustGraph Toolkit — Workspace UX

## Insight

Looking across all the design documents, a clear pattern emerges:
**the collection is the organising unit, not the workflow.** Every
operation — ingestion, exploration, querying, data search, ontology
review — is scoped to a collection. The workflows are not independent
destinations; they are connected lenses on the same underlying
knowledge.

This means the UX should feel like a **workspace centred on a
collection**, not a menu of disconnected tools.

---

## The Collection Workspace

Once a user has selected (or created) a collection, they are in a
workspace. The workspace provides access to all workflows without
leaving the collection context. Switching workflows feels like
changing perspective, not navigating to a different place.

```
┌──────────────────────────────────────────────────────────────┐
│  TrustGraph    Collection: [Sales Data ▾]    ● Connected     │
├──────────────────────────────────────────────────────────────┤
│  Ingest  │  Explore  │  Query  │  Data  │  Ontology         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              (active workflow content here)                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- The **collection selector** is always visible at the top. It
  scopes everything below.
- **Workflow tabs** switch the view without losing collection context.
- **State persists** across tab switches — if you're mid-query in
  the Query tab, switch to Explore, then come back, your query
  results are still there (channel persistence).

---

## Cross-Workflow Navigation

Workflows link to each other naturally through the data:

### Ingestion → Exploration
After documents are processed, the ingestion view shows new entities
appearing in the graph. A "View in Explorer" action opens the
Explore tab filtered to the newly created entities. The user sees
what their documents contributed.

### Query → Provenance → Document
A query answer cites sources. Clicking a source link shows the
chunk text and document metadata. A "View document" action could
navigate to the Document view in the Ingest tab, showing that
document's full processing history.

### Exploration → Query
Selecting an entity in the graph and clicking "Ask about this"
could pre-populate a query in the Query tab with a question about
the selected entity.

### Ontology → Exploration
Clicking an instance in the Ontology view navigates to that entity
in the Explorer, centred on the graph.

### Data Search → Exploration
Finding a record in the Data tab and clicking a related entity
navigates to the Explorer.

These cross-workflow links are **not routing** — they're just state
changes. Set the active tab and pass context (selected entity,
document URI, search term). The channel holds the state; the views
read from it.

---

## What Changes in the Demo

### Before (current)
- Homepage grid of workflow cards
- Each card opens an independent view
- No persistent collection context
- Going back to home loses workflow state

### After
- Homepage still serves as the **entry point** and **showcase**
  for first-time visitors and developers browsing the toolkit
- Once a user enters a workflow, they're in the **workspace**
- The workspace has a collection selector and workflow tabs
- The homepage becomes "I haven't chosen a collection yet" state
- Returning to the homepage is "change collection" or "browse
  toolkit demos"

### The two modes

**Showcase mode (homepage):** Grid of workflow cards with
descriptions, screenshots, and DevPanel code samples. This is for
developers exploring the toolkit — "what can I build?"

**Workspace mode (collection selected):** Tabbed workspace with
all workflows accessible. This is for users working with data —
"let me ingest, explore, and query."

The transition between modes is natural: clicking a workflow card
from the homepage enters workspace mode. The collection selector
at the top can return to the homepage (or a collection-picking
screen).

---

## Collection Lifecycle

### No collection selected
- Homepage/showcase is shown
- Or a "Select a collection to get started" screen with:
  - List of existing collections
  - "Create new collection" option
  - Quick stats per collection (entity count, document count)

### Collection selected, empty
- Workspace shows with Ingest tab active
- Other tabs show empty states: "No entities yet", "Upload
  documents to start"
- The UX guides toward ingestion as the first step

### Collection selected, populated
- All tabs are active and useful
- Explore shows the graph, Query is ready, Data search works,
  Ontology shows the schema

### Switching collections
- Collection selector dropdown
- Switching updates all tabs — new graph, new query context,
  new data
- State from the previous collection is preserved in its channel
  (if the app uses multiple channels)

---

## Design Principles (refined)

### Collection first, workflow second
The user's primary decision is "which knowledge am I working with?"
not "which tool do I want to use?" The collection is chosen first;
workflows are available within that context.

### Workflows are perspectives, not destinations
Each workflow tab is a different way to look at the same collection.
They share context and link to each other. The user flows between
them as their task requires.

### State survives navigation
Switching tabs doesn't lose work. Channel persistence ensures that
query results, graph selections, upload progress, and processing
status all survive tab changes and even page reloads.

### Progressive complexity
- Start: select collection, upload documents
- Next: explore the graph, ask questions
- Deeper: trace provenance, inspect ontology, search data
- Power user: configure flows, manage collections, export

The workspace doesn't show everything at once. Each workflow tab
focuses on one thing. Depth is available when the user is ready.

### Live everywhere
Every tab shows live data from the collection. Processing updates
appear in real time. Query responses stream. The graph updates as
knowledge grows. The workspace always feels current.

---

## Impact on the Toolkit

This workspace model doesn't require new components — it's a
composition pattern. The toolkit provides:

- **Tier 3 composites** for each workflow (GraphExplorer,
  GraphRagView, DocumentIngestionFlow, etc.)
- **Channel architecture** for scoping data to a collection
- **Cross-workflow callbacks** (onEntitySelect, onDocumentClick,
  etc.) that the workspace uses to link tabs together

The workspace itself is a **demo/app concern**, not a toolkit
component. Different apps will compose the toolkit's workflow
composites differently — some as tabs, some as pages, some as
panels in a dashboard. The toolkit provides the pieces; the app
provides the layout.

However, the toolkit could provide an optional `CollectionWorkspace`
composite for apps that want the standard tabbed layout without
building it themselves.

---

## Components to Add

### Toolkit
- `CollectionPicker` — select or create collection (already in spec)
- `CollectionWorkspace` — optional Tier 3 composite providing the
  tabbed workspace layout with collection context

### Demo
- Refactor App.tsx from independent views to a workspace model
- Collection selector in the header
- Cross-workflow navigation handlers
- Two modes: showcase (homepage) and workspace (collection selected)
