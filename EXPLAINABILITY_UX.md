# TrustGraph Toolkit — Explainability UX Options

Explainability is not one-size-fits-all. Different applications need
different levels of transparency — from "just give me the answer" to
"show me every reasoning step with full provenance". The toolkit
provides a spectrum of composites so app developers choose the right
level for their use case.

---

## Option 1: Simple RAG Query (no explainability)

The simplest option. Ask a question, get an answer. No explain events,
no provenance, no source links. Just a query input and a streaming
response.

**Use case:** Embedded search, chatbots, quick-answer panels where
the user trusts the system and doesn't need to verify.

**Layout:**
```
┌─────────────────────────────────────────┐
│  GRAPH RAG QUERY                        │
│  [Ask a question...            ] [Query]│
│                                         │
│  ┌─ RESPONSE ─────────────────────────┐ │
│  │ The answer streams in here...      │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Toolkit component:** `SimpleRagView`

---

## Option 2: RAG with Source Summary

Like Option 1, but with a side panel that shows a summary of where the
answer came from. Not the full explain event timeline — just the key
sources: which edges were used, which documents contributed. The user
can click a source to see the chunk text.

Feels like a citation panel — the answer on the left, the evidence on
the right.

**Use case:** Research tools, knowledge bases, any context where the
user wants to verify but doesn't need the full reasoning chain.

**Layout:**
```
┌───────────────────────────────┬─────────────────────┐
│  GRAPH RAG QUERY              │  SOURCES            │
│  [Ask a question...  ] [Query]│                     │
│                               │  ┌ Edge ──────────┐ │
│  ┌─ RESPONSE ───────────────┐ │  │ A → rel → B    │ │
│  │ The answer streams in    │ │  │ source: doc.pdf │ │
│  │ here with full text...   │ │  └─────────────────┘ │
│  │                          │ │  ┌ Edge ──────────┐ │
│  │                          │ │  │ C → rel → D    │ │
│  │                          │ │  │ source: doc2    │ │
│  └──────────────────────────┘ │  └─────────────────┘ │
│                               │                     │
│                               │  ┌─ Source Text ──┐ │
│                               │  │ "The actual    │ │
│                               │  │  chunk text    │ │
│                               │  │  appears here" │ │
│                               │  └────────────────┘ │
└───────────────────────────────┴─────────────────────┘
```

**Toolkit component:** `RagWithSourcesView`

---

## Option 3: Explain Timeline with Document Sources

The full explain timeline — events arrive in real time as the system
works, each presented as a compact card with summary/headline
information. Most event types show just their key data point:

- **Question** — the query text
- **Grounding** — concept count
- **Exploration** — entity count, edge count
- **Synthesis** — content length
- **Analysis** — action name
- **Conclusion** — complete

The exception is **Focus** events. When focus arrives, each selected
edge is shown with its triple (subject → predicate → object) and its
source documents. Sources are collapsed to the **page and document
level** — no individual chunks. If three different chunks from the
same page of the same document were relevant, that shows as one
document entry, not three. This keeps the sources list clean and
scannable.

Clicking a document source could open it in a viewer, but the timeline
itself doesn't expand into chunk-level detail.

**Use case:** Analysts and power users who want to follow the
reasoning process in real time and quickly verify which documents
contributed, without drowning in chunk-level detail.

**Layout:**
```
┌───────────────────────────────┬─────────────────────┐
│  GRAPH RAG QUERY              │  EXPLAIN EVENTS     │
│  [Ask a question...  ] [Query]│                     │
│                               │  ┌ 1. QUESTION ───┐ │
│  ┌─ RESPONSE ───────────────┐ │  │ What is...?    │ │
│  │ The answer streams in    │ │  └─────────────────┘ │
│  │ here...                  │ │  ┌ 2. GROUNDING ──┐ │
│  │                          │ │  │ 3 concepts     │ │
│  │                          │ │  └─────────────────┘ │
│  │                          │ │  ┌ 3. EXPLORATION ┐ │
│  │                          │ │  │ 12 entities    │ │
│  │                          │ │  │ 48 edges       │ │
│  │                          │ │  └─────────────────┘ │
│  │                          │ │  ┌ 4. FOCUS ──────┐ │
│  │                          │ │  │ A → rel → B    │ │
│  │                          │ │  │  📄 report.pdf │ │
│  │                          │ │  │  📄 memo.docx  │ │
│  │                          │ │  │ C → rel → D    │ │
│  │                          │ │  │  📄 report.pdf │ │
│  └──────────────────────────┘ │  └─────────────────┘ │
│                               │  ┌ 5. SYNTHESIS ──┐ │
│                               │  │ 1240 chars     │ │
│                               │  └─────────────────┘ │
└───────────────────────────────┴─────────────────────┘
```

**Toolkit component:** `RagWithTimelineView`

---

## Option 4: Split View with Provenance Graph

The full experience. The left side has the query input and streaming
response. The right side is split vertically: a provenance graph at
the top showing entities and edges as they're discovered, and the
explain event timeline below.

The provenance graph builds progressively — exploration events add
entity nodes, focus events add edges between them. Clicking nodes or
edges on the graph highlights them in the timeline and vice versa.

In the focus event cards, each selected edge shows its triple, its
reasoning text, and clickable source links. Clicking a source link
opens a source panel (below the response area or as an overlay)
showing the document title, metadata, and the actual chunk text.
Sources trace the full provenance chain: edge → chunk → document.

This is the view for users who want to understand exactly how the
system arrived at its answer and inspect the raw evidence.

**Use case:** Auditors, researchers building trust in the system,
debugging knowledge graph quality, compliance reviews where every
claim needs a traceable source.

**Layout:**
```
┌───────────────────────────────┬─────────────────────┐
│  GRAPH RAG QUERY              │  ┌ Provenance ────┐ │
│  [Ask a question...  ] [Query]│  │    ○───○        │ │
│                               │  │   / \ / \      │ │
│  ┌─ RESPONSE ───────────────┐ │  │  ○───○───○     │ │
│  │ The answer streams in    │ │  └─────────────────┘ │
│  │ here...                  │ │  EVENTS              │
│  │                          │ │  ┌ 4. FOCUS ──────┐ │
│  │                          │ │  │ A → rel → B    │ │
│  └──────────────────────────┘ │  │ reasoning...   │ │
│                               │  │ 📄 report.pdf  │ │
│  ┌─ SOURCE ─────────────────┐ │  │ 📄 memo.docx   │ │
│  │ report.pdf               │ │  └─────────────────┘ │
│  │ "The actual chunk text   │ │  ┌ 5. SYNTHESIS ──┐ │
│  │  that was used..."       │ │  │ 1240 chars     │ │
│  └──────────────────────────┘ │  └─────────────────┘ │
└───────────────────────────────┴─────────────────────┘
```

**Toolkit component:** `RagExplainView`

---

## Option 5: Full Explainability DAG

A full-detail explainability view where the reasoning process is
presented as a directed acyclic graph (DAG) derived from the
provenance derivation links. The question is at the top, the
conclusion/answer at the bottom, and all intermediate events
(grounding, exploration, focus, synthesis, analysis, reflection)
are positioned according to their derivation relationships.

The DAG gives the user a structural overview of the entire reasoning
process — not just a timeline, but the actual dependency graph showing
what derived from what. Events are rendered as compact nodes showing
just their type label (and maybe a one-line summary). The shape of the
reasoning is visible at a glance.

Clicking any event node in the DAG opens a detail panel on the right
showing the full data for that event. The detail panel content varies
by event type:

- **Question** — query text, timestamp
- **Grounding** — list of extracted concepts
- **Exploration** — entity list as badges, plus a mini graph view
  showing the discovered entities and their connections
- **Focus** — the selected edges as triples with reasoning text,
  a mini graph view showing the edge subgraph, and clickable
  source links (documents and pages, collapsed as in Option 3)
- **Synthesis** — content summary
- **Analysis** — action, arguments, thought/observation links
- **Reflection** — reflection type, document link
- **Conclusion** — link to final document

The mini graph views within exploration and focus detail are scoped —
they show only the entities and edges relevant to that event, not the
full knowledge graph. This lets the user drill into one step of the
reasoning without losing context.

Source links in focus events open a source panel showing document
title, metadata, and chunk text — same as Option 4.

**Use case:** Deep debugging, system development, understanding and
improving RAG pipeline behaviour, building explainability reports,
academic research into reasoning chains.

**Layout:**
```
┌───────────────────────────────────────┬─────────────────────┐
│  GRAPH RAG QUERY                      │  EVENT DETAIL       │
│  [Ask a question...          ] [Query]│                     │
│                                       │  FOCUS              │
│  ┌─ EXPLAINABILITY DAG ─────────────┐ │                     │
│  │                                  │ │  ┌ Subgraph ─────┐ │
│  │         [Question]               │ │  │   ○───○        │ │
│  │             │                    │ │  │   │   │        │ │
│  │        [Grounding]               │ │  │   ○───○        │ │
│  │             │                    │ │  └────────────────┘ │
│  │       [Exploration]              │ │                     │
│  │          /     \                 │ │  Edges:             │
│  │     [Focus]  [Focus]             │ │  A → rel → B       │
│  │          \     /                 │ │   reasoning...      │
│  │       [Synthesis] ←── selected   │ │   📄 report.pdf    │
│  │             │                    │ │                     │
│  │       [Conclusion]               │ │  C → rel → D       │
│  │                                  │ │   reasoning...      │
│  └──────────────────────────────────┘ │   📄 memo.docx     │
│                                       │                     │
│  ┌─ RESPONSE ───────────────────────┐ │  ┌─ Source Text ──┐ │
│  │ The answer text...               │ │  │ "The chunk..." │ │
│  └──────────────────────────────────┘ │  └────────────────┘ │
└───────────────────────────────────────┴─────────────────────┘
```

**Toolkit component:** `RagFullExplainView`

---

## Summary

| Option | Component             | Explainability | Sources | Graph | Detail |
|--------|-----------------------|----------------|---------|-------|--------|
| 1      | `SimpleRagView`       | None           | None    | No    | No     |
| 2      | `RagWithSourcesView`  | Hidden         | Summary | No    | Chunk text |
| 3      | `RagWithTimelineView` | Timeline cards | Doc-level | No  | Headlines |
| 4      | `RagExplainView`      | Timeline cards | Full chain | Provenance | Chunk text |
| 5      | `RagFullExplainView`  | DAG            | Full chain | Per-event | Full detail |

All five options use the same Tier 1 hooks (`useGraphRag`,
`useExplainSession`, `useExplainEventFetcher`, `useExplainGraph`).
The difference is which Tier 2 domain pieces they compose and how
much of the explain data they expose. A developer can also skip all
five composites and wire the hooks + pieces directly for a fully
custom layout.
