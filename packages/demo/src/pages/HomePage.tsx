import { Card, useTheme } from "@trustgraph/trustkit";
import type { ThemePalette } from "@trustgraph/trustkit";

interface WorkflowCard {
  key: string;
  view?: string;
  title: string;
  icon: string;
  paletteKey: keyof ThemePalette;
  description: string;
  screenshot?: string;
}

interface HomePageProps {
  onNavigate?: (view: string) => void;
}

const workflows: WorkflowCard[] = [
  { key: "ingest", view: "ingest", title: "Document Ingestion", icon: "⬆", paletteKey: "amber", description: "Load documents and process them into knowledge.", screenshot: "/doc-ingest.jpg" },
  { key: "explore", view: "explore", title: "Context Graph Explorer", icon: "◈", paletteKey: "emerald", description: "Explore the context graph visually.", screenshot: "/ctxt-graph.jpg" },
  { key: "graph-rag", view: "graph-rag", title: "Graph RAG Query", icon: "◉", paletteKey: "blue", description: "Ask questions with knowledge graph provenance.", screenshot: "/graph-rag.jpg" },
  { key: "agent", view: "agent", title: "Agent Query", icon: "⚡", paletteKey: "amber", description: "Multi-step reasoning agent with provenance.", screenshot: "/agent-retrieval.jpg" },
  { key: "doc-rag", view: "doc-rag", title: "Document RAG Query", icon: "◉", paletteKey: "purple", description: "Semantic document search with grounded answers.", screenshot: "/doc-rag.jpg" },
  { key: "raw-graph", view: "raw-graph", title: "Graph Navigator", icon: "◎", paletteKey: "cyan", description: "Explore any graph — no schema required.", screenshot: "/ss-raw-graph.png" },
  { key: "prompts", view: "prompts", title: "Prompt Management", icon: "✎", paletteKey: "amber", description: "Browse, edit, and test LLM prompt templates.", screenshot: "/prompts.jpg" },
  { key: "agent-config", view: "agent-config", title: "Agent Console", icon: "⚙", paletteKey: "cyan", description: "Configure agent patterns, task types, and tools.", screenshot: "/agent.jpg" },
  { key: "data", view: "data", title: "Table Explorer", icon: "▤", paletteKey: "blue", description: "Search structured data across schemas.", screenshot: "/ss-data.png" },
  { key: "ontology", view: "ontology", title: "Ontology Viewer", icon: "◇", paletteKey: "purple", description: "Browse classes, properties, and relationships." },
  { key: "ontology-manage", view: "ontology-manage", title: "Ontology Management", icon: "◆", paletteKey: "emerald", description: "Create, edit, validate, and export OWL ontologies.", screenshot: "/ontology.jpg" },
  { key: "schemas", view: "schemas", title: "Schema Management", icon: "▦", paletteKey: "blue", description: "Define and manage structured data schemas.", screenshot: "/schema.jpg" },
  { key: "sparql", view: "sparql", title: "SPARQL Query", icon: "⟐", paletteKey: "purple", description: "Execute SPARQL queries against the knowledge graph." },
  { key: "graphql", view: "graphql", title: "GraphQL Query", icon: "⬡", paletteKey: "cyan", description: "Execute GraphQL queries against structured data." },
];

export function HomePage({ onNavigate }: HomePageProps) {
  const { theme, sz } = useTheme();

  return (
    <div style={{
      padding: "48px 28px",
      height: "var(--page-height)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: sz(24),
            fontWeight: 700,
            color: theme.text.primary,
            marginBottom: 6,
            fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
          }}>
            TrustGraph Workflows
          </h1>
          <p style={{
            fontSize: sz(13),
            color: theme.text.muted,
            lineHeight: 1.5,
          }}>
            Each workflow demonstrates how trustkit components compose to create a full experience.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}>
          {workflows.map((wf) => {
            const color = theme.palette[wf.paletteKey];
            return (
              <Card
                key={wf.key}
                borderColor={color + "22"}
                padding={0}
                onClick={wf.view && onNavigate ? () => onNavigate(wf.view!) : undefined}
              >
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
                    background: `linear-gradient(180deg, transparent 0%, ${theme.surface.base} 100%)`,
                  }} />
                  <div style={{
                    position: "absolute",
                    top: 8,
                    left: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: color + "20",
                    border: `1px solid ${color}44`,
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: sz(14),
                  }}>
                    {wf.icon}
                  </div>
                </div>

                <div style={{ padding: "10px 14px 14px" }}>
                  <div style={{
                    fontSize: sz(13),
                    fontWeight: 700,
                    color: color,
                    marginBottom: 3,
                  }}>
                    {wf.title}
                  </div>
                  <div style={{
                    fontSize: sz(11),
                    color: theme.text.subtle,
                    lineHeight: 1.4,
                  }}>
                    {wf.description}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
