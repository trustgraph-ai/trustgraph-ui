import { useNodeDetail } from "../../hooks/useNodeDetail";
import type { NodeRelationship } from "../../hooks/useNodeDetail";
import { text, border, surface } from "../../theme";

interface RawNodeDetailPanelProps {
  uri: string;
  nodeColor: string;
  onClose: () => void;
  onNodeNavigate: (uri: string) => void;
}

export function RawNodeDetailPanel({
  uri,
  nodeColor,
  onClose,
  onNodeNavigate,
}: RawNodeDetailPanelProps) {
  const detail = useNodeDetail(uri);

  if (!detail) return null;

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
          color: nodeColor,
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
        {detail.label}
      </div>

      {/* Loading */}
      {detail.isLoading && (
        <div style={{
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.hint,
          marginBottom: 12,
        }}>
          loading...
        </div>
      )}

      {/* Descriptions */}
      {detail.descriptions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {detail.descriptions.map((desc, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: text.secondary,
                lineHeight: 1.6,
                marginBottom: i < detail.descriptions.length - 1 ? 8 : 0,
              }}
            >
              {desc}
            </div>
          ))}
        </div>
      )}

      {/* Properties */}
      {detail.properties.length > 0 && (
        <>
          <SectionHeader>PROPERTIES</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {detail.properties.map(({ key, values }) => (
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
      {detail.relationships.filter(r => r.direction === "outgoing").length > 0 && (
        <>
          <SectionHeader>OUTGOING</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {detail.relationships.filter(r => r.direction === "outgoing").map((rel) => (
              <RelationshipGroup
                key={rel.predicateUri}
                rel={rel}
                onNavigate={onNodeNavigate}
              />
            ))}
          </div>
        </>
      )}

      {/* Incoming relationships */}
      {detail.relationships.filter(r => r.direction === "incoming").length > 0 && (
        <>
          <SectionHeader>INCOMING</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {detail.relationships.filter(r => r.direction === "incoming").map((rel) => (
              <RelationshipGroup
                key={rel.predicateUri}
                rel={rel}
                onNavigate={onNodeNavigate}
              />
            ))}
          </div>
        </>
      )}

      {/* Navigate button */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => onNodeNavigate(uri)}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 8,
            border: `1px solid ${nodeColor}44`,
            background: `${nodeColor}1a`,
            color: nodeColor,
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

function RelationshipGroup({
  rel,
  onNavigate,
}: {
  rel: NodeRelationship;
  onNavigate: (uri: string) => void;
}) {
  const arrow = rel.direction === "outgoing" ? "→" : "←";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        color: text.subtle,
        marginBottom: 4,
      }}>
        {arrow} {rel.predicate}
      </div>
      {rel.targets.map((target) => (
        <button
          key={target.uri}
          onClick={() => onNavigate(target.uri)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "6px 10px",
            marginBottom: 2,
            borderRadius: 6,
            border: "1px solid transparent",
            background: surface.card,
            color: target.color,
            fontSize: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${target.color}44`;
            e.currentTarget.style.background = surface.cardHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.background = surface.card;
          }}
        >
          {target.label}
        </button>
      ))}
    </div>
  );
}
