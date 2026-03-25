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

## Option 4:

(to be defined)
