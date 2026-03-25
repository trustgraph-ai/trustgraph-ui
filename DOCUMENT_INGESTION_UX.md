# TrustGraph Toolkit — Document Ingestion UX

## The Problem

Document ingestion in TrustGraph involves several steps that span
different parts of the system: file upload, library management, flow
configuration, processing submission, and verification. In the current
workbench these steps are spread across separate screens with no sense
of progression. Users don't know where they are, what's next, or how
the pieces connect. Common feedback:

- "I uploaded a file but nothing happened"
- "I don't understand what a flow is or why I need one"
- "How do I know if processing worked?"
- "I want to load 20 documents, not click through a wizard 20 times"

## Design Principles

### Show the whole pipeline, always

The user should see the full journey on one screen — from file
selection to live results. No hidden steps, no navigating between
screens to understand what's happening.

### Flow left to right

Documents progress from left to right through visible stages. The
direction of flow is always clear. New files enter on the left,
completed results appear on the right.

### Batch-friendly

Users often load multiple documents at once. The UI should handle
batches naturally — not force one-at-a-time processing. Drop 20 files,
tag them, submit them, watch them all process.

### Hide infrastructure until it's needed

Flows are infrastructure — like needing a running server. If a
compatible flow is already running, the user should never see the
flow step. If no flow is available, present it as a simple
prerequisite with sensible defaults and a one-click start, not a
detour into system administration.

### Live feedback, not final verification

Verification isn't a step at the end — it's live feedback that starts
immediately when processing begins. Document metadata appears in the
graph within seconds. Chunks, entities, and relationships emerge
progressively. The user watches the knowledge graph grow.

---

## The Pipeline

```
Select → Metadata → Collection → Upload → Flow → Submit → Live View
                                                          (monitor + verify)
```

### Step 1: Select Files

**What happens:** User picks files to ingest.

**UX:**
- Large drop zone dominates the left side of the screen. Drag and
  drop, or click to browse.
- Accepted formats shown (PDF, DOCX, TXT, etc.)
- Multiple files at once.
- Files appear immediately in a list below the drop zone showing
  name, size, type.
- The drop zone stays visible — user can add more files at any time,
  even while other files are processing.

**Key interaction:** Drag and drop, or click. Instant feedback.

### Step 2: Add Metadata

**What happens:** User adds metadata to files before upload.

**UX:**
- Each file in the list is expandable to edit metadata:
  - Title (auto-populated from filename, editable)
  - Tags (free-text chips)
- A "same for all" toggle applies the same tags to all files.
- Metadata is optional — files can be uploaded with just a title.
- This step happens inline in the file list, not a separate screen.

**Key interaction:** Edit in place. Defaults are sensible. Don't
block progress on metadata entry.

### Step 3: Choose Collection

**What happens:** User decides where this knowledge goes.

**UX:**
- A collection selector appears above the file list (or in a
  toolbar). This is a per-batch decision, not per-file.
- Dropdown shows existing collections with name and description.
- "New collection" option creates one inline — name and description
  fields appear, user fills them in and it's created immediately.
- If there's only one collection, it's pre-selected.
- The selector explains briefly what a collection is: "A collection
  groups related knowledge together. Documents in the same collection
  can be queried together."

**Key interaction:** Select or create. One decision for the whole
batch. Not intimidating.

### Step 4: Upload

**What happens:** Files are uploaded to the TrustGraph library.

**UX:**
- User clicks "Upload" (or this happens automatically after
  metadata + collection are set).
- Progress bar per file (chunked upload with percentage).
- Overall batch progress.
- Files transition visually from "ready" to "uploading" to
  "uploaded" in the file list.
- Failures show inline with a retry button. Don't lose the whole
  batch for one failure.
- Once uploaded, files are safely in the library. The user can
  close the browser and come back — the files are persisted.

**Key interaction:** One click (or automatic). Progress is visible.
Failures are recoverable.

### Step 5: Ensure Flow is Running

**What happens:** Processing requires a running flow. The system
checks and handles this.

**UX — flow already running:**
- The system checks for a running flow compatible with the selected
  collection.
- If found: this step is invisible. The user never sees it. A small
  indicator shows "Flow: running" in the toolbar.

**UX — no flow running:**
- A panel appears (not a new page): "Processing requires a running
  flow. Start one?"
- A recommended blueprint is pre-selected with sensible defaults.
- Key parameters shown with defaults (LLM model, chunk size). Most
  users won't change these.
- One click: "Start Flow". Spinner while it starts. Status changes
  to "running".
- Advanced users can expand to see all parameters and choose a
  different blueprint.

**UX — flow starting:**
- Brief wait (seconds). Status indicator shows progress.
- Once running, the flow step collapses and processing can begin.

**Key interaction:** Zero clicks if a flow is running. One click
if not. Never a complex configuration screen unless the user
asks for it.

