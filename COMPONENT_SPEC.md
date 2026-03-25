# TrustGraph Toolkit — Component Specification

This document specifies every component and hook the toolkit needs.
The architecture follows a **three-tier pattern** for each domain area:

```
Tier 1: Hooks         — data fetching, parsing, state management (headless)
Tier 2: Domain pieces — small components that render one domain concept
Tier 3: Composites    — convenience components that wire hooks + pieces
                        into a default layout
```

A developer who wants a custom layout uses Tier 1 + Tier 2.
A developer who wants the default just drops in Tier 3.

All tiers also build on a shared foundation of **generic primitives**
(Card, Badge, etc.) that have no TrustGraph-specific knowledge.

**Status key:** `[exists]` already built, `[new]` needs building,
`[refactor]` exists but needs rework.

---

# Part A — Generic Foundation

These components have no TrustGraph-specific knowledge. They are
reusable in any React application.

## A1. Primitives

### Badge `[exists]`
A small coloured label for tagging, filtering, and status.

| Prop | Type | Purpose |
|------|------|---------|
| `color` | `string` | Accent colour |
| `selected` | `boolean` | Highlighted state (border, glow) |
| `size` | `"small" \| "medium"` | Compact or standard |
| `onClick` | `() => void` | Makes it interactive |
| `children` | `ReactNode` | Label content |

### SectionLabel `[exists]`
Uppercase mono-font section heading with wide letter-spacing.

| Prop | Type | Purpose |
|------|------|---------|
| `children` | `ReactNode` | Label text |
| `marginTop` | `number` | Top spacing |
| `marginBottom` | `number` | Bottom spacing |

### StatusIndicator `[new]`
Coloured dot or icon showing state.

| Prop | Type | Purpose |
|------|------|---------|
| `status` | `"success" \| "warning" \| "error" \| "info" \| "active" \| "inactive"` | Visual state |
| `label` | `string` | Text alongside indicator |
| `icon` | `string` | Override default icon |
| `size` | `"small" \| "medium"` | Dot/icon size |

### ProgressBar `[new]`
Horizontal bar showing completion percentage.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `number` | 0–100 percentage |
| `color` | `string` | Fill colour |
| `size` | `"thin" \| "standard"` | Bar height |
| `label` | `string` | Optional text overlay |
| `animated` | `boolean` | Subtle stripe animation |

### ScoreIndicator `[new]`
Displays a relevance/similarity score with colour coding.

| Prop | Type | Purpose |
|------|------|---------|
| `score` | `number` | 0–1 value |
| `format` | `"percent" \| "decimal"` | Display format |

### Tooltip `[new]`
Floating info panel anchored to a position.

| Prop | Type | Purpose |
|------|------|---------|
| `x` | `number` | Anchor X position |
| `y` | `number` | Anchor Y position |
| `color` | `string` | Border accent colour |
| `visible` | `boolean` | Show/hide |
| `children` | `ReactNode` | Tooltip content |

---

## A2. Controls

### TextInput `[new]`
Base text input field.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string` | Controlled value |
| `onChange` | `(value: string) => void` | Change handler |
| `placeholder` | `string` | Placeholder text |
| `disabled` | `boolean` | Disabled state |
| `onSubmit` | `() => void` | Enter key handler |
| `autoFocus` | `boolean` | Focus on mount |

### SearchInput `[exists]`
Text input with an action button. Composes TextInput.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string` | Input value |
| `onChange` | `(value: string) => void` | Change handler |
| `onSubmit` | `() => void` | Button/enter handler |
| `placeholder` | `string` | Input placeholder |
| `buttonText` | `string` | Button label |
| `buttonColor` | `string` | Button accent colour |
| `isLoading` | `boolean` | Disables and shows "..." |

### TagInput `[new]`
Input for adding/removing tags as chips. Composes TextInput + Badge.

| Prop | Type | Purpose |
|------|------|---------|
| `tags` | `string[]` | Current tags |
| `onChange` | `(tags: string[]) => void` | Tag list changed |
| `placeholder` | `string` | Input placeholder |
| `color` | `string` | Badge colour |
| `suggestions` | `string[]` | Autocomplete options |

