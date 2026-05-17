# TrustGraph UX — End-to-End Workflows

These workflows describe complete user journeys through the TrustGraph UX.
Each flow moves in one direction — the user progresses through a sequence
of steps without backtracking. Each workflow is a test case for the demo
app and a reference for toolkit component composition.

---

## 1. Document Ingestion

**Goal:** Load documents into TrustGraph, process them into knowledge, and
verify the results.

```
Select files  →  Add metadata  →  Upload  →  Process  →  Verify
```

### Steps

1. **Select files**
   - User clicks "Add Documents" or drags files onto a drop zone.
   - Supported formats shown (PDF, DOCX, TXT).
   - Multiple files can be selected at once.
   - File list displays with name, size, and type icon.

2. **Add metadata**
   - For each file (or batch), user enters:
     - Title (auto-populated from filename, editable)
     - Tags (free-text chips, optional)
     - Collection (dropdown of existing collections, or create new)
   - A "same for all" toggle applies metadata to the entire batch.

3. **Upload**
   - Progress bar per file (chunked upload with percentage).
   - Overall batch progress indicator.
   - Files transition from "queued" → "uploading" → "uploaded".
   - Failures show inline with retry option.

4. **Process**
   - User selects a flow (or uses the default) and clicks "Process".
   - Processing status updates in real time:
     - Queued → Extracting text → Chunking → Embedding → Building graph
   - Each document shows its current stage.
   - User can cancel individual documents.

5. **Verify**
   - Once processing completes, a summary appears:
     - Number of entities extracted
     - Number of triples created
     - Number of chunks indexed
   - "View in Graph" button opens the Context Graph filtered to the
     new entities.
   - "View in Ontology" button shows the updated ontology with new
     classes/instances highlighted.

### Components used
DropZone, FileList, MetadataForm, TagInput, CollectionPicker,
ProgressBar, ProcessingStatus, IngestionSummary

---

## 2. Knowledge Exploration

**Goal:** Explore the knowledge graph visually, drill into entities, and
understand their relationships.

```
Browse graph  →  Select entity  →  View details  →  Follow relationships
```

### Steps

1. **Browse graph**
   - Full graph canvas renders all entities and relationships.
   - Entities are coloured by ontology class.
   - User can zoom, pan, and scroll.
   - A legend shows domain colours and icons.

2. **Select entity**
   - User clicks a node on the graph.
   - Connected nodes and edges highlight.
   - Unrelated nodes dim.
   - A filter bar appears showing the domains of connected entities.

3. **View details**
   - Detail panel slides in from the right showing:
     - Entity label and type
     - All properties (key-value pairs)
     - URI
   - Properties use human-readable labels from the ontology.

4. **Follow relationships**
   - Detail panel lists all relationships (incoming and outgoing).
   - Each relationship shows: predicate label, connected entity name.
   - Clicking a connected entity navigates to it:
     - Graph re-centres on the new node
     - Detail panel updates
     - Highlight shifts to the new neighbourhood
   - The user can keep following links through the graph.

### Components used
GraphCanvas, ZoomControls, FilterBar, NodeDetailPanel, Badge

---

## 3. Ask a Question (Graph RAG)

**Goal:** Ask a natural language question and see how TrustGraph retrieves
knowledge and constructs an answer, with full provenance.

```
Ask question  →  Watch retrieval  →  Read answer  →  Inspect provenance
```

### Steps

1. **Ask question**
   - User types a question in the input field.
   - Selects "Graph RAG" mode.
   - Clicks "Ask" or presses Enter.

2. **Watch retrieval**
   - The explain panel populates in real time as the system works:
     - **Grounding** — concepts extracted from the question
     - **Exploration** — entities found, edge count, chunk count
     - **Focus** — specific edges selected with reasoning
     - **Synthesis** — answer being composed
   - A provenance graph builds alongside, showing the reasoning chain
     as nodes and edges.
   - The response streams in token by token.

3. **Read answer**
   - Full answer displayed with markdown rendering.
   - Response is scrollable if long.

4. **Inspect provenance**
   - User clicks nodes in the provenance graph to see details:
     - Which edges were selected and why (reasoning text)
     - Source triples for each edge (subject → predicate → object)
     - Document provenance chain (edge → chunk → document)
   - Clicking a source document shows:
     - Document title and metadata
     - The specific chunk text that contributed
   - User can trace any fact back to its source.

