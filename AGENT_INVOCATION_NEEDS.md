# Agent Invocation — Explainability Analysis

This document captures what the agent service emits in its
explainability stream and what's needed for a debug view that helps
users understand the effectiveness of their agent configuration
(patterns, task types, tools, prompts).

---

## Principles

These principles govern how explainability events are interpreted.
Violating them will cause failures as the backend evolves.

### 1. Explicit only

The knowledge graph expresses information **explicitly** through
triples. Don't reverse-engineer, don't imply, don't infer:

- **URIs are opaque identifiers.** Don't parse them. Don't read
  iteration numbers, sub-agent indices, or step counts from URI
  fragments. The backend may generate any URIs it likes.
- **Don't infer timing from event order in the stream.**
- **Don't infer structure from naming patterns.**
- If a triple doesn't assert it, it isn't asserted.

### 2. Types are mixins, not pathways

Each event has multiple `rdf:type` assertions. Each type is an
**independent facet** that contributes its own meaning:

- An event of type `Synthesis` AND `Answer` is *not* a "SynthesisAnswer".
  It's a Synthesis (with Synthesis behaviour) AND an Answer (with
  Answer behaviour). They could appear separately on other events.
- Don't write logic like "if it's a Synthesis it's always an Answer".
- Don't assume any specific pathway through the DAG. A trace today
  might show `AgentQuestion → Analysis → ... → Conclusion`. Future
  traces may show different shapes.

### 3. Handle unknown types gracefully

The type vocabulary is **open and extensible**. New types will appear:

- Render the facets you understand.
- For unknown types, transparently acknowledge them: "this is also
  an X but I don't know how to interpret that."
- Never silently drop unknown types.
- Never guess what an unknown type means.

### 4. DAG via PROV-O relationships only

The only relationship structure between explain events is the DAG
formed by PROV-O relationship predicates:

- `prov:wasDerivedFrom` — primary derivation edge
- `prov:wasGeneratedBy` — also used in extraction provenance and some
  paths

Walk the DAG explicitly via these edges:

- Multiple incoming edges are valid (fan-in).
- Don't infer parent/child from URIs, naming, ordering, or pattern
  conventions.
- Whether an event is "the final answer" depends on its position in
  the DAG and its facets, not on its type alone.

---

## Sources

Three websocket traces were analysed, one per agent pattern:

| File | Pattern | Question |
|------|---------|----------|
| `agent-react.json` | `react` | Who is the document author? |
| `agent-plan-exec.json` | `plan-then-execute` | Who is the author of the document and what is their credentials in authoring the doc. Carefully plan and execute an answer |
| `agent-supervisor.json` | `supervisor` | Assess the security risks of intelligence agencies sharing data with private contractors in a globalised environment |

These are **examples of what was emitted in three specific runs**, not
a structural specification of all runs. The principles above govern
how we interpret them.

---

## Stream shape (observed)

Chunk types and counts in each trace. The mix varies a lot by run.

| Pattern | total | explain | thought | observation | answer |
|---------|-------|---------|---------|-------------|--------|
| react | 119 | 9 | 104 | 1 | 5 |
| plan-exec | 105 | 9 | 3 | 1 | 92 |
| supervisor | 1045 | 51 | 14 | 8 | 972 |

Most volume is streaming text (`thought`, `answer`, `observation`).
Structured debugging information lives in the `explain` chunks.

---

## Canonical vocabulary

The vocabulary is defined in
`trustgraph/trustgraph-base/trustgraph/provenance/namespaces.py`.
Renderers should refer to this file as the source of truth — what
follows is a snapshot at the time of writing.

The vocabulary is **open**: new types and predicates may be added
without breaking renderers that follow the principles above.

### Namespaces
- `PROV` = `http://www.w3.org/ns/prov#` — W3C Provenance Ontology
- `RDF` = `http://www.w3.org/1999/02/22-rdf-syntax-ns#`
- `RDFS` = `http://www.w3.org/2000/01/rdf-schema#`
- `SKOS` = `http://www.w3.org/2004/02/skos/core#`
- `SCHEMA` = `https://schema.org/`
- `DC` = `http://purl.org/dc/elements/1.1/`
- `TG` = `https://trustgraph.ai/ns/` — TrustGraph custom predicates
  and types

### Types — PROV-O
- `prov:Entity` (universal on all explain events)
- `prov:Activity`
- `prov:Agent`

