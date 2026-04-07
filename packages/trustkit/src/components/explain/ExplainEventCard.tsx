import { Badge } from "../common";
import { SourceLinkBadge } from "./SourceLinkBadge";
import { text, withGlow, palette } from "../../theme";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";

export function eventTypeColor(eventType: string): string {
  switch (eventType) {
    case "question": return palette.amber;
    case "grounding": return palette.orange;
    case "exploration": return palette.blue;
    case "focus": return palette.purple;
    case "analysis": return palette.purple;
    case "decomposition": return palette.orange;
    case "reflection": return palette.cyan;
    case "synthesis": return palette.emerald;
    case "conclusion": return palette.emerald;
    default: return text.muted;
  }
}

interface ExplainEventCardProps {
  /** Event type */
  eventType: string;
  /** Parsed event data */
  data?: unknown;
  /** Whether the event is still loading */
  loading?: boolean;
  /** Error fetching the event */
  error?: string;
  /** Card index for display */
  index: number;
  /** Callback when an entity URI is clicked */
  onEntityClick?: (uri: string) => void;
  /** Callback when an edge is clicked (subject URI, predicate URI, object URI, edge URI) */
  onEdgeClick?: (edge: { s: string; p: string; o: string }, edgeUri: string) => void;
  /** Callback when a source link is clicked. Omit to hide source links. */
  onSourceClick?: (source: ProvenanceChain) => void;
  /** Source detail level: "none" hides, "document" collapses to docs, "full" shows chains */
  sourceLevel?: "none" | "document" | "full";
}

/**
 * Renders a single explain event with type-appropriate content.
 * Colour-coded by event type.
 */
export function ExplainEventCard({
  eventType,
  data,
  loading,
  error,
  index,
  onEntityClick,
  onEdgeClick,
  onSourceClick,
  sourceLevel = "full",
}: ExplainEventCardProps) {
  const typeColor = eventTypeColor(eventType);

  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: 8,
      background: withGlow(typeColor, 0.06),
      border: `1px solid ${withGlow(typeColor, 0.15)}`,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: loading || error ? 0 : 8,
      }}>
        <span style={{
          fontSize: 10,
          color: typeColor,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
        }}>
          {index + 1}.
        </span>
        <span style={{
          fontSize: 10,
          color: typeColor,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          textTransform: "uppercase",
        }}>
          {eventType}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          fontSize: 11,
          color: text.disabled,
          fontFamily: "'IBM Plex Mono', monospace",
          marginTop: 6,
        }}>
          Loading...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 11,
          color: text.disabled,
          fontFamily: "'IBM Plex Mono', monospace",
          marginTop: 6,
        }}>
          {error}
        </div>
      )}

      {/* Data */}
      {data != null && !loading ? (
        <ExplainEventData
          eventType={eventType}
          data={data}
          typeColor={typeColor}
          onEntityClick={onEntityClick}
          onEdgeClick={onEdgeClick}
          onSourceClick={onSourceClick}
          sourceLevel={sourceLevel}
        />
      ) : null}
    </div>
  );
}

