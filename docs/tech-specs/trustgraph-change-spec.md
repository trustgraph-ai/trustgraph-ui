# TrustGraph Backend Change Spec

This document is a series of focused change requests for the TrustGraph
backend team (owners of `trustgraph-base`) to enable a richer Agent
Console debug experience in the new-ux toolkit.

Each request stands on its own and can be implemented independently.
They share a common motivation: surfacing additional information in
the existing explainability stream so that UI tooling can help users
understand and tune their agent configuration.

## Background

The Agent Console is a workbench for managing agent configuration
(patterns, task types, tools, MCP tools, tool services) and observing
agent behaviour. It uses the existing explainability events emitted
by the agent service. See `AGENT_INVOCATION_NEEDS.md` for the full
analysis of what's currently emitted and how the UI consumes it.

The explainability events follow the principles documented in
`namespaces.py` and `agent.py` in
`trustgraph-base/trustgraph/provenance/`:

- Information is expressed **explicitly** through triples
- Types are **mixin facets**, not closed enum values
- The vocabulary is **open and extensible**
- Relationships are expressed via **PROV-O** (`prov:wasDerivedFrom`,
  `prov:wasGeneratedBy`)

All change requests below preserve these principles.

---

<!-- Change requests will be added here as they are agreed -->
