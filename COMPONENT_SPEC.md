# TrustGraph Toolkit — Component Specification

This document specifies every component the toolkit needs, organised
into families. Components are designed for maximum reuse — higher-level
components compose lower-level ones. Each entry lists its purpose, key
props, composition, and which workflows use it.

**Status key:** `[exists]` already built, `[new]` needs building.

---

## 1. Primitives

The smallest reusable atoms. These have no dependencies on other toolkit
components.

### Badge `[exists]`
A small coloured label used for tagging, filtering, and status.

| Prop | Type | Purpose |
|------|------|---------|
| `color` | `string` | Domain/accent colour |
| `selected` | `boolean` | Highlighted state (border, glow) |
| `size` | `"small" \| "medium"` | Compact or standard |
| `onClick` | `() => void` | Makes it interactive |
| `children` | `ReactNode` | Label content |

Used in: all workflows.

### SectionLabel `[exists]`
Uppercase mono-font section heading with wide letter-spacing.

| Prop | Type | Purpose |
|------|------|---------|
| `children` | `ReactNode` | Label text |
| `marginTop` | `number` | Top spacing |
| `marginBottom` | `number` | Bottom spacing |

Used in: all workflows.

### StatusIndicator `[new]`
A coloured dot or icon showing state. Extracted from StatusBar's inline
rendering.

| Prop | Type | Purpose |
|------|------|---------|
| `status` | `"success" \| "warning" \| "error" \| "info" \| "active" \| "inactive"` | Visual state |
| `label` | `string` | Text alongside indicator |
| `icon` | `string` | Override default icon |
| `size` | `"small" \| "medium"` | Dot/icon size |

Used in: 1 (upload status), 8 (collection status), 10 (flow status).

### ProgressBar `[new]`
Horizontal bar showing completion percentage.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `number` | 0–100 percentage |
| `color` | `string` | Fill colour |
| `size` | `"thin" \| "standard"` | Bar height |
| `label` | `string` | Optional text overlay |
| `animated` | `boolean` | Subtle stripe animation |

Used in: 1 (upload progress), 9 (export download).

### ScoreIndicator `[new]`
Displays a relevance/similarity score with colour coding.

| Prop | Type | Purpose |
|------|------|---------|
| `score` | `number` | 0–1 value |
| `format` | `"percent" \| "decimal"` | Display format |

Colour thresholds: >0.8 success, >0.5 amber, else subtle.
Renders in mono font.

Used in: 6 (data search results).

### Tooltip `[new]`
Floating info panel anchored to a position. Extracted from the inline
tooltip rendering in GraphCanvas/ExplainGraph.

| Prop | Type | Purpose |
|------|------|---------|
| `x` | `number` | Anchor X position |
| `y` | `number` | Anchor Y position |
| `color` | `string` | Border accent colour |
| `visible` | `boolean` | Show/hide |
| `children` | `ReactNode` | Tooltip content |

Dark background, backdrop blur, coloured border, non-interactive.

Used in: 2 (graph tooltips), 3 (provenance tooltips).

---

## 2. Controls

Interactive input elements that accept user input.

### TextInput `[new]`
Base text input field. SearchInput currently inlines its own input —
this extracts the reusable core.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string` | Controlled value |
| `onChange` | `(value: string) => void` | Change handler |
| `placeholder` | `string` | Placeholder text |
| `disabled` | `boolean` | Disabled state |
| `onSubmit` | `() => void` | Enter key handler |
| `autoFocus` | `boolean` | Focus on mount |

Used in: all input contexts as a base.

### SearchInput `[exists]`
Text input with an action button. Composes TextInput + Button.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string` | Input value |
| `onChange` | `(value: string) => void` | Change handler |
| `onSubmit` | `() => void` | Button/enter handler |
| `placeholder` | `string` | Input placeholder |
| `buttonText` | `string` | Button label |
| `buttonColor` | `string` | Button accent colour |
| `isLoading` | `boolean` | Disables and shows "..." |

Used in: 3, 4, 5 (queries), 6 (data search).

### TagInput `[new]`
Input for adding/removing tags as chips. Composes TextInput + Badge.

| Prop | Type | Purpose |
|------|------|---------|
| `tags` | `string[]` | Current tags |
| `onChange` | `(tags: string[]) => void` | Tag list changed |
| `placeholder` | `string` | Input placeholder |
| `color` | `string` | Badge colour |
| `suggestions` | `string[]` | Autocomplete options |

