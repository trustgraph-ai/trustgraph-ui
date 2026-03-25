import { Badge } from "../common";
import { text, withGlow, palette } from "../../theme";

function eventTypeColor(eventType: string): string {
  switch (eventType) {
    case "question": return palette.amber;
    case "grounding": return palette.orange;
    case "exploration": return palette.blue;
    case "focus": return palette.purple;
    case "analysis": return palette.purple;
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
}: {
  eventType: string;
  data: unknown;
  typeColor: string;
  onEntityClick?: (uri: string) => void;
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
        sources?: Array<{ chain: Array<{ uri: string; label: string }> }>;
      }>) || [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {edgeSelections.map((sel) => (
            <div key={sel.edgeUri}>
              {sel.edgeLabels && (
                <div style={{ fontSize: 11, color: text.secondary, marginBottom: 2 }}>
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
            </div>
          ))}
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