function ExplainEventData({
  eventType,
  data,
  typeColor,
  onEntityClick,
  onEdgeClick,
  onSourceClick,
  sourceLevel,
}: {
  eventType: string;
  data: unknown;
  typeColor: string;
  onEntityClick?: (uri: string) => void;
  onEdgeClick?: (edge: { s: string; p: string; o: string }, edgeUri: string) => void;
  onSourceClick?: (source: ProvenanceChain) => void;
  sourceLevel: "none" | "document" | "full";
}) {
  const d = data as Record<string, unknown>;

  switch (eventType) {
    case "question":
      return (
        <div style={{ fontSize: 12, color: text.secondary, lineHeight: 1.5 }}>
          {String(d.query || "")}
        </div>
      );

    case "grounding": {
      const concepts = (d.concepts as string[]) || [];
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {concepts.map((c, i) => (
            <Badge key={i} color={typeColor} size="small">{c}</Badge>
          ))}
        </div>
      );
    }

    case "exploration": {
      const entities = (d.entities as string[]) || [];
      const entityLabels = (d.entityLabels as string[]) || [];
      const chunks = (d.chunks as string[]) || [];
      const edgeCount = d.edgeCount as string | undefined;
      const chunkCount = d.chunkCount as string | undefined;
      return (
        <div>
          {(edgeCount || chunkCount) && (
            <div style={{
              fontSize: 11,
              color: text.subtle,
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 6,
            }}>
              {edgeCount && <span>{edgeCount} edges</span>}
              {edgeCount && chunkCount && <span> · </span>}
              {chunkCount && <span>{chunkCount} chunks</span>}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {entities.map((uri, i) => (
              <Badge
                key={uri}
                color={typeColor}
                size="small"
                onClick={onEntityClick ? () => onEntityClick(uri) : undefined}
              >
                {entityLabels[i] || uri.split(/[/#]/).pop() || uri}
              </Badge>
            ))}
            {chunks.map((uri) => (
              <Badge
                key={uri}
                color={typeColor}
                size="small"
              >
                {uri.split(/[/#:]/).pop() || uri}
              </Badge>
            ))}
          </div>
        </div>
      );
    }

    case "focus": {
      const edgeSelections = (d.edgeSelections as Array<{
        edgeUri: string;
        edge?: { s: string; p: string; o: string };
        edgeLabels?: { s: string; p: string; o: string };
        reasoning?: string;
        sources?: ProvenanceChain[];
      }>) || [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {edgeSelections.map((sel) => {
            const isEdgeClickable = !!(onEdgeClick && sel.edge);
            return (
            <div key={sel.edgeUri}>
              {sel.edgeLabels && (
                <div
                  onClick={isEdgeClickable ? () => onEdgeClick!(sel.edge!, sel.edgeUri) : undefined}
                  style={{
                    fontSize: 11,
                    color: text.secondary,
                    marginBottom: 2,
                    cursor: isEdgeClickable ? "pointer" : "default",
                    padding: isEdgeClickable ? "3px 6px" : undefined,
                    borderRadius: 4,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={e => { if (isEdgeClickable) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ color: palette.pink }}>{sel.edgeLabels.s}</span>
                  <span style={{ color: text.faint }}> → </span>
                  <span style={{ color: text.subtle, fontFamily: "'IBM Plex Mono', monospace" }}>{sel.edgeLabels.p}</span>
                  <span style={{ color: text.faint }}> → </span>
                  <span style={{ color: palette.pink }}>{sel.edgeLabels.o}</span>
                </div>
              )}
              {sel.reasoning && (
                <div style={{
                  fontSize: 11,
                  color: text.subtle,
                  lineHeight: 1.4,
                  fontStyle: "italic",
                  marginTop: 2,
                }}>
                  {sel.reasoning.length > 150
                    ? sel.reasoning.slice(0, 150) + "…"
                    : sel.reasoning}
                </div>
              )}
              {/* Source links */}
              {sourceLevel !== "none" && sel.sources && sel.sources.length > 0 && (
                <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {collapseSourcesByDocument(sel.sources, sourceLevel).map((source, si) => (
                    <SourceLinkBadge
                      key={si}
                      source={source}
                      onClick={onSourceClick}
                    />
                  ))}
                </div>
              )}
            </div>
          );
          })}
        </div>
      );
    }

    case "synthesis":
      return (
        <div style={{ fontSize: 11, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace" }}>
          Content: {String(d.contentLength || 0)} chars
        </div>
      );

    case "analysis":
      return (
        <div style={{ fontSize: 11, color: text.subtle }}>
          {d.action ? <div><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Action:</span> {String(d.action)}</div> : null}
          {d.arguments ? <div style={{ marginTop: 2 }}><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Args:</span> {String(d.arguments)}</div> : null}
        </div>
      );

    case "decomposition": {
      const goals = (d.goals as string[]) || [];
      return (
        <div>
          <div style={{ fontSize: 11, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace", marginBottom: goals.length > 0 ? 6 : 0 }}>
            {goals.length} sub-agent thread{goals.length !== 1 ? "s" : ""}
          </div>
          {goals.map((goal, i) => (
            <div key={i} style={{
              fontSize: 11,
              color: text.secondary,
              lineHeight: 1.5,
              padding: "4px 8px",
              marginBottom: 4,
              borderLeft: `2px solid ${withGlow(typeColor, 0.3)}`,
            }}>
              {goal}
            </div>
          ))}
        </div>
      );
    }

    case "conclusion":
    case "reflection":
      return (
        <div style={{ fontSize: 11, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace" }}>
          {d.documentUri ? `Document: ${String(d.documentUri).split(/[/#]/).pop()}` : "Complete"}
        </div>
      );

    default:
      return (
        <div style={{ fontSize: 11, color: text.disabled }}>
          {eventType}
        </div>
      );
  }
}

/**
 * Collapse provenance chains to document level when sourceLevel is "document".
 * Deduplicates by the last item in the chain (the root document).
 */
function collapseSourcesByDocument(
  sources: ProvenanceChain[],
  sourceLevel: "document" | "full",
): ProvenanceChain[] {
  if (sourceLevel === "full") return sources;

  // Collapse to unique documents (last entry in each chain)
  const seen = new Set<string>();
  const collapsed: ProvenanceChain[] = [];
  for (const source of sources) {
    if (source.chain.length === 0) continue;
    const docUri = source.chain[source.chain.length - 1].uri;
    if (!seen.has(docUri)) {
      seen.add(docUri);
      // Show just the document, not the full chain
      collapsed.push({ chain: [source.chain[source.chain.length - 1]] });
    }
  }
  return collapsed;
}