### Step 6: Submit for Processing

**What happens:** Uploaded documents are submitted to the running
flow for processing.

**UX:**
- User clicks "Process" (or this happens automatically after upload
  if a flow is running).
- Documents transition from "uploaded" to "processing" in the
  pipeline.
- Each document shows its processing stage:
  - Queued
  - Extracting text
  - Chunking
  - Embedding
  - Building graph
- Processing is asynchronous — the user doesn't need to wait.

**Key interaction:** One click. Then watch.

### Step 7: Live View (Monitor + Verify)

**What happens:** The user sees live results as processing happens.

**UX:**
This is where the pipeline view pays off. The right side of the
screen shows a live knowledge graph that updates as documents are
processed:

- **Immediate** (seconds): Document metadata nodes appear in the
  graph. The user can see their documents are in the system.
- **Soon** (tens of seconds): Chunks appear linked to documents.
  The user can see text extraction worked.
- **Progressive** (minutes): Entities and relationships emerge.
  The graph grows visually. The user watches their knowledge
  being built.

The live view includes:
- A mini graph showing entities from the current collection,
  updating in real time (or with a refresh button).
- Processing status per document (which stage, any errors).
- Summary stats: documents processed, entities found, triples
  created — updating live.
- Click on any entity to see its properties (same detail panel
  as the Knowledge Explorer).

**Key interaction:** Watch. The system shows you it's working. No
"is it done yet?" uncertainty.

---

## Full Screen Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ DOCUMENT INGESTION          Collection: [Sales Data ▾]  Flow: ● │
├──────────────────────┬───────────────────────────────────────────┤
│                      │                                          │
│  ┌ Drop files here ┐ │         LIVE KNOWLEDGE GRAPH             │
│  │                  │ │                                          │
│  │  drag & drop     │ │         ○───○                            │
│  │  or click        │ │        / \ / \                          │
│  └──────────────────┘ │       ○───○───○         updating...     │
│                      │              \                           │
│  FILES               │               ○───○                      │
│  ┌──────────────────┐ │                                          │
│  │ ✓ report.pdf     │ │                                          │
│  │   uploading 67%  │ │─────────────────────────────────────────│
│  ├──────────────────┤ │  STATS                                  │
│  │ ◌ memo.docx      │ │  Documents: 3/5  Entities: 47          │
│  │   queued          │ │  Triples: 182    Chunks: 23            │
│  ├──────────────────┤ │                                          │
│  │ ● data.pdf       │ │                                          │
│  │   embedding...    │ │                                          │
│  ├──────────────────┤ │                                          │
│  │ ✓ overview.txt   │ │                                          │
│  │   complete ✓     │ │                                          │
│  └──────────────────┘ │                                          │
│                      │                                          │
│  [Upload & Process]  │                                          │
│                      │                                          │
└──────────────────────┴───────────────────────────────────────────┘
```

Left side: file management (select, metadata, upload, status).
Right side: live results (graph, stats).
Top bar: collection selector, flow status.

The left side is the **input**. The right side is the **output**.
Documents flow from left to right through the system.

---

## States and Transitions

### Empty state (first visit)
- Drop zone prominent
- Right side shows empty graph with message: "Upload documents to
  start building your knowledge graph"
- Collection selector defaults to last used, or prompts to create

### Files selected, not uploaded
- File list shows files with metadata fields
- "Upload" button active
- Right side still empty (or showing existing collection data)

### Uploading
- Progress bars on files
- "Upload" button disabled / shows progress
- Right side still showing existing data

### Uploaded, ready to process
- Files show "uploaded" status
- "Process" button active
- Flow status checked — if no flow, the flow panel appears

### Processing
- Files show processing stages
- Right side graph starts updating
- Stats increment live
- User can add more files while processing continues

### Complete
- All files show "complete" checkmark
- Right side shows full graph with all new entities
- Stats show final counts
- "View in Knowledge Explorer" link to jump to graph exploration

### Errors
- Per-file error display with reason
- Retry button per file
- Other files continue processing — one failure doesn't block batch
- Flow errors shown in toolbar with restart option

---

## Alternative Views

The pipeline layout is one way to approach ingestion. The same
underlying operations can be presented through different lenses,
each centred on a different organising concept. These are not
mutually exclusive — they could be tabs or views within the same
ingestion screen, all sharing the same hooks and domain pieces.

### View A: Pipeline (described above)

Centred on the **process**. Documents flow left to right through
stages: select → metadata → upload → process → verify. The user
sees the full journey on one screen.

**Best for:** First-time users, batch uploads, understanding
what's happening.

### View B: Collection-Centric

Centred on a **collection**. The user starts by selecting or
creating a collection, then everything is scoped to it.

```
┌──────────────────────────────────────────────────────────────┐
│ COLLECTION: [Sales Data ▾]  [+ New]           Flow: ●       │
├──────────────┬───────────────────────────────────────────────┤
│ LIBRARY      │  COLLECTION CONTENTS                         │
│ (unattached) │                                              │
│              │  PROCESSING          COMPLETE                │
│ doc1.pdf     │  doc3.pdf ◌ chunk..  doc5.pdf ✓  47 entities │
│ doc2.pdf     │  doc4.pdf ◌ embed..  doc6.pdf ✓  31 entities │
│              │                                              │
│ [submit →]   │  ┌─ Knowledge Graph ──────────────────────┐  │
│              │  │       ○───○                             │  │
│              │  │      / \ / \                           │  │
│              │  │     ○───○───○                           │  │
│              │  └────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────┘
```

Left side shows library documents not yet associated with any
collection. The user selects documents and submits them to the
current collection for processing. The right side shows everything
in the collection: documents being processed, completed documents,
and the live knowledge graph for this collection.

Switching collections changes the entire right side — different
documents, different graph, different stats. The library on the
left stays the same (it's global).

**Best for:** Users managing specific knowledge domains, ongoing
curation of a collection, seeing what's in a collection.

### View C: Tag-Centric

Centred on **tags**. The user selects a tag (or creates one) and
sees all documents with that tag across collections.

```
┌──────────────────────────────────────────────────────────────┐
│ TAG: [quarterly-reports ▾]  [+ New Tag]                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  doc1.pdf   → Sales Data collection   ✓ complete            │
│  doc2.pdf   → Sales Data collection   ◌ processing...       │
│  doc3.pdf   → Research collection     ✓ complete            │
│  doc4.pdf   → (library, unsubmitted)                        │
│                                                              │
│  [Submit unprocessed to collection...]                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Documents are grouped or filtered by tag. Each document shows which
collection it's been submitted to (if any) and its processing
status. Unsubmitted documents can be submitted from here.