Used in: 1 (document metadata), 8 (collection tags).

### Select `[new]`
Dropdown selector. Dark-themed, consistent with the design language.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string \| null` | Selected value |
| `options` | `{ key: string; label: string; icon?: string }[]` | Available options |
| `onChange` | `(key: string) => void` | Selection handler |
| `placeholder` | `string` | Unselected label |
| `color` | `string` | Accent colour |

Used in: 1 (collection picker), 8 (collection switch), 10 (model
selection).

### Toggle `[new]`
Boolean switch. Small, inline.

| Prop | Type | Purpose |
|------|------|---------|
| `checked` | `boolean` | Current state |
| `onChange` | `(checked: boolean) => void` | Toggle handler |
| `label` | `string` | Adjacent label |
| `color` | `string` | Active colour |

Used in: 1 (same-for-all metadata), 9 (export options).

### ModeSelector `[new]`
Horizontal row of mode buttons (like the Graph RAG / Doc RAG / Agent
selector in ExplainView). Composes Badge or FilterButton.

| Prop | Type | Purpose |
|------|------|---------|
| `modes` | `{ key: string; label: string }[]` | Available modes |
| `activeMode` | `string` | Currently selected |
| `onChange` | `(key: string) => void` | Mode changed |
| `color` | `string` | Active accent colour |

Used in: 3/4/5 (query mode), 10 (blueprint selection).

---

## 3. Data Display

Components that present data. Read-only.

### Card `[exists]`
Container for grouped content with subtle background and border.

| Prop | Type | Purpose |
|------|------|---------|
| `borderColor` | `string` | Optional coloured border |
| `borderRadius` | `number` | Corner radius override |
| `padding` | `string \| number` | Internal padding override |
| `children` | `ReactNode` | Card content |

Used in: all workflows.

### PropertyList `[new]`
Key-value pair display. Extracted from NodeDetailPanel and DataView
inline rendering.

| Prop | Type | Purpose |
|------|------|---------|
| `properties` | `Record<string, string \| number>` | Key-value data |
| `labels` | `Record<string, string>` | Human-readable key overrides |
| `layout` | `"stacked" \| "grid" \| "inline"` | Arrangement |
| `columns` | `number` | Grid columns (grid layout) |

`stacked`: keys above values, one per line (detail panels).
`grid`: auto-fill grid (data search results).
`inline`: key: value on one line (compact contexts).

Used in: 2 (node details), 6 (data records), 7 (ontology instances).

### StatBar `[new]`
Horizontal row of labelled statistics. Extracted from the ontology
summary and filter bar stats.

| Prop | Type | Purpose |
|------|------|---------|
| `stats` | `{ label: string; value: string \| number }[]` | Stat entries |
| `color` | `string` | Accent colour |

Renders in mono font, evenly spaced.

Used in: 1 (ingestion summary), 7 (ontology totals), 8 (collection
stats), 9 (export summary).

### SourceChunk `[new]`
Displays a document chunk with metadata and relevance score.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Document title |
| `text` | `string` | Chunk text content |
| `score` | `number` | Relevance score |
| `metadata` | `Record<string, string>` | Document metadata |
| `expanded` | `boolean` | Show full text or excerpt |
| `onToggle` | `() => void` | Expand/collapse |

Composes Card + ScoreIndicator + PropertyList.

Used in: 3 (provenance sources), 4 (document sources).

### FileItem `[new]`
A single file in a list, showing name, size, type, and status.

| Prop | Type | Purpose |
|------|------|---------|
| `name` | `string` | Filename |
| `size` | `number` | Bytes |
| `type` | `string` | MIME type |
| `status` | `"queued" \| "uploading" \| "uploaded" \| "processing" \| "complete" \| "error"` | Current state |
| `progress` | `number` | Upload percentage (0–100) |
| `onRetry` | `() => void` | Retry failed upload |
| `onCancel` | `() => void` | Cancel upload/processing |

Composes StatusIndicator + ProgressBar.

Used in: 1 (document ingestion).

---

## 4. Lists & Collections

Components that render ordered sets of items with consistent styling.

### ItemList `[new]`
Generic scrollable list with consistent item spacing and hover states.

| Prop | Type | Purpose |
|------|------|---------|
| `items` | `T[]` | Data items |
| `renderItem` | `(item: T, index: number) => ReactNode` | Item renderer |
| `emptyMessage` | `string` | Empty state text |
| `loading` | `boolean` | Loading state |
| `loadingMessage` | `string` | Loading text |

Used in: multiple workflows as a base for specific lists.

### FileList `[new]`
List of files for upload. Composes ItemList + FileItem.

| Prop | Type | Purpose |
|------|------|---------|
| `files` | `FileItemData[]` | Files with status |
| `onRetry` | `(index: number) => void` | Retry handler |
| `onCancel` | `(index: number) => void` | Cancel handler |
| `onRemove` | `(index: number) => void` | Remove from list |

Used in: 1 (document ingestion).

### SourceList `[new]`
Ranked list of source chunks. Composes ItemList + SourceChunk.

| Prop | Type | Purpose |
|------|------|---------|
| `sources` | `SourceData[]` | Ranked source chunks |
| `expandedIndex` | `number \| null` | Currently expanded |
| `onToggle` | `(index: number) => void` | Expand/collapse |

Used in: 3 (provenance), 4 (document RAG sources).

### EntityList `[new]`
Horizontal or vertical list of entity badges. Extracted from
QueryView's related entities rendering.

| Prop | Type | Purpose |
|------|------|---------|
| `entities` | `{ id: string; label: string; color: string; icon?: string }[]` | Entity data |
| `selectedId` | `string \| null` | Currently selected |
| `onSelect` | `(id: string \| null) => void` | Selection handler |
| `layout` | `"horizontal" \| "vertical"` | Direction |
| `emptyMessage` | `string` | Empty state text |
| `loading` | `boolean` | Loading state |

Composes Badge.

Used in: 2 (filter results), 5 (related entities), 7 (class instances).

---

## 5. Layout

Structural components that organise space.

### FilterBar `[exists]`
Horizontal bar of filter chips with stats. Composes FilterButton.

| Prop | Type | Purpose |
|------|------|---------|
| `items` | `FilterItem[]` | Filter options |
| `selectedKey` | `string \| null` | Active filter |
| `onSelect` | `(key: string \| null) => void` | Filter changed |
| `stats` | `string` | Right-aligned summary text |
| `emptyMessage` | `string` | Text when no items |

Used in: 2 (domain filter), 6 (schema filter).

### SplitPane `[new]`
Two-panel layout with a primary area and a conditional side panel.
Extracted from the pattern repeated in GraphView, QueryView, etc.

| Prop | Type | Purpose |
|------|------|---------|
| `children` | `ReactNode` | Primary content |
| `panel` | `ReactNode \| null` | Side panel (null = hidden) |
| `panelWidth` | `number \| string` | Panel width |
| `panelSide` | `"left" \| "right"` | Panel position |
| `panelBorder` | `boolean` | Show divider border |

Used in: 2 (graph + detail), 3 (explain + graph), 5 (chat + graph).

### DetailPanel `[new]`
Slide-in panel for inspecting a selected item. Extracted from
NodeDetailPanel's container pattern.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Panel heading |
| `subtitle` | `string` | Secondary text (e.g. type) |
| `onClose` | `() => void` | Close handler |
| `children` | `ReactNode` | Panel content |
| `width` | `number` | Panel width |

Dark semi-transparent background, backdrop blur, close button,
scrollable content area.

Used in: 2 (node details), 3 (source viewer), 5 (node details).

### Toolbar `[new]`
Horizontal bar for controls and labels at the top of a section.

| Prop | Type | Purpose |
|------|------|---------|
| `children` | `ReactNode` | Bar contents |
| `borderBottom` | `boolean` | Bottom border |
| `padding` | `string` | Override padding |

Used in: 1 (action bar), 5 (query input area), 6 (search input area),
10 (flow controls).

### PageLayout `[new]`
Standard page container that handles the viewport height calculation.

| Prop | Type | Purpose |
|------|------|---------|
| `headerOffset` | `number` | Header height to subtract |
| `children` | `ReactNode` | Page content |
| `padding` | `string` | Page-level padding |
| `scroll` | `boolean` | Enable vertical scroll |
| `maxWidth` | `number` | Content max-width |

Used in: all workflows as the outermost container for each view.

---

## 6. Feedback

Components that communicate system state to the user.

### LoadingState `[exists]`
Centered text for loading and error states.

| Prop | Type | Purpose |
|------|------|---------|
| `variant` | `"loading" \| "error"` | Visual treatment |
| `message` | `string` | Display text |

Used in: all workflows.

### EmptyState `[new]`
Standardised empty state display. Extracted from the repeated inline
pattern across pages.

| Prop | Type | Purpose |
|------|------|---------|
| `message` | `string` | Descriptive text |
| `icon` | `string` | Optional icon above text |
| `action` | `{ label: string; onClick: () => void }` | Optional action button |

Italic, hint colour, centered.

Used in: 3/4/5 (no query yet), 6 (no results), 7 (empty ontology).

### Toaster `[exists]`
Fixed toast notification container.

Used in: all workflows.

### Typewriter `[exists]`
Character-by-character text reveal for streaming LLM output.

| Prop | Type | Purpose |
|------|------|---------|
| `text` | `string` | Text to reveal |
| `speed` | `number` | Ms per character |
| `onDone` | `() => void` | Animation complete |

Used in: 3, 4 (streaming responses).

### ProcessingStatus `[new]`
Multi-step processing indicator showing named stages.

| Prop | Type | Purpose |
|------|------|---------|
| `stages` | `{ key: string; label: string; status: "pending" \| "active" \| "complete" \| "error" }[]` | Ordered stages |
| `currentStage` | `string` | Active stage key |

Each stage rendered with StatusIndicator. Active stage highlighted,
completed stages checked, pending stages dimmed.

Used in: 1 (document processing), 10 (flow startup).

---

## 7. Graph Visualisation

Components for rendering and interacting with graph data.

### GraphCanvas `[exists]`
Canvas-based graph renderer with force-directed layout.

| Prop | Type | Purpose |
|------|------|---------|
| `entities` | `Entity[]` | Node data |
| `relationships` | `Relationship[]` | Edge data |
| `ontology` | `OntologyType` | Domain metadata |
| `highlightedEntities` | `string[]` | IDs to highlight |
| `activeFilter` | `string \| null` | Domain filter |
| `onNodeClick` | `(node: Entity) => void` | Node click handler |

Used in: 2, 5 (main graph view).

### GraphCanvasSVG `[exists]`
SVG-based alternative renderer. Same props as GraphCanvas.

Used in: 2, 5 (alternative renderer).

### ExplainGraph `[exists]`
Specialised graph for provenance/explain event chains.

| Prop | Type | Purpose |
|------|------|---------|
| `nodes` | `ExplainGraphNode[]` | Event nodes |
| `edges` | `ExplainGraphEdge[]` | Derivation edges |
| `highlightedNodeIds` | `string[]` | Highlighted nodes |
| `highlightedEdgeIds` | `string[]` | Highlighted edges |
| `onNodeClick` | `(id: string) => void` | Node click handler |

Used in: 3, 4 (explain provenance).

### ZoomControls `[exists]`
Overlay buttons for zoom in/out/reset.

Used in: 2, 3, 5 (any graph view).

### NodeDetailPanel `[exists]`
Panel showing entity properties and relationships. Should be refactored
to compose DetailPanel + PropertyList + EntityList.

| Prop | Type | Purpose |
|------|------|---------|
| `node` | `Entity` | Selected entity |
| `relationships` | `Relationship[]` | All relationships |
| `entities` | `Entity[]` | All entities (for labels) |
| `ontology` | `OntologyType` | Domain metadata |
| `propertyLabels` | `Record<string, string>` | Property label map |
| `onClose` | `() => void` | Close handler |
| `onNodeSelect` | `(node: Entity) => void` | Navigate to entity |

Used in: 2, 5 (entity inspection).

---

## 8. Messaging

Components for conversation UI.

### MessageBubble `[exists]`
A single message in a conversation with type-based styling.

| Prop | Type | Purpose |
|------|------|---------|
| `message` | `Message` | Message data (type, text, role) |

Type styling: thinking (blue), observation (purple), answer (emerald),
user (amber).

Used in: 5 (agent conversation).

### MessageList `[new]`
Scrollable list of messages with auto-scroll on new messages.
Extracted from QueryView's inline message rendering.

| Prop | Type | Purpose |
|------|------|---------|
| `messages` | `Message[]` | Conversation messages |
| `loading` | `boolean` | Show typing indicator |
| `loadingText` | `string` | Typing indicator text |
| `emptyMessage` | `string` | Empty state text |

Composes ItemList + MessageBubble.

Used in: 5 (agent conversation).

### ChatInput `[new]`
Combined input for chat — text input with submit. Specialisation of
SearchInput for conversation context.

| Prop | Type | Purpose |
|------|------|---------|
| `value` | `string` | Input value |
| `onChange` | `(value: string) => void` | Change handler |
| `onSubmit` | `() => void` | Send handler |
| `placeholder` | `string` | Input placeholder |
| `isSubmitting` | `boolean` | Disable during send |

May support multiline in future. Composes TextInput.

Used in: 5 (agent conversation).

---

## 9. Forms

Components for structured data entry.

### FormField `[new]`
Labelled wrapper for any input control.

| Prop | Type | Purpose |
|------|------|---------|
| `label` | `string` | Field label |
| `description` | `string` | Help text |
| `error` | `string` | Validation error |
| `required` | `boolean` | Required indicator |
| `children` | `ReactNode` | Input control |

Used in: 1 (metadata form), 8 (collection form), 10 (flow config).

### MetadataForm `[new]`
Document metadata entry. Composes FormField + TextInput + TagInput +
Select.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Document title |
| `tags` | `string[]` | Document tags |
| `collection` | `string` | Target collection |
| `collections` | `{ key: string; label: string }[]` | Available collections |
| `onChange` | `(field, value) => void` | Field change handler |

Used in: 1 (document ingestion).

### ParameterForm `[new]`
Dynamic form generated from parameter definitions. Composes FormField +
TextInput + Select + Toggle.

| Prop | Type | Purpose |
|------|------|---------|
| `parameters` | `ParameterDef[]` | Parameter definitions |
| `values` | `Record<string, unknown>` | Current values |
| `onChange` | `(key: string, value: unknown) => void` | Value changed |
| `errors` | `Record<string, string>` | Validation errors |

Used in: 10 (flow configuration).

---

## 10. File Handling

Components for upload and download workflows.

### DropZone `[new]`
Drag-and-drop file target with click-to-browse fallback.

| Prop | Type | Purpose |
|------|------|---------|
| `onFiles` | `(files: File[]) => void` | Files selected |
| `accept` | `string` | Accepted MIME types |
| `multiple` | `boolean` | Allow multiple files |
| `disabled` | `boolean` | Disabled state |
| `label` | `string` | Instruction text |

Dashed border, subtle highlight on drag-over.

Used in: 1 (document ingestion).

### FileUploader `[new]`
Complete upload workflow combining file selection, metadata, and
progress. Composes DropZone + FileList + MetadataForm + ProgressBar.

| Prop | Type | Purpose |
|------|------|---------|
| `onUpload` | `(files: FileWithMetadata[]) => void` | Start upload |
| `collections` | `{ key: string; label: string }[]` | Available collections |
| `accept` | `string` | Accepted MIME types |
| `maxFileSize` | `number` | Max bytes per file |

Used in: 1 (document ingestion).

---

## 11. Domain Composites

Higher-level components that combine multiple families for specific
TrustGraph workflows. These are the components app developers compose
into pages.

### OntologyCard `[new]`
Displays a single ontology class with properties and instances.
Composes Card + Badge + PropertyList + EntityList + SectionLabel.

| Prop | Type | Purpose |
|------|------|---------|
| `className` | `string` | OWL class name |
| `color` | `string` | Domain colour |
| `icon` | `string` | Domain icon |
| `description` | `string` | Class description |
| `properties` | `string[]` | Datatype property names |
| `instances` | `{ id: string; label: string }[]` | Class instances |
| `onInstanceClick` | `(id: string) => void` | Navigate to instance |

Used in: 7 (ontology review).

### RelationshipTable `[new]`
Grid of relationship predicates with domain/range colour coding.
Composes Card.

| Prop | Type | Purpose |
|------|------|---------|
| `properties` | `OntologyProperty[]` | Object properties |
| `ontology` | `OntologyType` | For domain colour lookup |

Used in: 7 (ontology review).

### ExplainPanel `[new]`
Real-time explain event timeline. Extracted from ExplainView's inline
event rendering. Shows events as they arrive during a query.

| Prop | Type | Purpose |
|------|------|---------|
| `events` | `ExplainEvent[]` | Ordered explain events |
| `onEventClick` | `(eventId: string) => void` | Focus on event |
| `highlightedEventId` | `string \| null` | Currently focused |

Each event shows its type (colour-coded), summary data, and expand
for details. Composes Card + Badge + PropertyList.

Used in: 3, 4 (query explain).

### CollectionCard `[new]`
Displays a collection with metadata, stats, and actions.
Composes Card + StatBar + Badge + StatusIndicator.

| Prop | Type | Purpose |
|------|------|---------|
| `name` | `string` | Collection name |
| `description` | `string` | Collection description |
| `tags` | `string[]` | Collection tags |
| `stats` | `{ entities: number; triples: number }` | Counts |
| `active` | `boolean` | Currently selected |
| `onSelect` | `() => void` | Switch to this collection |
| `onEdit` | `() => void` | Edit metadata |

Used in: 8 (collection management).

### FlowCard `[new]`
Displays a flow instance or blueprint with status.
Composes Card + StatusIndicator + StatBar.

| Prop | Type | Purpose |
|------|------|---------|
| `name` | `string` | Flow name |
| `description` | `string` | Flow description |
| `status` | `"running" \| "stopped" \| "error" \| "starting"` | Flow state |
| `stats` | `{ processed: number; queued: number }` | Processing stats |
| `onStart` | `() => void` | Start flow |
| `onStop` | `() => void` | Stop flow |
| `onConfigure` | `() => void` | Open config |

Used in: 10 (flow configuration).

### IngestionSummary `[new]`
Summary panel shown after document processing completes.
Composes Card + StatBar.

| Prop | Type | Purpose |
|------|------|---------|
| `entities` | `number` | Entities extracted |
| `triples` | `number` | Triples created |
| `chunks` | `number` | Chunks indexed |
| `onViewGraph` | `() => void` | Navigate to graph |
| `onViewOntology` | `() => void` | Navigate to ontology |

Used in: 1 (document ingestion).

---

## Composition Map

How higher-level components compose lower-level ones.

```
FileUploader
├── DropZone
├── FileList
│   └── FileItem
│       ├── StatusIndicator
│       └── ProgressBar
└── MetadataForm
    ├── FormField
    │   └── TextInput
    ├── TagInput
    │   ├── TextInput
    │   └── Badge
    └── Select

