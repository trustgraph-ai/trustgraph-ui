import { Card, SectionLabel, text, surface, border, palette } from "@trustgraph/trustkit";

interface WorkflowCard {
  key: string;
  view?: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  detail: string;
  screenshot?: string;
}

interface HomePageProps {
  onNavigate?: (view: string) => void;
}

const workflows: WorkflowCard[] = [
  {
    key: "ingest",
    view: "ingest",
    title: "Document Ingestion",
    icon: "⬆",
    color: palette.amber,
    description: "Load documents into TrustGraph and process them into knowledge.",
    detail: "Select files, add metadata, upload with progress tracking, then process through a flow to extract entities, triples, and embeddings. Verify results in the graph.",
  },
  {
    key: "explore",
    view: "explore",
    title: "Knowledge Explorer",
    icon: "◈",
    color: palette.emerald,
    description: "Explore the knowledge graph visually and drill into entities.",
    detail: "Browse the full entity graph with zoom and pan. Click nodes to see properties and relationships. Follow connections to navigate through the knowledge structure.",
  },
  {
    key: "graph-rag",
    view: "graph-rag",
    title: "Graph RAG Query",
    icon: "◉",
    color: palette.blue,
    description: "Ask questions answered from the knowledge graph with full provenance.",
    detail: "Ask a natural language question and watch TrustGraph retrieve relevant entities and edges, select evidence, and synthesise an answer. Trace every fact back to its source.",
    screenshot: "/ss-graph-rag.png",
  },
  {
    key: "agent",
    view: "agent",
    title: "Agent Query",
    icon: "⚡",
    color: palette.amber,
    description: "Ask questions answered by a reasoning agent with full provenance.",
    detail: "Ask a natural language question and watch the agent think, observe, and reason through multiple steps before delivering an answer. Trace every reasoning step and fact back to its source.",
  },
  {
    key: "doc-rag",
    view: "doc-rag",
    title: "Document RAG Query",
    icon: "◉",
    color: palette.purple,
    description: "Search documents by semantic similarity and get grounded answers.",
    detail: "Ask a question and find the most relevant document chunks by embedding similarity. The LLM generates an answer grounded in the retrieved content, with source references.",
    screenshot: "/ss-doc-rag.png",
  },
  {
    key: "raw-graph",
    view: "raw-graph",
    title: "Graph Navigator",
    icon: "◎",
    color: palette.cyan,
    description: "Explore any graph visually — no schema required.",
    detail: "Navigate raw triple graphs with force-directed layout. Start from the most connected node, search for any entity, and explore outward by double-clicking. Filter by predicate type to focus on specific relationship patterns.",
  },
  {
    key: "prompts",
    view: "prompts",
    title: "Prompt Management",
    icon: "✎",
    color: palette.amber,
    description: "Browse, edit, and test LLM prompt templates.",
    detail: "View all prompt templates used across the TrustGraph pipeline. Edit templates with syntax-highlighted Jinja markup, test with real variable substitution, and see streaming LLM responses with token counts.",
  },
];

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div style={{
      padding: "48px 28px",
      height: "calc(100vh - 110px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}>
          {workflows.map((wf) => (
            <Card
              key={wf.key}
              borderColor={wf.color + "22"}
              padding={0}
              onClick={wf.view && onNavigate ? () => onNavigate(wf.view!) : undefined}
            >
              {/* Screenshot thumbnail */}
              <div style={{
                height: 140,
                overflow: "hidden",
                borderRadius: "12px 12px 0 0",
                position: "relative",
              }}>
                <img
                  src={wf.screenshot || "/placeholder.png"}
                  alt={wf.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.6,
                  }}
                />
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, transparent 0%, ${surface.base} 100%)`,
                }} />
                {/* Icon overlay */}
                <div style={{
                  position: "absolute",
                  top: 12,
                  left: 14,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: wf.color + "20",
                  border: `1px solid ${wf.color}44`,
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}>
                  {wf.icon}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "16px 20px 20px" }}>
                <div style={{
                  fontSize: 15,
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
                  padding: "10px 12px",
                  background: surface.card,
                  borderRadius: 6,
                  border: `1px solid ${border.subtle}`,
                }}>
                  {wf.detail}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
