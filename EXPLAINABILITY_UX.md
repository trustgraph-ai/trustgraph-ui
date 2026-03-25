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

## Option 3:

(to be defined)

---

## Option 4:

(to be defined)