NodeDetailPanel (refactored)
├── DetailPanel
├── PropertyList
└── EntityList
    └── Badge

ExplainPanel
├── Card
├── Badge
├── PropertyList
└── SourceList
    └── SourceChunk
        ├── Card
        ├── ScoreIndicator
        └── PropertyList

OntologyCard
├── Card
├── Badge
├── SectionLabel
├── PropertyList
└── EntityList
    └── Badge

CollectionCard
├── Card
├── Badge
├── StatBar
└── StatusIndicator

FlowCard
├── Card
├── StatusIndicator
└── StatBar

MessageList
├── MessageBubble
└── EmptyState

QueryPanel (page-level composition)
├── Toolbar
│   ├── SectionLabel
│   └── SearchInput
├── EntityList
├── MessageList
└── SplitPane
    ├── (query area)
    └── GraphCanvas
```

---

## Component Count Summary

| Family            | Exists | New | Total |
|-------------------|--------|-----|-------|
| Primitives        | 2      | 4   | 6     |
| Controls          | 1      | 5   | 6     |
| Data Display      | 1      | 3   | 4     |
| Lists             | 0      | 4   | 4     |
| Layout            | 1      | 4   | 5     |
| Feedback          | 3      | 2   | 5     |
| Graph             | 5      | 0   | 5     |
| Messaging         | 1      | 2   | 3     |
| Forms             | 0      | 3   | 3     |
| File Handling     | 0      | 2   | 2     |
| Domain Composites | 0      | 7   | 7     |
| **Total**         | **14** | **36** | **50** |

---

## Build Order

Components should be built bottom-up — primitives first, then
composites that use them. Suggested order:

**Phase 1 — Primitives & Controls**
TextInput, StatusIndicator, ProgressBar, ScoreIndicator, Tooltip,
TagInput, Select, Toggle, ModeSelector

**Phase 2 — Display & Layout**
PropertyList, StatBar, EmptyState, ItemList, SplitPane, DetailPanel,
Toolbar, PageLayout

**Phase 3 — Domain Components**
EntityList, FileItem, FileList, SourceChunk, SourceList, MessageList,
ChatInput, FormField, DropZone, ProcessingStatus

**Phase 4 — Composites**
MetadataForm, ParameterForm, FileUploader, OntologyCard,
RelationshipTable, ExplainPanel, CollectionCard, FlowCard,
IngestionSummary

**Phase 5 — Refactor Existing**
Refactor NodeDetailPanel to compose DetailPanel + PropertyList +
EntityList. Refactor inline patterns in demo pages to use new
components.
