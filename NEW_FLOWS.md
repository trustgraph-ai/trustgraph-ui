# New Workflows — Problem Statements

These are workflows not yet implemented in the demo app. Each section
describes the problem the workflow solves and what the user needs to
achieve. Detailed UX design will follow once priorities are agreed.

---

## 1. Schema-Free Graph Navigation

### Problem

The existing Context Graph is built around OWL-typed knowledge graphs:
entities are discovered via `rdf:type` assertions to OWL classes, colours
are assigned per-class, and layout is radial by domain. This works
beautifully for schema-backed graphs but produces an empty canvas when
the graph has no ontology — just raw subject/predicate/object triples
with no typing.

TrustGraph supports schema-free knowledge graphs (the "Schemaless" storage
mode visible in the ingestion pipeline). Users working with these graphs
currently have no way to visualise or navigate them.

### What the user needs

- See all entities in a schema-free graph, where an "entity" is any URI
  that appears as a subject or object in a triple.
- Navigate relationships between entities — click a node, see what it
  connects to, follow links through the graph.
- Visually distinguish nodes in a meaningful way without ontology classes.
  This could be hash-based colouring, predicate-based grouping, or
  neighbourhood structure — the right approach is TBD.
- Filter and search within the graph — likely by predicate type or by
  text match on entity labels, since domain filtering is not available.
- Inspect any node to see its raw triples (all statements where it
  appears as subject or object).
- Work at scale — schema-free graphs may be large and unstructured, so
  the UI needs to handle progressive loading or neighbourhood-based
  exploration rather than rendering everything at once.

### What already exists

- `GraphCanvasSVG` handles node/edge rendering, zoom, pan, hover, and
  selection — the drawing primitives are reusable.
- `NodeDetailPanel` shows entity properties and relationships — it needs
  adaptation to show raw triples instead of typed properties.
- `useEntityNeighbourhood` computes connected nodes — the concept
  transfers even if the implementation needs reworking.
- Force-directed layout is a well-understood approach for untyped graphs
  and would replace the current radial-by-domain layout.

### Open questions

- Should this be a separate workflow card ("Raw Graph") or a mode within
  the existing Context Graph that adapts based on whether ontology data
  is present?
- How to handle very large graphs — fixed neighbourhood depth from a
  starting node? Pagination? Clustering?
- Is predicate-based grouping useful enough to serve as a substitute for
  domain colouring?

---

## 2. Prompt Management

### Problem

TrustGraph uses LLM prompts at multiple stages of its pipeline — entity
extraction, relationship extraction, graph RAG synthesis, document RAG,
agent reasoning, summarisation, and others. These prompts contain template
variables that are substituted at runtime with real data (questions,
retrieved context, entity lists, etc.).

Currently there is no UX for viewing, editing, or testing these prompts.
Users who want to refine extraction quality or tune RAG responses have
no visibility into what the prompts actually say, what data gets
substituted in, or how changes affect output.

### What the user needs

- **Browse** all prompt templates in the system, grouped by purpose
  (extraction, RAG, agent, etc.), with metadata showing which flows
  use them.
- **Edit** prompt templates with a proper text editing experience —
  not a single-line input. Template variables should be visually
  distinct so the user can see the structure.
- **Preview** a prompt with real data substituted in. The user selects
  a prompt template, the system provides actual values for each variable
  (a real question, real retrieved context, real entities), and the
  rendered prompt is displayed. This lets the user see exactly what
  the LLM receives.
- **Test** a rendered prompt by sending it to the LLM and seeing the
  response. Show the output alongside token counts (input/output) so
  the user can gauge quality and cost together.
- **Compare** results across prompt variations or models. Run the same
  data through two prompt versions side by side, or the same prompt
  through different models, to make informed refinement decisions.

### What already exists

- A prompt storage service — prompts are already stored and retrievable.
- A prompt execution service — prompts can be invoked with substitutions.
- These backend services mean the UX work can focus on the interface
  rather than building new infrastructure.

### Open questions

- What is the full set of prompt types and their variable schemas? The
  UI needs to know what variables each prompt type accepts in order to
  offer meaningful preview data.
- Should prompt versions be tracked (history/rollback), or is
  edit-in-place sufficient for now?
- Is side-by-side comparison a first-cut feature, or should the initial
  version focus on browse/edit/preview/test and add comparison later?
- How are prompts scoped — global, per-flow, per-collection? This
  affects how the browse/edit UI is organised.

---

## 3. Agent Configuration & Debugging

### Problem

TrustGraph has an agentic inference system that can be invoked to handle
complex, multi-step queries. Behind this system sits a layer of
configuration — agent patterns, types, tool definitions (both native
agent tools and MCP tools) — that controls how the agent reasons, what
tools it can call, and how it structures its work.

There is currently no UX for managing this configuration. Users who want
to understand how the agent works, add or modify tools, adjust reasoning
patterns, or diagnose unexpected agent behaviour have no way to do so
through the interface. More importantly, there is no way to test changes
in isolation — you have to run a full query and hope for the best.

### What the user needs

- **Browse agent configuration** — see the full picture of what the
  agent can do: its patterns (how it reasons), its types (what kinds of
  agent are available), and its tools (what it can call). This is the
  "what have I got?" view.

- **Edit patterns and types** — modify agent reasoning patterns and
  type definitions. Patterns define how the agent structures its
  approach to a problem. Types define the different agent
  configurations available. The editing experience should make
  the structure visible, not just dump raw config.

- **Manage tools** — view, create, edit, and delete agent tools and
  MCP tool definitions. Each tool has a name, description, parameter
  schema, and implementation. The user needs to see what the agent
  "thinks" each tool does (the description the LLM sees) as well as
  what it actually does.

- **Test a single tool** — invoke an individual tool with specific
  inputs and see the output. This is the lowest-level debugging
  primitive: "does this tool actually return what I expect?"

- **Test an agent step** — run one reasoning step (one think/observe
  cycle) with a given context and see what the agent decides to do,
  which tool it picks, and what it gets back. This isolates agent
  behaviour from end-to-end query complexity.

- **Test a full agent flow** — run a complete agent invocation with
  full visibility into every step. Show the chain of
  thinking → tool selection → observation → thinking, with the
  ability to inspect each step in detail. This is essentially the
  existing agent conversation view but focused on debugging rather
  than end-user Q&A.

### What already exists

- Agentic inference is already implemented and can be invoked.
- Agent tool definitions and MCP tool definitions exist in the backend.
- The Agent Query workflow already renders agent reasoning steps
  (thinking, observations, answers) — the display components exist.
- `AgentStepCard` and `AgentStepList` components in trustkit render
  individual agent steps.

### Open questions

- What is the full configuration model? Patterns, types, tools —
  how are these structured and related? The UI design depends on
  understanding the schema.
- Can individual agent steps be invoked in isolation via the API, or
  only full flows? Step-level testing requires backend support.
- How are MCP tools discovered and registered? Is this static config
  or dynamic discovery?
- Should the debugging view be a separate workflow card, or a mode
  within the existing Agent Query view (e.g. a "debug" toggle that
  shows more detail)?
- Is there a concept of agent "profiles" or "presets" — named
  combinations of patterns, types, and tool sets that can be
  switched between?