### Types — TrustGraph explainability (shared)
- `tg:Question` — base question type
  - `tg:GraphRagQuestion` — sub-RAG retrieval question
  - `tg:DocRagQuestion`
  - `tg:AgentQuestion` — agent root question
- `tg:Grounding`
- `tg:Exploration`
- `tg:Focus`
- `tg:Synthesis`
- `tg:Analysis`
- `tg:Conclusion`

### Types — orchestrator
- `tg:Decomposition` — supervisor split into sub-goals
- `tg:Finding` — sub-agent result
- `tg:Plan` — plan-then-execute plan
- `tg:StepResult` — plan step result

### Types — unifying mixins (intentional, always paired)

These are the canonical mixin types. The `vocabulary.py` source comments
spell out which concrete types they're paired with:

- `tg:Answer` — pairs with `Synthesis`, `Conclusion`, `Finding`, `StepResult` (any of the "final answer" types)
- `tg:Reflection` — pairs with `Thought`, `Observation` (intermediate commentary)
- `tg:Thought` — agent reasoning
- `tg:Observation` — agent tool result
- `tg:ToolUse` — pairs with `Analysis` (when an analysis is a tool use specifically)

Per principle 2, a renderer must still treat these as independent
facets: `Synthesis + Answer` is rendered as both, not as a fused
"SynthesisAnswer". The mixins exist so that other code can ask "is
this an answer?" without enumerating every concrete type.

### Relationship predicates (DAG edges)
- `prov:wasDerivedFrom`
- `prov:wasGeneratedBy`

A renderer walking the DAG should follow both.

### Property predicates — PROV-O
- `prov:startedAtTime` — ISO timestamp
- `prov:used`
- `prov:wasAssociatedWith`

### Property predicates — TrustGraph (query-time / agent)
- `tg:query` — question text
- `tg:concept` — extracted concept
- `tg:entity` — an entity URI (multi-valued on `Exploration`)
- `tg:edgeCount` — count of candidate edges
- `tg:selectedEdge` — a chosen edge URI (multi-valued on `Focus`)
- `tg:edge` — an edge content reference
- `tg:reasoning` — per-edge reasoning text (multi-valued on `Focus`)
- `tg:document` — librarian document URI (note: this is a **document
  reference**, not raw text — the renderer needs to resolve it via
  the librarian)
- `tg:action` — tool name (on `Analysis`/`ToolUse`)
- `tg:arguments` — JSON-encoded tool arguments
- `tg:thought` — links an iteration to its thought sub-entity (this
  is the **predicate**; the type with the same local name is `tg:Thought`)
- `tg:observation` — links an iteration to its observation sub-entity
- `tg:subagentGoal` — sub-goal text (multi-valued on `Decomposition`)
- `tg:planStep` — plan step text (multi-valued on `Plan`)
- `tg:chunkCount`, `tg:selectedChunk` — DocumentRAG-specific

### Named graphs

The provenance system uses RDF named graphs to separate kinds of data:
- `""` (default) — core knowledge facts
- `urn:graph:source` — extraction provenance (which document/chunk
  produced a triple)
- `urn:graph:retrieval` — query-time explainability (the explain
  events analysed in this document)

A debug renderer for the agent console only needs `urn:graph:retrieval`.

### Cross-checking with the trace observations

All types and predicates that appeared in the three traces match
entries in `namespaces.py`. The local names I used in the earlier
draft (`action`, `arguments`, `thought`, etc.) are accurate but the
canonical references are the full IRIs above.

One subtlety: there is **both a `tg:thought` predicate and a
`tg:Thought` type**. The predicate links an iteration entity to its
thought sub-entity. The type classifies that sub-entity. They have
the same local name but live in different roles. Same for
`tg:observation` (predicate) and `tg:Observation` (type).

---

## Facets — meaning carried by each type

Each type implies a small set of predicates and a small set of
behaviours. Renderers should treat these as independent facets, not
as pathways. Below is a working catalogue of the facets observed,
along with the predicates that carry their meaning.

These facet definitions are **inferred from the traces**. If a future
event of type `Analysis` lacks `action`, that's still an Analysis —
the renderer should degrade gracefully.

### Question / AgentQuestion / GraphRagQuestion
- Predicates: `query`, `prov:startedAtTime`
- Meaning: a question being asked of something
- Render: show the query text

### Analysis (sometimes appears with `ToolUse`, `Reflection`, `Thought`)
- Predicates: `action`, `arguments`, `thought`, `rdfs:label`
- Meaning: a reasoning step, often deciding to use a tool
- Render: tool decision card if `action`/`arguments` present;
  reasoning text if `thought` present
