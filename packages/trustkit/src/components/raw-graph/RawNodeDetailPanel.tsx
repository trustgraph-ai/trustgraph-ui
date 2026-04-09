import type { RawNode, RawEdge } from "../../hooks/useRawGraphData";
import { text, border, surface } from "../../theme";

interface RawNodeDetailPanelProps {
  node: RawNode;
  edges: RawEdge[];
  nodes: Map<string, RawNode>;
  onClose: () => void;
  onNodeNavigate: (uri: string) => void;
}

export function RawNodeDetailPanel({
  node,
  edges,
  nodes,
  onClose,
  onNodeNavigate,
}: RawNodeDetailPanelProps) {
  const outgoing = edges.filter(e => e.from === node.id);
  const incoming = edges.filter(e => e.to === node.id);

  // Group outgoing by predicate
  const outByPred = new Map<string, { predicate: string; color: string; targets: RawNode[] }>();
  for (const edge of outgoing) {
    if (!outByPred.has(edge.predicateUri)) {
      outByPred.set(edge.predicateUri, { predicate: edge.predicate, color: edge.color, targets: [] });
    }
    const target = nodes.get(edge.to);
    if (target) outByPred.get(edge.predicateUri)!.targets.push(target);
  }

  // Group incoming by predicate
  const inByPred = new Map<string, { predicate: string; color: string; sources: RawNode[] }>();
  for (const edge of incoming) {
    if (!inByPred.has(edge.predicateUri)) {
      inByPred.set(edge.predicateUri, { predicate: edge.predicate, color: edge.color, sources: [] });
    }
    const source = nodes.get(edge.from);
    if (source) inByPred.get(edge.predicateUri)!.sources.push(source);
  }

  const hasProperties = Object.keys(node.properties).length > 0;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
      }}>
        <div style={{
          color: node.color,
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
        }}>
          NODE
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: text.faint,
            cursor: "pointer",
            fontSize: 18,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Node label */}
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 8,
      }}>
        {node.label}
      </div>

      {/* Description */}
      {node.description && (
        <div style={{
          fontSize: 13,
          color: text.secondary,
          lineHeight: 1.6,
          marginBottom: 12,
        }}>
          {node.description}
        </div>
      )}

      {/* Spacer before sections */}
      <div style={{ marginBottom: 20 }} />

      {/* Properties */}
      {hasProperties && (
        <>
          <SectionHeader>PROPERTIES</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {Object.entries(node.properties).map(([key, values]) => (
              <div
                key={key}
                style={{
                  padding: "8px 0",
                  borderBottom: `1px solid ${border.subtle}`,
                }}
              >
                <div style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: text.faint,
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  {key}
                </div>
                {values.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Outgoing relationships */}
      {outByPred.size > 0 && (
        <>
          <SectionHeader>OUTGOING</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {Array.from(outByPred.values()).map(({ predicate, color, targets }) => (
              <PredicateGroup
                key={predicate}
                predicate={predicate}
                color={color}
                direction="→"
                entities={targets}
                onNavigate={onNodeNavigate}
              />
            ))}
          </div>
        </>
      )}

      {/* Incoming relationships */}
      {inByPred.size > 0 && (
        <>
          <SectionHeader>INCOMING</SectionHeader>
          <div>
            {Array.from(inByPred.values()).map(({ predicate, color, sources }) => (
              <PredicateGroup
                key={predicate}
                predicate={predicate}
                color={color}
                direction="←"
                entities={sources}
                onNavigate={onNodeNavigate}
              />
            ))}
          </div>
        </>
      )}

      {/* Navigate button */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => onNodeNavigate(node.id)}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 8,
            border: `1px solid ${node.color}44`,
            background: `${node.color}1a`,
            color: node.color,
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          Centre graph on this node →
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SectionHeader({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10,
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 600,
      color: text.faint,
      letterSpacing: "0.1em",
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function PredicateGroup({
  predicate,
  color,
  direction,
  entities,
  onNavigate,
}: {
  predicate: string;
  color: string;
  direction: "→" | "←";
  entities: RawNode[];
  onNavigate: (uri: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        color: color,
        marginBottom: 4,
        opacity: 0.8,
      }}>
        {direction} {predicate}
      </div>
      {entities.map((entity) => (
        <button
          key={entity.id}
          onClick={() => onNavigate(entity.id)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "6px 10px",
            marginBottom: 2,
            borderRadius: 6,
            border: `1px solid transparent`,
            background: surface.card,
            color: entity.color,
            fontSize: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${entity.color}44`;
            e.currentTarget.style.background = surface.cardHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.background = surface.card;
          }}
        >
          {entity.label}
        </button>
      ))}
    </div>
  );
}
