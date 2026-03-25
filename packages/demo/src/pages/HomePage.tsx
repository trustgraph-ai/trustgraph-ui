import { Card, SectionLabel, text, surface, border, palette } from "@trustgraph/trustkit";

interface WorkflowCard {
  key: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  detail: string;
}

const workflows: WorkflowCard[] = [
  {
    key: "ingest",
    title: "Document Ingestion",
    icon: "⬆",
    color: palette.amber,
    description: "Load documents into TrustGraph and process them into knowledge.",
    detail: "Select files, add metadata, upload with progress tracking, then process through a flow to extract entities, triples, and embeddings. Verify results in the graph.",
  },
  {
    key: "explore",
    title: "Knowledge Explorer",
    icon: "◈",
    color: palette.emerald,
    description: "Explore the knowledge graph visually and drill into entities.",
    detail: "Browse the full entity graph with zoom and pan. Click nodes to see properties and relationships. Follow connections to navigate through the knowledge structure.",
  },
  {
    key: "graph-rag",
    title: "Graph RAG Query",
    icon: "◉",
    color: palette.blue,
    description: "Ask questions answered from the knowledge graph with full provenance.",
    detail: "Ask a natural language question and watch TrustGraph retrieve relevant entities and edges, select evidence, and synthesise an answer. Trace every fact back to its source.",
  },
  {
    key: "doc-rag",
    title: "Document RAG Query",
    icon: "◉",
    color: palette.purple,
    description: "Search documents by semantic similarity and get grounded answers.",
    detail: "Ask a question and find the most relevant document chunks by embedding similarity. The LLM generates an answer grounded in the retrieved content, with source references.",
  },
];

export function HomePage() {
  return (
    <div style={{
      padding: "48px 28px",
      height: "calc(100vh - 110px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 8,
            fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
          }}>
            TrustGraph Workflows
          </h1>
          <p style={{
            fontSize: 14,
            color: text.muted,
            lineHeight: 1.6,
            maxWidth: 600,
          }}>
            Complete workflows for building and querying knowledge graphs.
            Each workflow demonstrates how trustkit components compose to
            create a full experience.
          </p>
        </div>

        {/* Workflow grid */}
        <SectionLabel marginBottom={20}>WORKFLOWS</SectionLabel>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(480, 1fr))",
          gap: 16,
        }}>
          {workflows.map((wf) => (
            <Card key={wf.key} borderColor={wf.color + "22"}>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}>
                {/* Icon */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: wf.color + "15",
                  border: `1px solid ${wf.color}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {wf.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: wf.color,
                    marginBottom: 6,
                  }}>
                    {wf.title}
                  </div>

                  <div style={{
                    fontSize: 13,
                    color: text.secondary,
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}>
                    {wf.description}
                  </div>

                  <div style={{
                    fontSize: 12,
                    color: text.subtle,
                    lineHeight: 1.6,
                    padding: "12px 14px",
                    background: surface.card,
                    borderRadius: 8,
                    border: `1px solid ${border.subtle}`,
                  }}>
                    {wf.detail}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