- **The single richest facet for debugging tool descriptions and
  prompt quality**

### Reflection / Thought
- Predicates: `thought`
- Meaning: LLM reasoning text
- Render: inline reasoning

### Observation
- Predicates: `document`
- Meaning: the result of an action, fed back to the agent
- Render: labelled output card

### Grounding
- Predicates: `concept`
- Meaning: a concept extracted from a question
- Render: concept badge

### Exploration
- Predicates: `edgeCount`, `entity` (multiple)
- Meaning: enumeration of candidate entities
- Render: entity list with count

### Focus
- Predicates: `selectedEdge` (multiple), `reasoning` (multiple),
  `edge` (multiple)
- Meaning: edges narrowed down with per-edge reasoning
- Render: list of selected edges, each with its reasoning

### Synthesis
- Predicates: `document`
- Meaning: a composed answer from selected sources
- Render: answer text

### Plan
- Predicates: `planStep` (multiple), `rdfs:label`
- Meaning: a planned sequence of steps
- Render: numbered list of plan steps

### StepResult
- Predicates: `planStep`, `document`
- Meaning: the output of executing a plan step
- Render: labelled per-step result

### Decomposition
- Predicates: `subagentGoal` (multiple), `rdfs:label`
- Meaning: a question split into multiple sub-goals
- Render: list of sub-goals

### Finding
- Predicates: `subagentGoal`, `document`
- Meaning: the answer for one sub-goal
- Render: labelled per-goal result

### Answer
- Predicates: `document` (typically)
- Meaning: this event represents an answer
- Render: tag the event as an answer; combine with whatever else
  the event also is

### Conclusion
- Predicates: `document`
- Meaning: a terminal reasoning result
- Render: tag the event as a conclusion

---

## What's already useful (predicate-driven rendering)

A renderer that **walks the DAG via `wasDerivedFrom` and renders facets
based on observed predicates** can already:

- Show every reasoning step with its tool decision (`action` +
  `arguments`) and its rationale (`thought`)
- Show every Grounding/Exploration/Focus/Synthesis from a sub-RAG
  call
- Show plans as lists of steps
- Show decompositions as lists of sub-goals
- Show observations and conclusions
- Display the full DAG structure of how events derive from each other,
  including fan-in (events with multiple `wasDerivedFrom` parents)
- Walk back from any event through `wasDerivedFrom` to find the chain
  that led to it

All of this works without the renderer knowing anything about
"react vs plan-exec vs supervisor patterns". The DAG and facets are
the data; the patterns are emergent.

---

## What's missing for config-effectiveness analysis

These are signals that **aren't in the explain stream today** but
would be valuable for understanding whether your agent configuration
is working. They would arrive as new predicates on existing or new
event facets.

### Tool selection visibility
- **Tool candidates** — only the chosen tool is recorded. Adding the
  full LLM-visible candidate list (with descriptions as the LLM saw
  them) on `Analysis` events would be the highest-impact single
  change for tool description tuning.
- **Argument extraction failures** — when the LLM produces malformed
  arguments and the agent retries, the failed attempts aren't visible.

### Resource accounting
- **Token counts** — `in_token` / `out_token` per LLM call are not
  in the events. Without these you can't measure cost or detect
  prompt/response bloat.
- **Model used** — which model handled each step.
- **Latency breakdown** — only end-to-end timing is derivable from
  `prov:startedAtTime`; no split between LLM time, tool time, and
  orchestration time.