### Components used
SearchInput, ExplainGraph, Typewriter, MessageBubble,
ProvenancePanel, SourceViewer

---

## 4. Ask a Question (Document RAG)

**Goal:** Search documents by semantic similarity and get an LLM-generated
answer grounded in document content.

```
Ask question  →  Watch retrieval  →  Read answer  →  View sources
```

### Steps

1. **Ask question**
   - User types a question in the input field.
   - Selects "Doc RAG" mode.
   - Clicks "Ask".

2. **Watch retrieval**
   - Explain panel shows:
     - **Grounding** — query embedding generated
     - **Exploration** — similar document chunks found
     - **Synthesis** — answer being composed from chunks
   - Response streams in.

3. **Read answer**
   - Full answer displayed with markdown rendering.

4. **View sources**
   - Below the answer, a list of source chunks appears ranked by
     relevance score.
   - Each source shows:
     - Document title
     - Chunk excerpt (highlighted matching passage)
     - Relevance score (percentage)
   - Clicking a source expands it to show the full chunk text and
     document metadata.

### Components used
SearchInput, ExplainGraph, Typewriter, SourceList, ChunkViewer

---

## 5. Agent Conversation

**Goal:** Have a multi-turn conversation with an AI agent that uses
TrustGraph tools to research and answer questions.

```
Ask question  →  Watch reasoning  →  Read answer  →  Explore entities
```

### Steps

1. **Ask question**
   - User types a question in the chat input.
   - Agent mode is active.
   - Clicks "Ask".

2. **Watch reasoning**
   - The conversation panel shows the agent's work in real time:
     - **Thinking** — the agent's internal reasoning (collapsible)
     - **Observation** — results from tool calls (knowledge queries,
       text completions)
   - Multiple think/observe cycles may occur as the agent works
     through a complex question.
   - Each message type is visually distinct (colour-coded).

3. **Read answer**
   - The agent's final answer appears as a distinct message.
   - Markdown rendering for structured responses.

4. **Explore entities**
   - Related entities panel shows entities found via embedding
     similarity to the query.
   - Each entity is a clickable badge showing label and domain colour.
   - Clicking an entity:
     - Highlights it and its neighbourhood on the graph panel
     - Graph panel (right side) re-centres on the selected entity
   - Clicking a node directly on the graph opens the detail panel
     with properties and relationships.

### Components used
SearchInput, MessageBubble, Badge, GraphCanvas, NodeDetailPanel

---

## 6. Data Search

**Goal:** Search across structured data tables using natural language and
explore matching records.

```
Enter search  →  View results  →  Filter by schema  →  Examine record
```

### Steps

1. **Enter search**
   - User types a search term in the search input.
   - Clicks "Search".
   - The system computes embeddings and searches all schemas.

2. **View results**
   - Results appear grouped by schema (table).
   - Each group shows:
     - Schema name and match count
     - Individual records with all fields displayed in a grid
     - Relevance score for each match
   - Results are sorted by relevance within each group.

3. **Filter by schema**
   - A filter bar at the top shows all schemas with results.
   - Clicking a schema filters to show only that schema's results.
   - Stats update: "5 of 23 results" when filtered.

4. **Examine record**
   - Hovering a record highlights it.
   - All fields are displayed inline:
     - Field names as small uppercase labels
     - Field values below each label
   - High-relevance matches (>80%) are highlighted in green,
     medium (>50%) in amber.

### Components used
SearchInput, FilterBar, Card, SectionLabel, Badge

---

## 7. Ontology Review

**Goal:** Understand the structure of the knowledge in the system — what
classes exist, what properties they have, and how they relate.

```
View classes  →  Inspect class  →  Browse instances  →  View relationships
```

### Steps

1. **View classes**
   - Ontology page shows all OWL classes as cards in a grid.
   - Each card shows:
     - Class name (coloured by domain)
     - Description
     - Property count
     - Instance count

2. **Inspect class**
   - Card expands (or user clicks) to show:
     - All datatype properties listed as badges
     - All instances listed with ID and label

3. **Browse instances**
   - Instance list shows each entity belonging to the class.
   - Clicking an instance could navigate to it in the graph view.

