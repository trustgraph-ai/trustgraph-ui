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

### 4. DAG via `wasDerivedFrom` only

The only relationship structure between explain events is the DAG
formed by `prov:wasDerivedFrom` edges:

- Walk the DAG explicitly via these edges.
- Multiple `wasDerivedFrom` links are valid (fan-in).
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

## Observed types and predicates

Across the three traces, the following types appeared. **This is
not an exhaustive list**, just what was seen — new types may appear at
any time.

### Types observed
- `prov:Entity` (universal — every event)
- `Question`, `AgentQuestion`, `GraphRagQuestion`
- `Analysis`, `ToolUse`, `Reflection`, `Thought`
- `Observation`
- `Grounding`, `Exploration`, `Focus`, `Synthesis`
- `Answer`
- `Conclusion`
- `Plan`, `StepResult`
- `Decomposition`, `Finding`

### Predicates observed
- `rdf:type` (always multiple)
- `rdfs:label` (human-readable label)
- `prov:wasDerivedFrom` (DAG edges, may be multiple)
- `prov:startedAtTime` (timestamp)
- `query` (a question string)
- `action` (a tool name)
- `arguments` (JSON-encoded tool arguments)
- `thought` (LLM reasoning text)
- `concept` (an extracted concept)
- `entity` (an entity URI; may appear multiple times on one event)
- `edgeCount` (number of edges considered)
- `selectedEdge` (an edge URI; may appear multiple times)
- `edge` (was empty in the observed data)
- `reasoning` (per-edge reasoning text)
- `document` (final text content)
- `planStep` (a plan step description; may appear multiple times)
- `subagentGoal` (a sub-agent goal description; may appear multiple
  times)

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

## Open questions for the backend team

1. Are tool candidates available anywhere internally, even if not
   currently in the explain stream? Adding them to `Analysis`
   events would be the highest-impact single change.
2. What would it take to add `in_token` / `out_token` on events
   that involved LLM calls?
3. Is there a notion of "termination reason" available at the
   agent service level that could be added to terminal events?
4. When a supervisor spawns sub-agents (or any pattern delegates
   work), is there an explicit `wasDerivedFrom` link in the DAG
   from the spawned events back to the spawning event? If not,
   should there be?
5. The traces contained several events with `Synthesis + Answer`
   or `Conclusion + Answer` types. Are these mixin combinations
   guaranteed or coincidental? Per principle 2, the renderer
   shouldn't assume — but it's worth knowing the backend's intent
   so we can spot drift.