Tags cut across collections — a document tagged "quarterly-reports"
might be in the Sales Data collection and also the Research
collection (submitted separately with different processing).

**Best for:** Users who organise by topic or project, cross-
collection views, finding documents regardless of where they
were processed.

### View D: Document-Centric

Centred on a **single document**. The user selects a document and
sees its full history.

```
┌──────────────────────────────────────────────────────────────┐
│ DOCUMENT: report-q4-2025.pdf                                │
│ Uploaded: 2025-12-01  Size: 2.4MB  Tags: quarterly, sales   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PROCESSING HISTORY                                         │
│                                                              │
│  ┌ Run 1 ──────────────────────────────────────────────┐    │
│  │ Collection: Sales Data                              │    │
│  │ Flow: default (gpt-4o, chunk 512)                   │    │
│  │ Status: ✓ complete                                  │    │
│  │ Entities: 47  Triples: 182  Chunks: 23              │    │
│  │ Submitted: 2025-12-01 14:30                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌ Run 2 ──────────────────────────────────────────────┐    │
│  │ Collection: Research                                │    │
│  │ Flow: detailed (claude-3, chunk 1024)               │    │
│  │ Status: ◌ processing... (embedding)                 │    │
│  │ Submitted: 2025-12-03 09:15                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [Reprocess...] [View in Sales Data graph]                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Shows every processing run for this document — different
collections, different flow configurations, different results.
The user can reprocess the document with different settings, or
view the knowledge graph contribution from any run.

**Best for:** Debugging, reprocessing with different settings,
understanding a document's journey, comparing extraction results
across different models or chunk sizes.

### View Summary

| View | Centred on | Primary question answered |
|------|-----------|--------------------------|
| A. Pipeline | Process | "How do I get documents into the system?" |
| B. Collection | Collection | "What's in this collection?" |
| C. Tag | Tag | "Where are all my quarterly reports?" |
| D. Document | Document | "What happened to this specific file?" |

All four views use the same underlying hooks (`useDocumentUpload`,
`useDocumentProcessing`, `useFlowStatus`, `useCollectionGraph`)
and the same domain pieces (`FileItem`, `CollectionPicker`,
`ProcessingStageIndicator`, etc.). They just compose them
differently.

---

## What's Different from the Workbench

| Aspect | Workbench | New UX |
|--------|-----------|--------|
| Layout | Steps on separate screens | Everything on one screen |
| Progress | Navigate to check status | Live on-screen updates |
| Flow setup | Separate admin screen | Inline, auto-detected |
| Collections | Configured elsewhere | Created inline |
| Verification | Go to graph viewer manually | Live graph on same screen |
| Batch upload | One at a time | Drag and drop multiple |
| Error handling | Error on separate page | Inline per-file with retry |
| Mental model | "Where do I go next?" | "Watch it flow left to right" |

---

## Further Design Considerations

### Flows: hide or expose?

A flow is an infrastructure concept — it encapsulates a blueprint
choice and model parameters. The question is whether the end user
ever needs to see it.

**Option: Fully hidden flows.** The system manages flows behind the
scenes. When the user submits documents for processing, the system
either reuses a running flow or starts one automatically with
defaults. The user's only decision is which model to use (if that).
Blueprint selection and parameter tuning are handled by the system
or by an admin in a separate settings area.

This simplifies the ingestion flow dramatically — the "ensure flow"
step disappears entirely. The user goes straight from upload to
processing. The trade-off is less control for power users, but the
toolkit can expose flow management as a separate view (see
Flow Configuration workflow) for those who need it.

**Option: Minimal exposure.** Show the model selector inline during
processing setup. Everything else (blueprint, chunk size, advanced
params) uses defaults unless the user explicitly expands an
"Advanced" section. The flow blueprint metadata already defines
which parameters are "easy" vs "advanced", so this is
data-driven.

**Recommendation:** Default to hidden. Expose model selection only
if the system supports multiple models. Provide a link to flow
configuration for power users. The ingestion UX should feel like
"upload and process" — not "configure infrastructure then upload
then process."

### Collection strategy: shared vs per-document

Collections group knowledge for querying. There are two strategies:

**Shared collections (default).** Multiple documents go into one
collection. The knowledge graph merges entities across documents.
Queries search across all documents in the collection. This is
the natural model for most use cases — a "Sales" collection
containing all sales-related documents.

**Per-document collections.** Each document gets its own collection,
automatically named after the document. The user selects a
document rather than a collection when querying. The knowledge
graph for each document is isolated.

Per-document is simpler mentally — "I uploaded this document,
now I can ask questions about it." But it has a significant
disadvantage: **you can't search across documents.** If two
documents both mention the same entity, they won't be connected.
Cross-document reasoning is lost.

Per-document collections might suit use cases where documents
are truly independent (e.g. analysing individual contracts), but
for most knowledge graph scenarios, shared collections are
essential.

**The toolkit should support both.** The `CollectionPicker`
component could offer "Add to existing collection" and "Create
new collection for this document" as options. The choice is the
user's, not the toolkit's.

---

## Components Needed

### Hooks (Tier 1)
- `useDocumentUpload` — chunked upload with progress per file
- `useDocumentProcessing` — submit to flow, track stages per doc
- `useFlowStatus` — check/start/stop flows for processing
- `useCollectionGraph` — live graph data for a collection (polling
  or subscription for updates)
- `useIngestionStats` — live entity/triple/chunk counts

### Domain Pieces (Tier 2)
- `DropZone` — drag and drop file target
- `FileList` — list of files with status, progress, metadata editing
- `FileItem` — single file with expandable metadata, progress bar,
  stage indicator
- `CollectionPicker` — select or create collection inline
- `FlowStatusBar` — shows flow status, one-click start if needed
- `ProcessingStageIndicator` — shows which processing stage a doc
  is in
- `IngestionStats` — live stats display (docs, entities, triples)
- `IngestionGraph` — mini graph view showing collection entities,
  updating live

### Composites (Tier 3)
- `DocumentIngestionFlow` — the full pipeline screen, wiring
  everything together
- `IngestionPanel` — just the left side (files + upload + status)
  for embedding in custom layouts
- `IngestionLiveView` — just the right side (graph + stats) for
  embedding in custom layouts

---

## Design Decisions

1. **Upload and process are separate steps.** A document can be
   submitted for processing more than once (e.g. reprocessed with
   different flow settings). Upload puts the document in the library.
   Processing is an explicit "Submit" action after upload completes.

2. **Metadata is per-file, with batch convenience.** Each file gets
   its own title (defaulted from filename) since titles are
   document-specific. Tags can be applied per-file or via a
   "same for all" toggle for the batch. This balances flexibility
   with speed for large batches.

3. **Graph updates via polling.** No websocket subscription exists
   for collection changes. The live graph polls the collection for
   new entities. The TrustGraph API is high-performance so polling
   at a reasonable interval (e.g. every few seconds during
   processing) is fine.

4. **Flow configuration is minimal by default.** The flow blueprint
   metadata defines which parameters are "easy" vs "advanced". In
   the default view, the user only needs to select a model — all
   other parameters have sensible defaults and are optional. Advanced
   parameters are available via an expandable section for power
   users. If a flow is already running with acceptable defaults,
   the user may not need to see any configuration at all.

5. **Resume after browser close — mostly yes.** Everything except
   the upload itself is server-side. If the user closes the browser
   during upload, that upload fails (it's a client-side chunked
   transfer). But once uploaded, documents are in the library.
   Processing status, flow status, and collection state are all
   server-side and can be inspected on return. The UI should detect
   in-progress processing on load and show status accordingly.