4. **View relationships**
   - Below the class cards, a relationships section shows all
     object properties.
   - Each relationship shows:
     - Predicate label
     - Domain class → Range class (colour-coded)
   - A summary bar shows totals: classes, instances, object
     properties, datatype properties.

### Components used
Card, Badge, SectionLabel, LoadingState

---

## 8. Collection Management

**Goal:** Organise knowledge into collections, configure them, and switch
between them.

```
View collections  →  Create collection  →  Assign content  →  Switch context
```

### Steps

1. **View collections**
   - A collections panel shows all available collections.
   - Each collection displays:
     - Name and description
     - Tags
     - Entity/triple counts
     - Created/updated timestamps

2. **Create collection**
   - User clicks "New Collection".
   - Enters name, description, and tags.
   - Collection is created and appears in the list.

3. **Assign content**
   - User can assign documents to a collection during upload
     (see Workflow 1).
   - Existing knowledge cores can be loaded into a collection.
   - Import from another collection or external source.

4. **Switch context**
   - A collection selector is visible globally (header or sidebar).
   - Switching collection updates all views:
     - Graph shows entities from the selected collection
     - Queries run against the selected collection
     - Data search scopes to the selected collection
   - The switch is immediate — no page reload.

### Components used
CollectionList, CollectionForm, CollectionPicker, TagInput

---

## 9. Knowledge Export and Backup

**Goal:** Export knowledge from TrustGraph for backup, sharing, or
migration to another instance.

```
Select scope  →  Configure export  →  Download  →  Verify
```

### Steps

1. **Select scope**
   - User chooses what to export:
     - A specific collection
     - A specific knowledge core
     - All data
   - Preview shows entity/triple counts for the selection.

2. **Configure export**
   - Format options (MessagePack is default).
   - Option to include or exclude:
     - Triples
     - Embeddings
     - Document metadata

3. **Download**
   - Export streams via chunked download.
   - Progress bar shows percentage complete.
   - File saves to local disk.

4. **Verify**
   - Summary shows:
     - Export size
     - Triple count
     - Embedding count
   - Option to re-import into a different collection for
     verification.

### Components used
ScopePicker, ExportConfig, ProgressBar, ExportSummary

---

## 10. Flow Configuration

**Goal:** Set up and manage processing flows that control how documents
are ingested and transformed into knowledge.

```
Browse blueprints  →  Configure flow  →  Start flow  →  Monitor
```

### Steps

1. **Browse blueprints**
   - Available flow blueprints displayed as cards.
   - Each shows: name, description, required parameters.
   - Default blueprints are marked; custom ones are editable.

2. **Configure flow**
   - User selects a blueprint and configures parameters:
     - LLM model selection
     - Chunk size and overlap
     - Embedding model
     - Entity extraction settings
   - Parameter validation provides inline feedback.

3. **Start flow**
   - User clicks "Start".
   - Flow initialises and becomes available for document processing.
   - Status transitions: Starting → Running.

4. **Monitor**
   - Running flows show:
     - Status (running/stopped/error)
     - Documents processed count
     - Processing queue depth
   - User can stop a flow from this view.

### Components used
BlueprintCard, FlowConfig, ParameterForm, FlowStatus, StatusBadge

---

## Workflow Summary

| # | Workflow              | Entry point        | Key outcome                          |
|---|-----------------------|--------------------|--------------------------------------|
| 1 | Document Ingestion    | Add Documents      | Documents processed into knowledge   |
| 2 | Knowledge Exploration | Context Graph      | Understanding of entity relationships|
| 3 | Graph RAG Query       | Explain → Graph RAG| Answered question with provenance    |
| 4 | Document RAG Query    | Explain → Doc RAG  | Answered question from documents     |
| 5 | Agent Conversation    | Agent Query        | Multi-step researched answer         |
| 6 | Data Search           | Table Explorer     | Found records across schemas         |
| 7 | Ontology Review       | Ontology           | Understanding of knowledge structure |
| 8 | Collection Management | Collections        | Organised and scoped knowledge       |
| 9 | Knowledge Export      | Export             | Backed up or shared knowledge        |
| 10| Flow Configuration    | Flows              | Configured processing pipeline       |
