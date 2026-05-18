# TrustGraph Toolkit — Schema & Ontology Management

This document captures the design decisions for adding schema and
ontology management to the new UI.

---

## Scope

The old workbench-ui has full CRUD for ontologies and schemas. The new
UI already has the data layer (`useOntologies`, `useSchemas` hooks in
react-state) and a read-only ontology view, but no editing, validation,
import/export, or schema management page. This work fills that gap.

---

## Architecture

### Two distinct modes for ontology data

There are two different views onto ontology data and they serve
different purposes:

- **Read-only overview** — powered by `useOntologySchema`, reads OWL
  triples from the live graph. Shows what's actually deployed: classes,
  properties, instance counts. This is the workspace/exploration view.

- **Config management** — powered by `useOntologies` / `useSchemas`,
  reads and writes config objects via the WebSocket config API. This is
  where users create, edit, validate, and deploy ontology and schema
  definitions.

These stay as separate pages/tabs in the demo app. Mixing them would
confuse "what's live" with "what's being edited".

### Component tiers follow the existing pattern

The prompt feature (`PromptBrowser` / `PromptWorkbench`) is the
reference architecture. Ontology and schema management mirrors it:

| Tier | Role | Examples |
|------|------|----------|
| Hooks | Data access, form state | `useSchemaForm`, existing `useOntologies` |
| Domain pieces (Tier 2) | Single-concern UI blocks | `OntologyClassEditor`, `SchemaFieldEditor` |
| Composites (Tier 3) | Full workflows | `OntologyWorkbench`, `SchemaBrowser` |

### No Chakra UI

The old UI uses Chakra heavily. All new components use trustkit
primitives (`Card`, `Badge`, `SectionLabel`, `TextInput`, `SplitPane`,
`DetailPanel`, `Toolbar`, `EmptyState`) plus raw HTML/CSS. Nothing from
Chakra is ported — only the logic and layout decisions.

---

## Ontology Management

### Components

- **OntologyBrowser** — list of ontologies with create/delete. Table
  layout with inline actions. Equivalent to the old `OntologiesTable`.

- **OntologyWorkbench** — the full editor. Three-panel layout: left
  panel has tabbed class/property trees, centre panel has the
  appropriate editor (class, property, or metadata), right panel shows
  validation results. Uses `SplitPane` for layout.

- **Tree navigators** (`OntologyClassTree`, `OntologyPropertyTree`) —
  hierarchical selection with create/delete actions on nodes.

- **Editors** (`OntologyClassEditor`, `OntologyPropertyEditor`,
  `OntologyMetadataEditor`) — forms for editing individual items.
  Fields match the OWL model: label, comment, subClassOf, domain,
  range, cardinality, etc.

### Validation

Port `OntologyValidator` from the old UI as a pure utility (no UI
dependencies). It checks: orphaned properties, missing labels, circular
inheritance, namespace conflicts. Results display in
`OntologyValidationPanel` with clickable links to the offending item.

### Import / Export

- **Import** — file upload and paste for OWL/Turtle/JSON formats.
- **Export** — format selection (OWL/RDF/Turtle) and download.
- Port `OntologyExporter` as a pure utility.

These are lower priority than the core editing workflow.

---

## Schema Management

### Components

- **SchemaBrowser** — table of schemas with create action. Equivalent
  to old `SchemasTable`.

- **SchemaEditor** — inline form (not a modal, consistent with
  trustkit patterns). Contains: basic info (name, description),
  field list with add/remove/reorder, field editor (name, type,
  primary key, required, enum values), index management section.

### Validation

Port `schema-validation.ts` as a pure utility. Checks: duplicate field
names, missing primary key, invalid type combinations. Errors display
inline in the editor.

### Form state

Port `useSchemaForm` hook to manage editing state: field list
mutations, index management, dirty tracking, validation on change.

---

## Types

- `Ontology`, `OWLClass`, `OWLObjectProperty`, `OWLDatatypeProperty`,
  `OntologyMetadata` — already defined in `trustgraph-react-state`.

- `Schema`, `SchemaField` — need to be added to
  `trustgraph-react-state` alongside the existing `useSchemas` hook.
  Currently only exist in the old UI.

The `schemas.ts` file in react-state has `@ts-nocheck` — that gets
removed and proper types added as part of this work.

---

## File locations

All new components go in trustkit under:
- `src/components/ontology/`
- `src/components/schema/`
- `src/hooks/useSchemaForm.ts`
- `src/utils/ontology-validator.ts`
- `src/utils/ontology-exporter.ts`
- `src/utils/schema-validation.ts`

Demo app gets new pages:
- `src/pages/OntologyManagePage.tsx`
- `src/pages/SchemaView.tsx`

Existing `OntologyView.tsx` switches to using the new `OntologyOverview`
composite instead of its current inline implementation.
