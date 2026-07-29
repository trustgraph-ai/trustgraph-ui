import { useNodeDetail } from "../../hooks/useNodeDetail";
import type { NodeRelationship } from "../../hooks/useNodeDetail";
import { useTheme } from "../../theme/ThemeContext";

interface RawNodeDetailPanelProps {
  uri: string;
  nodeColor: string;
  onClose?: () => void;
  onNodeNavigate?: (uri: string) => void;
}

export function RawNodeDetailPanel({
  uri,
  nodeColor,
  onClose,
  onNodeNavigate,
}: RawNodeDetailPanelProps) {
  const detail = useNodeDetail(uri);
  const { theme, sz } = useTheme();

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
          fontSize: sz(11),
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
        }}>
          NODE
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.text.faint,
              cursor: "pointer",
              fontSize: sz(18),
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Node label */}
      <div style={{
        fontSize: sz(20),
        fontWeight: 700,
        color: theme.text.primary,
        marginBottom: 8,
      }}>
        {detail.label}
      </div>

      {/* Loading */}
      {detail.isLoading && (
        <div style={{
          fontSize: sz(11),
          fontFamily: "'IBM Plex Mono', monospace",
          color: theme.text.hint,
          marginBottom: 12,
        }}>
          loading...
        </div>
      )}

      {/* Properties */}
      {detail.properties.length > 0 && (
        <>
          <SectionHeader theme={theme} sz={sz}>PROPERTIES</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {detail.properties.map(({ key, values }) => (
              <div
                key={key}
                style={{
                  padding: "8px 0",
                  borderBottom: `1px solid ${theme.border.subtle}`,
                }}
              >
                <div style={{
                  fontSize: sz(10),
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: theme.text.faint,
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
                      fontSize: sz(12),
                      color: theme.text.primary,
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
          <SectionHeader theme={theme} sz={sz}>OUTGOING</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {detail.relationships.filter(r => r.direction === "outgoing").map((rel) => (
              <RelationshipGroup
                key={rel.predicateUri}
                rel={rel}
                theme={theme}
                sz={sz}

                onNavigate={onNodeNavigate}
              />
            ))}
          </div>
        </>
      )}

      {/* Incoming relationships */}
      {detail.relationships.filter(r => r.direction === "incoming").length > 0 && (
        <>
          <SectionHeader theme={theme} sz={sz}>INCOMING</SectionHeader>
          <div style={{ marginBottom: 20 }}>
            {detail.relationships.filter(r => r.direction === "incoming").map((rel) => (
              <RelationshipGroup
                key={rel.predicateUri}
                rel={rel}
                theme={theme}
                sz={sz}

                onNavigate={onNodeNavigate}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

import type { Theme } from "../../theme/types";

function SectionHeader({ children, theme, sz }: { children: string; theme: Theme; sz: (n: number) => number }) {
  return (
    <div style={{
      fontSize: sz(10),
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 600,
      color: theme.text.faint,
      letterSpacing: "0.1em",
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function RelationshipGroup({
  rel,
  theme,
  sz,
  onNavigate,
}: {
  rel: NodeRelationship;
  theme: Theme;
  sz: (n: number) => number;
  onNavigate?: (uri: string) => void;
}) {
  const arrow = rel.direction === "outgoing" ? "→" : "←";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: sz(10),
        fontFamily: "'IBM Plex Mono', monospace",
        color: theme.text.subtle,
        marginBottom: 4,
      }}>
        {arrow} {rel.predicate}
      </div>
      {rel.targets.map((target) => {
        const c = target.color;
        return (
        <button
          key={target.uri}
          onClick={() => onNavigate?.(target.uri)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "6px 10px",
            marginBottom: 2,
            borderRadius: 6,
            border: `1px solid ${c}33`,
            background: `${c}11`,
            color: c,
            fontSize: sz(12),
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${c}55`;
            e.currentTarget.style.background = `${c}22`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${c}33`;
            e.currentTarget.style.background = `${c}11`;
          }}
        >
          {target.label}
        </button>
        );
      })}
    </div>
  );
}