### Loop dynamics
- **Step counter** — there's no explicit "this is step N" predicate
  on events. (Don't try to derive it from URIs — see principles.)
  Adding an explicit step number predicate to relevant events would
  enable progress display.
- **Pattern decision** — for task types with multiple valid patterns,
  there's no event recording which pattern was chosen and why.
- **Termination reason** — no facet currently asserts *why* a loop
  stopped. Was it a confident answer? Hit max iterations? Gave up?
- **Sub-agent identity** — when sub-agents run, there's no facet
  linking a sub-agent's events back to the parent goal. The DAG
  may or may not connect them — need to verify by looking at
  `wasDerivedFrom` only.

### Errors and retries
- **Tool errors** — does a failure produce an explain event? The
  observed traces had no failures so this is unknown.
- **LLM parse errors** — same.

### Cross-run aggregates
Beyond per-run debugging, aggregating across many runs would surface
tool pick rates, success rates, pattern convergence rates, and
prompt parse error rates. This is its own workflow, not part of
the agent console.

---

## Recommendations

### Phase 1 — Build a predicate-driven facet renderer

The existing `ExplainEventCard` switches on a single `eventType`
string. By the principles above, that's the wrong shape. Build a
renderer that:

1. **Walks the DAG via `wasDerivedFrom`** to determine relationships.
   Don't use any other source of structure.
2. **For each event, looks at all its types** and renders one section
   per known facet, in any combination.
3. **For unknown types, renders an "unrecognised facet" badge** so
   the user can see something is there but the UI doesn't claim to
   understand it.
4. **Renders predicates the renderer knows about** — `query`,
   `action`, `arguments`, `thought`, `concept`, `planStep`,
   `subagentGoal`, etc. — regardless of which type happened to carry
   them in this run.

This approach means new event types automatically get whatever
support their predicates already have, and known facets work even
when they appear on novel type combinations.

### Phase 2 — DAG layout for parallel work

The supervisor trace contained many parallel reasoning threads. A
flat list of events is overwhelming. The DAG visualisation needs to
group events by their position in the DAG — parents and children
flow naturally from `wasDerivedFrom`. Don't try to detect "this is a
sub-agent thread" from anything other than the DAG structure.

If the DAG has disconnected components, render each as its own
group. If `wasDerivedFrom` links don't exist between events that
look semantically related, that's a backend gap — flag it but don't
try to fill it in by guessing.

### Phase 3 — Backend instrumentation

The most impactful additions to the explain stream, in order:

1. **Tool candidates** on `Analysis` events — list of candidates
   with their LLM-visible descriptions, and which was selected.
2. **Token counts** on events that involved LLM calls
   (`in_token`, `out_token`).
3. **Termination reason** on terminal events.
4. **Tool error / retry** events for failures.
5. **Sub-agent linkage** — explicit `wasDerivedFrom` edges from
   sub-agent root events back to whatever spawned them, so the DAG
   walk doesn't have disconnected components.

### Phase 4 — Cross-run analytics

A separate aggregation system that consumes the explain stream from
many runs and surfaces tool pick rates, error rates, and convergence
metrics. Out of scope for the agent console.

---

## Cross-referenced — items resolved by checking the source

Checking against `provenance/namespaces.py`, `provenance/agent.py`, and
`provenance/vocabulary.py` resolved several questions from the earlier
draft of this doc:

- **Sub-agent linkage exists.** `agent_session_triples` accepts a
  `parent_uri` and adds `prov:wasDerivedFrom` to it. Supervisor
  sub-agents and other delegated sessions are linked back into the
  DAG explicitly. A DAG walk via `wasDerivedFrom` will find them
  without needing any URI inference.

- **Mixin combinations are intentional.** `tg:Answer` is documented
  as the unifying type for `Synthesis | Conclusion | Finding |
  StepResult`. `tg:Reflection` is the unifying type for `Thought |
  Observation`. `tg:ToolUse` mixes with `Analysis`. The renderer
  must still treat these as independent facets per principle 2,
  but the pairings aren't accidental.

- **There's a separate `tg:Thought` predicate AND type.** The
  predicate (`tg:thought`) links an iteration to its thought
  sub-entity. The type (`tg:Thought`) classifies that sub-entity.
  Same pattern for `tg:observation` / `tg:Observation`. Renderers
  must keep them straight.

- **Document references go through the librarian.** Values of the
  `tg:document` predicate are URIs, not raw text. The renderer
  needs a librarian fetch step to display the actual content.

- **The DAG has two edge types.** Both `prov:wasDerivedFrom` and
  `prov:wasGeneratedBy` are used. A walker should follow both.

## Remaining open questions for the backend team

1. **Tool candidates** — are these available anywhere internally,
   even if not currently in the explain stream? Adding them to
   `Analysis` events would be the highest-impact single change for
   tool description tuning.
2. **Token counts** — what would it take to add `in_token` /
   `out_token` predicates on events that involved LLM calls?
3. **Termination reason** — is there a notion of "why did the loop
   stop" available at the agent service level that could become a
   predicate on terminal events?
4. **Tool errors** — does a failure produce an explain event today?
   The observed traces had no failures.
5. **Vocabulary publication** — is there (or should there be) a
   stable, machine-readable export of `namespaces.py` that the UI
   can consume so it stays in sync with the backend vocabulary?
