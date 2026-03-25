1. Everything orbits the collection.
Queries run against a collection. Documents are processed into a collection.
The graph shows a collection's entities. The ontology is per-collection. Data
search is per-collection. The channel architecture scopes everything by
connection + collection. The collection is the fundamental organising unit —
not the workflow.

2. Workflows aren't isolated — they're connected views.
The ingestion doc reveals this clearly: you upload a document, it processes
into a collection, you see entities in the graph, you query against those
entities, you trace provenance back to the document. That's workflows 1 → 2 →
3 → back to 1. They're not separate destinations — they're lenses on the same
knowledge.

This means the demo shouldn't feel like "pick a workflow, do it, go back
home." It should feel like "I'm working in this collection, and I can ingest,
explore, query, or review at any time."

3. The same data, multiple views — everywhere.
- Explainability: 5 options from zero to full DAG
- Ingestion: 4 views (pipeline, collection, tag, document)
- Graph: Canvas or SVG
- Queries: Graph RAG, Doc RAG, Agent

The pattern is always: same hooks at Tier 1, different composition at Tier 3.
This validates the architecture but also suggests the demo should show this
flexibility — not just pick one view.

4. Progressive disclosure is the interaction model.
- Flows: hidden unless needed
- Explainability: none → summary → timeline → full DAG
- Metadata: defaults first, edit if you want
- Flow params: model only, expand for advanced

Users start simple and drill in. The default should always work. Complexity is
 available but never forced.

5. Live feedback is expected everywhere.
- Ingestion: graph grows as processing happens
- Queries: responses stream, explain events arrive in real time
- Graph: nodes highlight on hover and selection
- Connection: live test as you type

The system should always feel alive. Static screens feel broken.

What this means for the demo:

The current homepage grid is a good entry point, but once inside a workflow
the user should be able to flow between them without going home. Something
like:

- A persistent sidebar or collection context at the top
- "I'm in the Sales Data collection" → I can ingest, explore, query, or review
 from here
- Clicking "View in Graph" from the ingestion summary takes you to the
explorer filtered to new entities
- Clicking a source document from a query's provenance takes you to the
document view in ingestion
- The workflows are tabs or views within a collection workspace, not separate
destinations