### Select `[new]`
Dropdown selector.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string \| null` | Selected value |
| `options` | `{ key: string; label: string; icon?: string }[]` | Options |
| `onChange` | `(key: string) => void` | Selection handler |
| `placeholder` | `string` | Unselected label |
| `color` | `string` | Accent colour |

### Toggle `[new]`
Boolean switch.

| Prop | Type | Purpose |
|------|------|---------|
| `checked` | `boolean` | Current state |
| `onChange` | `(checked: boolean) => void` | Toggle handler |
| `label` | `string` | Adjacent label |
| `color` | `string` | Active colour |

### ModeSelector `[new]`
Horizontal row of mode buttons. Composes Badge or FilterButton.

| Prop | Type | Purpose |
|------|------|---------|
| `modes` | `{ key: string; label: string }[]` | Available modes |
| `activeMode` | `string` | Currently selected |
| `onChange` | `(key: string) => void` | Mode changed |
| `color` | `string` | Active accent colour |

---

## A3. Data Display

### Card `[exists]`
Container with subtle background and border.

| Prop | Type | Purpose |
|------|------|---------|
| `borderColor` | `string` | Optional coloured border |
| `borderRadius` | `number` | Corner radius override |
| `padding` | `string \| number` | Internal padding |
| `children` | `ReactNode` | Card content |

### PropertyList `[new]`
Key-value pair display.

| Prop | Type | Purpose |
|------|------|---------|
| `properties` | `Record<string, string \| number>` | Key-value data |
| `labels` | `Record<string, string>` | Human-readable key overrides |
| `layout` | `"stacked" \| "grid" \| "inline"` | Arrangement |
| `columns` | `number` | Grid columns (grid layout) |

### StatBar `[new]`
Horizontal row of labelled statistics.

| Prop | Type | Purpose |
|------|------|---------|
| `stats` | `{ label: string; value: string \| number }[]` | Stat entries |
| `color` | `string` | Accent colour |

### ItemList `[new]`
Generic scrollable list with consistent item spacing and hover states.

| Prop | Type | Purpose |
|------|------|---------|
| `items` | `T[]` | Data items |
| `renderItem` | `(item: T, index: number) => ReactNode` | Item renderer |
| `emptyMessage` | `string` | Empty state text |
| `loading` | `boolean` | Loading state |
| `loadingMessage` | `string` | Loading text |

---

## A4. Layout

### FilterBar `[exists]`
Horizontal bar of filter chips with stats.

| Prop | Type | Purpose |
|------|------|---------|
| `items` | `FilterItem[]` | Filter options |
| `selectedKey` | `string \| null` | Active filter |
| `onSelect` | `(key: string \| null) => void` | Filter changed |
| `stats` | `string` | Right-aligned summary text |
| `emptyMessage` | `string` | Text when no items |

### SplitPane `[new]`
Two-panel layout with a primary area and a conditional side panel.

| Prop | Type | Purpose |
|------|------|---------|
| `children` | `ReactNode` | Primary content |
| `panel` | `ReactNode \| null` | Side panel (null = hidden) |
| `panelWidth` | `number \| string` | Panel width |
| `panelSide` | `"left" \| "right"` | Panel position |
| `panelBorder` | `boolean` | Show divider border |

### DetailPanel `[new]`
Panel for inspecting a selected item.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Panel heading |
| `subtitle` | `string` | Secondary text |
| `onClose` | `() => void` | Close handler |
| `children` | `ReactNode` | Panel content |
| `width` | `number` | Panel width |

### Toolbar `[new]`
Horizontal bar for controls and labels at the top of a section.

| Prop | Type | Purpose |
|------|------|---------|
| `children` | `ReactNode` | Bar contents |
| `borderBottom` | `boolean` | Bottom border |
| `padding` | `string` | Override padding |

### PageLayout `[new]`
Standard page container that handles viewport height calculation.

| Prop | Type | Purpose |
|------|------|---------|
| `headerOffset` | `number` | Header height to subtract |
| `children` | `ReactNode` | Page content |
| `padding` | `string` | Page-level padding |
| `scroll` | `boolean` | Enable vertical scroll |
| `maxWidth` | `number` | Content max-width |

---

## A5. Feedback

### LoadingState `[exists]`
Centered text for loading and error states.

| Prop | Type | Purpose |
|------|------|---------|
| `variant` | `"loading" \| "error"` | Visual treatment |
| `message` | `string` | Display text |

### EmptyState `[new]`
Standardised empty state display.

| Prop | Type | Purpose |
|------|------|---------|
| `message` | `string` | Descriptive text |
| `icon` | `string` | Optional icon |
| `action` | `{ label: string; onClick: () => void }` | Optional action button |

### Toaster `[exists]`
Fixed toast notification container.

### Typewriter `[exists]`
Character-by-character text reveal for streaming output.

| Prop | Type | Purpose |
|------|------|---------|
| `text` | `string` | Text to reveal |
| `speed` | `number` | Ms per character |
| `onDone` | `() => void` | Animation complete |

### ProcessingStatus `[new]`
Multi-step processing indicator showing named stages.

| Prop | Type | Purpose |
|------|------|---------|
| `stages` | `{ key: string; label: string; status: "pending" \| "active" \| "complete" \| "error" }[]` | Stages |
| `currentStage` | `string` | Active stage key |

Composes StatusIndicator.

---

## A6. Forms

### FormField `[new]`
Labelled wrapper for any input control.

| Prop | Type | Purpose |
|------|------|---------|
| `label` | `string` | Field label |
| `description` | `string` | Help text |
| `error` | `string` | Validation error |
| `required` | `boolean` | Required indicator |
| `children` | `ReactNode` | Input control |

---

## A7. Messaging (generic)

### MessageBubble `[exists]`
A single message with type-based styling.

| Prop | Type | Purpose |
|------|------|---------|
| `message` | `Message` | Message data (type, text, role) |

### MessageList `[new]`
Scrollable list of messages with auto-scroll on new messages.

| Prop | Type | Purpose |
|------|------|---------|
| `messages` | `Message[]` | Conversation messages |
| `loading` | `boolean` | Show typing indicator |
| `loadingText` | `string` | Typing indicator text |
| `emptyMessage` | `string` | Empty state text |

Composes MessageBubble.

---

## A8. File Handling (generic)

### DropZone `[new]`
Drag-and-drop file target with click-to-browse fallback.

| Prop | Type | Purpose |
|------|------|---------|
| `onFiles` | `(files: File[]) => void` | Files selected |
| `accept` | `string` | Accepted MIME types |
| `multiple` | `boolean` | Allow multiple files |
| `disabled` | `boolean` | Disabled state |
| `label` | `string` | Instruction text |

### FileItem `[new]`
A single file showing name, size, type, and status.

| Prop | Type | Purpose |
|------|------|---------|
| `name` | `string` | Filename |
| `size` | `number` | Bytes |
| `type` | `string` | MIME type |
| `status` | `"queued" \| "uploading" \| "uploaded" \| "processing" \| "complete" \| "error"` | State |
| `progress` | `number` | Upload percentage |
| `onRetry` | `() => void` | Retry failed upload |
| `onCancel` | `() => void` | Cancel |

Composes StatusIndicator + ProgressBar.

---

# Part B — Domain: Knowledge Graph

Three-tier architecture for exploring entities, relationships, and
ontology structure.

## B1. Hooks (Tier 1)

### useGraphData `[exists]`
Fetches all triples, parses OWL classes, extracts entities and
relationships. Returns `{ entities, relationships, ontology,
propertyLabels, isLoading, isError }`.

### useOntologySchema `[exists]`
Fetches and parses OWL schema — classes, object properties, datatype
properties. Returns `{ schema, isLoading, isError }`.

### useEntityLookup `[new]`
Resolves a single entity by URI or ID. Returns its label, type,
properties, and connected relationships.

| Arg | Type | Purpose |
|-----|------|---------|
| `uri` | `string` | Entity URI to resolve |

Returns `{ entity, relationships, isLoading }`.

### useEntityNeighbourhood `[new]`
Given an entity, returns its immediate graph neighbourhood — the set of
connected entities and the relationships between them. Useful for
building custom detail views or mini-graphs.

| Arg | Type | Purpose |
|-----|------|---------|
| `entityId` | `string` | Centre entity |
| `entities` | `Entity[]` | All entities |
| `relationships` | `Relationship[]` | All relationships |

Returns `{ neighbours, connections, domains }`.

### useDomainFilter `[new]`
Manages domain filter state — which domains are visible, which are
relevant to a selection. Extracted from GraphView's inline filter logic.

| Arg | Type | Purpose |
|-----|------|---------|
| `entities` | `Entity[]` | All entities |
| `relationships` | `Relationship[]` | All relationships |
| `selectedEntityId` | `string \| null` | Currently selected |

Returns `{ filterItems, relevantDomains, activeFilter, setActiveFilter }`.

---

## B2. Domain Pieces (Tier 2)

### EntityBadge `[new]`
Renders a single entity as a coloured badge with domain icon and label.
Knows how to display an Entity — app code doesn't need to extract
colour/icon/label.

| Prop | Type | Purpose |
|------|------|---------|
| `entity` | `Entity` | Entity data |
| `selected` | `boolean` | Selected state |
| `onClick` | `() => void` | Click handler |

Composes Badge.

### EntityList `[new]`
List of entities as badges. Horizontal or vertical layout.

| Prop | Type | Purpose |
|------|------|---------|
| `entities` | `Entity[]` | Entity data |
| `selectedId` | `string \| null` | Currently selected |
| `onSelect` | `(entity: Entity) => void` | Selection handler |
| `layout` | `"horizontal" \| "vertical"` | Direction |
| `emptyMessage` | `string` | Empty state text |
| `loading` | `boolean` | Loading state |

Composes EntityBadge.

### EntityProperties `[new]`
Renders an entity's properties with human-readable labels.

| Prop | Type | Purpose |
|------|------|---------|
| `entity` | `Entity` | Entity data |
| `propertyLabels` | `Record<string, string>` | Label overrides |
| `layout` | `"stacked" \| "grid" \| "inline"` | Arrangement |

Composes PropertyList. Knows how to extract and format Entity props.

### EntityRelationships `[new]`
Renders an entity's relationships grouped by predicate, with clickable
connected entities.

| Prop | Type | Purpose |
|------|------|---------|
| `entity` | `Entity` | Centre entity |
| `relationships` | `Relationship[]` | All relationships |
| `entities` | `Entity[]` | All entities (for labels) |
| `onEntityClick` | `(entity: Entity) => void` | Navigate to entity |

### OntologyClassCard `[new]`
Renders a single OWL class — name, description, properties, and
instance count.

| Prop | Type | Purpose |
|------|------|---------|
| `className` | `string` | Class label |
| `color` | `string` | Domain colour |
| `icon` | `string` | Domain icon |
| `description` | `string` | Class description |
| `properties` | `string[]` | Datatype property names |
| `instanceCount` | `number` | Number of instances |
| `onExpand` | `() => void` | Show instances |

Composes Card + Badge + SectionLabel.

### OntologyInstanceList `[new]`
Lists instances of a class with ID and label.

| Prop | Type | Purpose |
|------|------|---------|
| `instances` | `{ id: string; label: string }[]` | Instance data |
| `onInstanceClick` | `(id: string) => void` | Navigate to instance |

### RelationshipPredicateCard `[new]`
Renders a single object property showing domain → range.

| Prop | Type | Purpose |
|------|------|---------|
| `label` | `string` | Predicate label |
| `domainLabel` | `string` | Domain class name |
| `domainColor` | `string` | Domain colour |
| `rangeLabel` | `string` | Range class name |
| `rangeColor` | `string` | Range colour |

Composes Card.

---

## B3. Graph Renderers

### GraphCanvas `[exists]`
Canvas-based graph renderer. Best for large graphs (hundreds of nodes)
where DOM node count would be a bottleneck.

| Prop | Type | Purpose |
|------|------|---------|
| `entities` | `Entity[]` | Node data |
| `relationships` | `Relationship[]` | Edge data |
| `ontology` | `OntologyType` | Domain metadata |
| `highlightedEntities` | `string[]` | IDs to highlight |
| `activeFilter` | `string \| null` | Domain filter |
| `onNodeClick` | `(node: Entity) => void` | Node click handler |

### GraphCanvasSVG `[exists]`
SVG-based graph renderer. Best for smaller graphs where DOM
accessibility matters, or when nodes need to contain interactive
HTML content.

Same props as GraphCanvas.

### ExplainGraph `[exists]`
Specialised graph for provenance/explain event chains.

| Prop | Type | Purpose |
|------|------|---------|
| `nodes` | `ExplainGraphNode[]` | Event nodes |
| `edges` | `ExplainGraphEdge[]` | Derivation edges |
| `highlightedNodeIds` | `string[]` | Highlighted nodes |
| `highlightedEdgeIds` | `string[]` | Highlighted edges |
| `onNodeClick` | `(id: string) => void` | Node click handler |

### ZoomControls `[exists]`
Overlay buttons for zoom in/out/reset.

---

## B4. Composites (Tier 3)

### NodeDetailPanel `[refactor]`
Complete entity inspection panel. Refactor to compose DetailPanel +
EntityProperties + EntityRelationships.

| Prop | Type | Purpose |
|------|------|---------|
| `node` | `Entity` | Selected entity |
| `relationships` | `Relationship[]` | All relationships |
| `entities` | `Entity[]` | All entities |
| `ontology` | `OntologyType` | Domain metadata |
| `propertyLabels` | `Record<string, string>` | Property label map |
| `onClose` | `() => void` | Close handler |
| `onNodeSelect` | `(node: Entity) => void` | Navigate to entity |

### OntologyOverview `[new]`
Complete ontology view — class cards, relationship predicates, and
summary stats. Composes OntologyClassCard + OntologyInstanceList +
RelationshipPredicateCard + StatBar.

| Prop | Type | Purpose |
|------|------|---------|
| `ontology` | `OntologyType` | Domain metadata |
| `schema` | `OntologySchema` | OWL schema |
| `entities` | `Entity[]` | All entities |
| `onInstanceClick` | `(id: string) => void` | Navigate to entity |

### GraphExplorer `[new]`
Complete graph exploration view — graph canvas + filter bar + detail
panel. Wires useGraphData + useDomainFilter + useEntityNeighbourhood.

| Prop | Type | Purpose |
|------|------|---------|
| `renderer` | `"canvas" \| "svg"` | Which graph renderer |
| `onEntitySelect` | `(entity: Entity \| null) => void` | External selection callback |

---

# Part C — Domain: Explainability & Provenance

Three-tier architecture for understanding how TrustGraph arrived at
an answer.

## C1. Hooks (Tier 1)

### useExplainSession `[new]`
Manages a stream of explain events for a single query. Handles event
arrival, deduplication, and ordering.

| Arg | Type | Purpose |
|-----|------|---------|
| `onEvent` | `(event: ExplainEvent) => void` | Optional external listener |

Returns `{ events, addEvent, reset, isActive }`.

Events are `ExplainNode` objects with `explainId`, `explainGraph`,
`eventType`, `data`, `fetched`, `fetching`.

### useExplainEvent `[new]`
Fetches and parses the full data for a single explain event. Handles
the backoff retry for eventually-consistent triples, type detection,
and basic data extraction.

| Arg | Type | Purpose |
|-----|------|---------|
| `explainId` | `string` | Event URI |
| `explainGraph` | `string` | Named graph |

Returns `{ eventType, data, isLoading, error }`.

`eventType` is one of: `"question"`, `"grounding"`, `"exploration"`,
`"focus"`, `"synthesis"`, `"analysis"`, `"conclusion"`, `"reflection"`.

`data` is a typed union depending on `eventType`:
- Question: `{ query, timestamp }`
- Grounding: `{ concepts }`
- Exploration: `{ entities, entityLabels, edgeCount, chunkCount }`
- Focus: `{ edgeSelections }` (each with edge triple, reasoning, labels)
- Synthesis: `{ contentLength }`
- Analysis: `{ action, arguments }`
- Conclusion: `{ documentUri }`
- Reflection: `{ documentUri, reflectionType }`

### useExplainEventEnrichment `[new]`
Enriches a parsed explain event with KG lookups — entity labels, edge
details, provenance chains. Separated from useExplainEvent so consumers
can choose whether to pay the cost of enrichment.

| Arg | Type | Purpose |
|-----|------|---------|
| `eventType` | `string` | Event type |
| `data` | `EventData` | Basic parsed data |
| `explainGraph` | `string` | Named graph |

Returns `{ enrichedData, isLoading }`.

### useEdgeProvenance `[new]`
Traces the provenance chain for a single edge — finds containing
subgraphs, follows `prov:wasDerivedFrom` links back to source
documents.

| Arg | Type | Purpose |
|-----|------|---------|
| `edge` | `{ s: string; p: string; o: string }` | Edge triple |

Returns `{ chains, isLoading }` where each chain is
`{ uri: string; label: string }[]` from edge to source.

### useSourceDocument `[new]`
Fetches document metadata and chunk text for a source URI. Used when
a user clicks through to inspect a source.

| Arg | Type | Purpose |
|-----|------|---------|
| `chunkUri` | `string` | Chunk URI |
| `documentUri` | `string` | Document URI |

Returns `{ title, tags, chunkText, isLoading, error }`.

### useExplainGraph `[new]`
Derives graph nodes and edges from a set of explain events — the data
needed to render an ExplainGraph. Extracted from ExplainView's inline
`useMemo`.

| Arg | Type | Purpose |
|-----|------|---------|
| `events` | `ExplainNode[]` | Parsed explain events |

Returns `{ graphNodes, graphEdges }`.

---

## C2. Domain Pieces (Tier 2)

### ExplainEventCard `[new]`
Renders a single explain event with type-appropriate content.
Colour-coded by event type. Expandable for detail.

| Prop | Type | Purpose |
|------|------|---------|
| `eventType` | `string` | Event type |
| `data` | `EventData` | Parsed event data |
| `color` | `string` | Type colour (from eventTypeColor) |
| `loading` | `boolean` | Still fetching data |
| `error` | `string` | Fetch error |
| `expanded` | `boolean` | Show full detail |
| `onToggle` | `() => void` | Expand/collapse |

Renders different content per type:
- Question: query text, timestamp
- Grounding: concept badges
- Exploration: entity badges, edge/chunk counts
- Focus: edge selections with reasoning
- Synthesis: content length
- Analysis: action + arguments
- Conclusion/Reflection: document link

Composes Card + Badge + SectionLabel.

### EdgeDetailCard `[new]`
Renders a single selected edge — the triple (subject → predicate →
object) with labels and reasoning text.

| Prop | Type | Purpose |
|------|------|---------|
| `edge` | `{ s: string; p: string; o: string }` | Edge triple |
| `edgeLabels` | `{ s: string; p: string; o: string }` | Human labels |
| `reasoning` | `string` | Why this edge was selected |
| `onInspectProvenance` | `() => void` | View sources |

Composes Card.

### ProvenanceChainView `[new]`
Renders a source chain as a breadcrumb trail from edge back to
source document.

| Prop | Type | Purpose |
|------|------|---------|
| `chain` | `{ uri: string; label: string }[]` | Ordered chain |
| `onNodeClick` | `(uri: string) => void` | Click a chain node |

### SourcePanel `[new]`
Panel showing a source document's chunk text, title, and metadata.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Document title |
| `tags` | `string[]` | Document tags |
| `chunkText` | `string` | Source chunk content |
| `loading` | `boolean` | Still loading |
| `error` | `string` | Load error |
| `onClose` | `() => void` | Close panel |

Composes DetailPanel + PropertyList.

### SourceChunk `[new]`
Compact display of a document chunk with relevance score — used in
ranked source lists.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Document title |
| `text` | `string` | Chunk text |
| `score` | `number` | Relevance score |
| `metadata` | `Record<string, string>` | Document metadata |
| `expanded` | `boolean` | Show full text or excerpt |
| `onToggle` | `() => void` | Expand/collapse |

Composes Card + ScoreIndicator.

### SourceList `[new]`
Ranked list of source chunks.

| Prop | Type | Purpose |
|------|------|---------|
| `sources` | `SourceData[]` | Ranked source chunks |
| `expandedIndex` | `number \| null` | Currently expanded |
| `onToggle` | `(index: number) => void` | Expand/collapse |

Composes SourceChunk.

---

## C3. Composites (Tier 3)

### ExplainTimeline `[new]`
Complete explain event timeline — shows events as they arrive,
expandable detail, colour-coded by type. Wires useExplainSession +
useExplainEvent + ExplainEventCard.

| Prop | Type | Purpose |
|------|------|---------|
| `events` | `ExplainNode[]` | Explain events |
| `onEventSelect` | `(eventId: string) => void` | Focus on event |
| `selectedEventId` | `string \| null` | Currently focused |

### ExplainPanel `[new]`
Full explain view — timeline on the left, provenance graph on the
right, source panel on selection. Wires all explain hooks and pieces.

| Prop | Type | Purpose |
|------|------|---------|
| `events` | `ExplainNode[]` | Explain events |
| `graphNodes` | `ExplainGraphNode[]` | Provenance graph nodes |
| `graphEdges` | `ExplainGraphEdge[]` | Provenance graph edges |

---

# Part D — Domain: Search & Embeddings

Three-tier architecture for semantic search across entities and
structured data.

## D1. Hooks (Tier 1)

### useEmbeddingSearch `[new]`
Computes embeddings for a search term and finds matching graph entities.
Composes useEmbeddings + useGraphEmbeddings from react-state, handling
the vector extraction (picks first vector from the response).

| Arg | Type | Purpose |
|-----|------|---------|
| `term` | `string \| undefined` | Search term |
| `collection` | `string` | Collection to search |
| `limit` | `number` | Max results |

Returns `{ results: EntityMatch[], isLoading, error }`.

### useEntityMatchResolution `[new]`
Takes raw EntityMatch results (URIs + scores) and resolves them against
loaded entities to produce display-ready results with labels, colours,
and icons.

| Arg | Type | Purpose |
|-----|------|---------|
| `matches` | `EntityMatch[]` | Raw embedding matches |
| `entities` | `Entity[]` | Loaded entities for lookup |

Returns `{ resolvedMatches: ResolvedEntityMatch[] }`.

### useDataSearch `[new]`
Searches structured data across all schemas using embeddings. Handles
the full flow: compute embeddings → search all schemas → fetch row
data → deduplicate → match. Extracted from DataView's inline logic.

| Arg | Type | Purpose |
|-----|------|---------|
| `term` | `string` | Search term |
| `collection` | `string` | Collection |
| `schemas` | `SchemaInfo[]` | Available schemas |

Returns `{ results, isSearching, hasSearched, search() }`.

### useSchemaList `[new]`
Fetches and parses available schemas into a usable format. Extracted
from DataView's inline schema parsing.

Returns `{ schemas: SchemaInfo[], isLoading, isError }`.

---

## D2. Domain Pieces (Tier 2)

### SearchResultCard `[new]`
Renders a single search result row with all fields and relevance score.

| Prop | Type | Purpose |
|------|------|---------|
| `rowData` | `Record<string, unknown>` | Row field values |
| `text` | `string` | Fallback text (when no row data) |
| `score` | `number` | Relevance score |

Composes Card + PropertyList + ScoreIndicator.

### SchemaResultGroup `[new]`
Renders a group of search results from one schema, with schema name
header and match count.

| Prop | Type | Purpose |
|------|------|---------|
| `schemaName` | `string` | Schema/table name |
| `matches` | `SearchResult[]` | Results in this schema |

Composes Card + SearchResultCard.

### EmbeddingEntityList `[new]`
Renders resolved embedding matches as selectable entity badges with
loading state.

| Prop | Type | Purpose |
|------|------|---------|
| `matches` | `ResolvedEntityMatch[]` | Resolved matches |
| `selectedId` | `string \| null` | Currently selected |
| `onSelect` | `(id: string \| null) => void` | Selection handler |
| `loading` | `boolean` | Embeddings loading |

Composes EntityBadge.

---

## D3. Composites (Tier 3)

### DataSearchView `[new]`
Complete data search — input, schema filters, results. Wires
useDataSearch + useSchemaList + SchemaResultGroup.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `string` | Collection to search |

### EntitySearchPanel `[new]`
Embedding-based entity search with results feeding into a graph view.
Wires useEmbeddingSearch + useEntityMatchResolution +
EmbeddingEntityList.

| Prop | Type | Purpose |
|------|------|---------|
| `term` | `string \| undefined` | Search term |
| `collection` | `string` | Collection |
| `entities` | `Entity[]` | Loaded entities |
| `onSelect` | `(entityId: string \| null) => void` | Entity selected |

---

# Part E — Domain: Agent Conversation

Three-tier architecture for AI agent interaction with streaming
responses and tool use visibility.

## E1. Hooks (Tier 1)

### useAgentChat `[new]`
Manages a chat session with the TrustGraph agent. Handles message
submission, streaming responses (thinking/observation/answer phases),
and conversation history. Wraps useChat + useConversation from
react-state with additional state management.

| Arg | Type | Purpose |
|-----|------|---------|
| `chatMode` | `string` | Chat mode (e.g. "agent") |

Returns `{ messages, submitMessage, isSubmitting }`.

### useAgentExplain `[new]`
Combines agent chat with explainability — provides both conversation
messages and explain events from the same query.

| Arg | Type | Purpose |
|-----|------|---------|
| `chatMode` | `string` | Chat mode |

Returns `{ messages, submitMessage, isSubmitting, explainEvents,
addExplainEvent }`.

---

## E2. Domain Pieces (Tier 2)

MessageBubble `[exists]` and MessageList `[new]` from the generic
foundation (A7) serve as the domain pieces here. They already know
how to render thinking/observation/answer message types with
appropriate styling.

### AgentStatusIndicator `[new]`
Shows the current agent phase during processing.

| Prop | Type | Purpose |
|------|------|---------|
| `phase` | `"idle" \| "thinking" \| "observing" \| "answering"` | Current phase |
| `isActive` | `boolean` | Query in progress |

Composes StatusIndicator.

---

## E3. Composites (Tier 3)

### AgentChatPanel `[new]`
Complete agent conversation — input, message list, related entities,
graph. Wires useAgentChat + useEmbeddingSearch + MessageList +
EmbeddingEntityList.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `string` | Collection |
| `showGraph` | `boolean` | Include graph panel |
| `renderer` | `"canvas" \| "svg"` | Graph renderer |

---

# Part F — Domain: RAG Queries

Three-tier architecture for Graph RAG and Document RAG with
explainability.

## F1. Hooks (Tier 1)

### useGraphRag `[new]`
Executes a Graph RAG query with streaming response and explain events.
Wraps useInference.graphRag with state management for the response
text, error handling, and explain event collection.

| Arg | Type | Purpose |
|-----|------|---------|
| `collection` | `string` | Collection |
| `options` | `GraphRagOptions` | RAG options |

Returns `{ query, response, isQuerying, error, explainEvents, reset }`.

### useDocumentRag `[new]`
Executes a Document RAG query with streaming response and explain
events.

| Arg | Type | Purpose |
|-----|------|---------|
| `collection` | `string` | Collection |

Returns `{ query, response, isQuerying, error, explainEvents, reset }`.

---

## F2. Domain Pieces (Tier 2)

The display pieces for RAG are shared with Explainability (Part C) and
Search (Part D). The RAG-specific pieces are:

### StreamingResponse `[new]`
Renders a streaming LLM response with markdown support.

| Prop | Type | Purpose |
|------|------|---------|
| `text` | `string` | Response text so far |
| `isStreaming` | `boolean` | Still receiving |
| `error` | `string \| null` | Error message |

Composes Typewriter (optional) for character-by-character reveal.

---

## F3. Composites (Tier 3)

### GraphRagView `[new]`
Complete Graph RAG query view — input, mode selector, streaming
response, explain timeline, provenance graph, source panel. Wires
useGraphRag + useExplainSession + ExplainTimeline + ExplainGraph +
StreamingResponse.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `string` | Collection |

### DocumentRagView `[new]`
Complete Document RAG query view. Same structure as GraphRagView but
uses useDocumentRag.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `string` | Collection |

### QueryView `[new]`
Combines Graph RAG, Document RAG, and Agent modes with a mode selector.
Wires GraphRagView + DocumentRagView + AgentChatPanel + ModeSelector.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `string` | Collection |
| `defaultMode` | `"graph-rag" \| "doc-rag" \| "agent"` | Initial mode |

---

# Part G — Domain: Document Ingestion

Three-tier architecture for loading documents into TrustGraph.

## G1. Hooks (Tier 1)

### useDocumentUpload `[new]`
Manages chunked file upload to TrustGraph. Wraps useChunkedUpload from
react-state with file queue management, progress tracking, and error
handling.

Returns `{ addFiles, uploadAll, files, overallProgress, isUploading,
errors }`.

### useDocumentProcessing `[new]`
Manages document processing — submitting uploaded documents to a flow,
tracking processing stages.

| Arg | Type | Purpose |
|-----|------|---------|
| `flowId` | `string` | Processing flow |
| `collection` | `string` | Target collection |

Returns `{ submitDocuments, processingStatus, isProcessing }`.

### useIngestionSummary `[new]`
After processing completes, fetches summary stats — entities extracted,
triples created, chunks indexed.

| Arg | Type | Purpose |
|-----|------|---------|
| `collection` | `string` | Collection |
| `beforeCount` | `{ entities: number; triples: number }` | Pre-ingestion counts |

Returns `{ newEntities, newTriples, newChunks, isLoading }`.

---

## G2. Domain Pieces (Tier 2)

### DocumentMetadataForm `[new]`
Metadata entry for documents — title, tags, collection. Knows about
TrustGraph document metadata structure.

| Prop | Type | Purpose |
|------|------|---------|
| `metadata` | `DocumentMetadata` | Current values |
| `collections` | `{ key: string; label: string }[]` | Available collections |
| `onChange` | `(metadata: DocumentMetadata) => void` | Change handler |
| `batchMode` | `boolean` | Apply to all files |

Composes FormField + TextInput + TagInput + Select + Toggle.

### IngestionSummaryCard `[new]`
Summary of what was ingested — counts and navigation links.

| Prop | Type | Purpose |
|------|------|---------|
| `entities` | `number` | Entities extracted |
| `triples` | `number` | Triples created |
| `chunks` | `number` | Chunks indexed |
| `onViewGraph` | `() => void` | Navigate to graph |
| `onViewOntology` | `() => void` | Navigate to ontology |

Composes Card + StatBar.

---

## G3. Composites (Tier 3)

### DocumentIngestionFlow `[new]`
Complete document ingestion workflow — file selection, metadata,
upload, processing, summary. Wires all ingestion hooks and pieces.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `string` | Default collection |
| `flowId` | `string` | Processing flow |
| `onComplete` | `() => void` | Ingestion finished |

---

# Part H — Domain: Collections & Flows

Three-tier architecture for managing collections and processing flows.

## H1. Hooks (Tier 1)

### useCollections `[new]`
CRUD for collections. Wraps the collection-management service.

Returns `{ collections, create, update, delete, isLoading }`.

### useActiveCollection `[new]`
Manages the currently selected collection. Persists selection.

Returns `{ activeCollection, setActiveCollection }`.

### useFlows `[new]`
Lists and manages running flows.

Returns `{ flows, startFlow, stopFlow, isLoading }`.

### useFlowBlueprints `[new]`
Lists available flow blueprints with their parameter definitions.

Returns `{ blueprints, isLoading }`.

### useFlowConfig `[new]`
Manages parameter values for a flow being configured. Validates
against parameter definitions.

| Arg | Type | Purpose |
|-----|------|---------|
| `blueprint` | `Blueprint` | Selected blueprint |

Returns `{ values, setValue, errors, isValid }`.

---

## H2. Domain Pieces (Tier 2)

### CollectionCard `[new]`
Displays a collection with metadata, stats, and actions.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `Collection` | Collection data |
| `active` | `boolean` | Currently selected |
| `onSelect` | `() => void` | Switch to this |
| `onEdit` | `() => void` | Edit metadata |

Composes Card + StatBar + Badge + StatusIndicator.

### CollectionForm `[new]`
Create/edit collection — name, description, tags.

| Prop | Type | Purpose |
|------|------|---------|
| `collection` | `Collection \| null` | Existing (edit) or null (create) |
| `onSave` | `(collection: Collection) => void` | Save handler |
| `onCancel` | `() => void` | Cancel handler |

Composes FormField + TextInput + TagInput.

### CollectionPicker `[new]`
Global collection selector for the header/toolbar.

| Prop | Type | Purpose |
|------|------|---------|
| `collections` | `Collection[]` | Available |
| `activeId` | `string` | Currently selected |
| `onChange` | `(id: string) => void` | Switch collection |

Composes Select.

### FlowCard `[new]`
Displays a flow instance with status and stats.

| Prop | Type | Purpose |
|------|------|---------|
| `flow` | `Flow` | Flow data |
| `onStart` | `() => void` | Start flow |
| `onStop` | `() => void` | Stop flow |
| `onConfigure` | `() => void` | Open config |

Composes Card + StatusIndicator + StatBar.

### BlueprintCard `[new]`
Displays a flow blueprint with description and parameter summary.

| Prop | Type | Purpose |
|------|------|---------|
| `blueprint` | `Blueprint` | Blueprint data |
| `onSelect` | `() => void` | Select for configuration |

Composes Card.

### FlowParameterForm `[new]`
Dynamic form for configuring flow parameters. Generates appropriate
controls from parameter definitions.

| Prop | Type | Purpose |
|------|------|---------|
| `parameters` | `ParameterDef[]` | Parameter definitions |
| `values` | `Record<string, unknown>` | Current values |
| `errors` | `Record<string, string>` | Validation errors |
| `onChange` | `(key: string, value: unknown) => void` | Value changed |

Composes FormField + TextInput + Select + Toggle.

---

## H3. Composites (Tier 3)

### CollectionManager `[new]`
Complete collection management — list, create, edit, switch. Wires
useCollections + useActiveCollection + CollectionCard + CollectionForm.

### FlowManager `[new]`
Complete flow management — browse blueprints, configure, start, monitor.
Wires useFlows + useFlowBlueprints + useFlowConfig + BlueprintCard +
FlowCard + FlowParameterForm.

---

# Part I — Domain: Export & Import

## I1. Hooks (Tier 1)

### useKnowledgeExport `[new]`
Manages knowledge export — scope selection, streaming download,
progress tracking.

| Arg | Type | Purpose |
|-----|------|---------|
| `scope` | `{ type: "collection" \| "core" \| "all"; id?: string }` | What to export |

Returns `{ startExport, progress, isExporting, download }`.

### useKnowledgeImport `[new]`
Manages knowledge import from a file.

Returns `{ importFile, progress, isImporting, error }`.

## I2. Domain Pieces (Tier 2)

### ExportScopeSelector `[new]`
Select what to export — collection, knowledge core, or all.

| Prop | Type | Purpose |
|------|------|---------|
| `scope` | `ExportScope` | Current selection |
| `onChange` | `(scope: ExportScope) => void` | Scope changed |
| `collections` | `Collection[]` | Available collections |
| `cores` | `KnowledgeCore[]` | Available cores |

Composes Select + Card.

### ExportSummary `[new]`
Summary of completed export.

| Prop | Type | Purpose |
|------|------|---------|
| `fileSize` | `number` | Export file size |
| `tripleCount` | `number` | Triples exported |
| `embeddingCount` | `number` | Embeddings exported |

Composes Card + StatBar.

## I3. Composites (Tier 3)

### ExportFlow `[new]`
Complete export workflow. Wires useKnowledgeExport +
ExportScopeSelector + ProgressBar + ExportSummary.

### ImportFlow `[new]`
Complete import workflow. Wires useKnowledgeImport + DropZone +
ProgressBar.

---

# Summary

## Component & Hook Counts

| Area | Hooks | Domain Pieces | Composites | Total |
|------|-------|---------------|------------|-------|
| Generic Foundation | — | 30 | — | 30 |
| Knowledge Graph (B) | 4 | 7 | 3 | 14 |
| Explainability (C) | 6 | 6 | 2 | 14 |
| Search & Embeddings (D) | 4 | 3 | 3 | 10 |
| Agent Conversation (E) | 2 | 1 | 1 | 4 |
| RAG Queries (F) | 2 | 1 | 3 | 6 |
| Document Ingestion (G) | 3 | 2 | 1 | 6 |
| Collections & Flows (H) | 5 | 6 | 2 | 13 |
| Export & Import (I) | 2 | 2 | 2 | 6 |
| **Total** | **28** | **58** | **17** | **103** |

Of the 58 domain pieces + generic components: 14 already exist, 44
are new.

## Three-Tier Pattern Summary

```
┌─────────────────────────────────────────────────────────┐
│ Tier 3: Composites                                      │
│ Complete workflows. Drop-in views for common use cases.  │
│ e.g. ExplainPanel, GraphExplorer, AgentChatPanel        │
├─────────────────────────────────────────────────────────┤
│ Tier 2: Domain Pieces                                   │
│ Small components that render one domain concept.         │
│ e.g. ExplainEventCard, EntityBadge, EdgeDetailCard      │
├─────────────────────────────────────────────────────────┤
│ Tier 1: Hooks                                           │
│ Data fetching, parsing, state. Headless.                 │
│ e.g. useExplainSession, useEdgeProvenance               │
├─────────────────────────────────────────────────────────┤
│ Generic Foundation                                      │
│ Card, Badge, SplitPane, PropertyList, etc.               │
│ No TrustGraph knowledge. Reusable anywhere.              │
└─────────────────────────────────────────────────────────┘
```

## Build Order

1. **Generic foundation** — primitives, controls, layout, feedback
2. **Knowledge Graph hooks** — useGraphData refactor, useEntityNeighbourhood
3. **Knowledge Graph pieces** — EntityBadge, EntityProperties, EntityRelationships
4. **Explainability hooks** — useExplainSession, useExplainEvent, useEdgeProvenance
5. **Explainability pieces** — ExplainEventCard, EdgeDetailCard, ProvenanceChainView
6. **Search hooks** — useEmbeddingSearch, useDataSearch
7. **Search pieces** — SearchResultCard, EmbeddingEntityList
8. **Agent & RAG hooks** — useAgentChat, useGraphRag, useDocumentRag
9. **Agent & RAG pieces** — StreamingResponse, AgentStatusIndicator
10. **Ingestion, Collections, Flows, Export** — hooks and pieces
11. **Tier 3 composites** — wire everything together
12. **Refactor demo** — rebuild demo pages using composites
