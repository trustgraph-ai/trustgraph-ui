import { Card, text, surface, palette } from "@trustgraph/trustkit";

interface WorkflowCard {
  key: string;
  view?: string;
  title: string;
  icon: string;
  color: string;
  description: string;
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
    description: "Load documents and process them into knowledge.",
    screenshot: "/doc-ingest.jpg",
  },
  {
    key: "explore",
    view: "explore",
    title: "Context Graph Explorer",
    icon: "◈",
    color: palette.emerald,
    description: "Explore the context graph visually.",
    screenshot: "/ctxt-graph.jpg",
  },
  {
    key: "graph-rag",
    view: "graph-rag",
    title: "Graph RAG Query",
    icon: "◉",
    color: palette.blue,
    description: "Ask questions with knowledge graph provenance.",
    screenshot: "/graph-rag.jpg",
  },
  {
    key: "agent",
    view: "agent",
    title: "Agent Query",
    icon: "⚡",
    color: palette.amber,
    description: "Multi-step reasoning agent with provenance.",
    screenshot: "/agent-retrieval.jpg",
  },
  {
    key: "doc-rag",
    view: "doc-rag",
    title: "Document RAG Query",
    icon: "◉",
    color: palette.purple,
    description: "Semantic document search with grounded answers.",
    screenshot: "/doc-rag.jpg",
  },
  {
    key: "raw-graph",
    view: "raw-graph",
    title: "Graph Navigator",
    icon: "◎",
    color: palette.cyan,
    description: "Explore any graph — no schema required.",
    screenshot: "/ss-raw-graph.png",
  },
  {
    key: "prompts",
    view: "prompts",
    title: "Prompt Management",
    icon: "✎",
    color: palette.amber,
    description: "Browse, edit, and test LLM prompt templates.",
    screenshot: "/prompts.jpg",
  },
  {
    key: "agent-config",
    view: "agent-config",
    title: "Agent Console",
    icon: "⚙",
    color: palette.cyan,
    description: "Configure agent patterns, task types, and tools.",
    screenshot: "/agent.jpg",
  },
  {
    key: "data",
    view: "data",
    title: "Table Explorer",
    icon: "▤",
    color: palette.blue,
    description: "Search structured data across schemas.",
    screenshot: "/ss-data.png",
  },
  {
    key: "ontology",
    view: "ontology",
    title: "Ontology Viewer",
    icon: "◇",
    color: palette.purple,
    description: "Browse classes, properties, and relationships.",
  },
  {
    key: "ontology-manage",
    view: "ontology-manage",
    title: "Ontology Management",
    icon: "◆",
    color: palette.emerald,
    description: "Create, edit, validate, and export OWL ontologies.",
    screenshot: "/ontology.jpg",
  },
  {
    key: "schemas",
    view: "schemas",
    title: "Schema Management",
    icon: "▦",
    color: palette.blue,
    description: "Define and manage structured data schemas.",
    screenshot: "/schema.jpg",
  },
  {
    key: "sparql",
    view: "sparql",
    title: "SPARQL Query",
    icon: "⟐",
    color: palette.purple,
    description: "Execute SPARQL queries against the knowledge graph.",
  },

/*
  {
    key: "world-events",
    view: "world-events",
    title: "World Events Explorer",
    icon: "⊕",
    color: palette.cyan,
    description: "Geo-temporal event explorer with map, timeline, and filters.",
  },
  {
    key: "solar-missions",
    view: "solar-missions",
    title: "Solar System Missions",
    icon: "◉",
    color: palette.amber,
    description: "Explore space missions across the solar system.",
  },
*/
  {
    key: "hwsec",
    view: "hwsec",
    title: "Hardware Security Explorer",
    icon: "◈",
    color: palette.blue,
    description: "Hardware decomposition tree with security annotations.",
  },

/*
  {
    key: "playground",
    view: "playground",
    title: "Playground",
    icon: "△",
    color: palette.rose,
    description: "Experimental sandbox for trying things out.",
  },
*/
];

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div style={{
      padding: "48px 28px",
      height: "calc(100vh - 110px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 6,
            fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
          }}>
            TrustGraph Workflows
          </h1>
          <p style={{
            fontSize: 13,
            color: text.muted,
            lineHeight: 1.5,
          }}>
            Each workflow demonstrates how trustkit components compose to create a full experience.
          </p>
        </div>

        {/* Workflow grid — 3 columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}>
          {workflows.map((wf) => (
            <Card
              key={wf.key}
              borderColor={wf.color + "22"}
              padding={0}
              onClick={wf.view && onNavigate ? () => onNavigate(wf.view!) : undefined}
            >
              {/* Screenshot thumbnail — compact */}
              <div style={{
                height: 80,
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
                    opacity: 0.5,
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
                  top: 8,
                  left: 10,
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: wf.color + "20",
                  border: `1px solid ${wf.color}44`,
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}>
                  {wf.icon}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "10px 14px 14px" }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: wf.color,
                  marginBottom: 3,
                }}>
                  {wf.title}
                </div>
                <div style={{
                  fontSize: 11,
                  color: text.subtle,
                  lineHeight: 1.4,
                }}>
                  {wf.description}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
