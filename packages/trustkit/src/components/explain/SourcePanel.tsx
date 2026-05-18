import { text, border, palette, withGlow, semantic } from "../../theme";
import type { SourceDocumentState } from "../../hooks/useSourceDocument";

interface SourcePanelProps {
  /** Source document state */
  source: SourceDocumentState;
  /** Close handler */
  onClose: () => void;
}

function shortUri(uri: string): string {
  const pos = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return pos >= 0 ? uri.slice(pos + 1) : uri;
}

/**
 * Panel showing a source document's chunk text, title, and metadata.
 */
export function SourcePanel({ source, onClose }: SourcePanelProps) {
  return (
    <div style={{
      maxHeight: "40%",
      borderTop: `1px solid ${border.default}`,
      display: "flex",
      flexDirection: "column",
      background: withGlow(palette.amber, 0.03),
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          <span style={{ fontWeight: 600, color: palette.amber }}>SOURCE</span>
          {source.documentTitle ? (
            <span style={{ color: text.secondary, marginLeft: 8 }}>
              {source.documentTitle}
            </span>
          ) : (
            <span style={{ color: text.muted, marginLeft: 8 }}>
              {shortUri(source.documentUri)}
            </span>
          )}
          {source.documentTags && source.documentTags.length > 0 && (
            <span style={{ marginLeft: 8 }}>
              {source.documentTags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: 9, padding: "1px 6px", borderRadius: 3, marginLeft: 4,
                  background: withGlow(palette.cyan, 0.1),
                  border: `1px solid ${withGlow(palette.cyan, 0.2)}`,
                  color: text.subtle,
                }}>
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: text.muted, fontSize: 16, padding: "0 4px", lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {source.loading && (
          <div style={{
            fontSize: 11,
            color: withGlow(palette.amber, 0.6),
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Loading source text...
          </div>
        )}
        {source.error && (
          <div style={{
            fontSize: 11,
            color: semantic.error,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {source.error}
          </div>
        )}
        {source.chunkText && (
          <div style={{
            fontSize: 12,
            color: text.secondary,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {source.chunkText}
          </div>
        )}
      </div>
    </div>
  );
}
