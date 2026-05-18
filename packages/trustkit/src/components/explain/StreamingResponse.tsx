import { semantic, text, withGlow, palette } from "../../theme";

interface StreamingResponseProps {
  /** Response text so far */
  text: string;
  /** Still receiving chunks */
  isStreaming: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * Renders a streaming LLM response with status indicator.
 */
export function StreamingResponse({ text: responseText, isStreaming, error }: StreamingResponseProps) {
  if (error) {
    return (
      <div style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: withGlow(semantic.error, 0.08),
        border: `1px solid ${withGlow(semantic.error, 0.2)}`,
      }}>
        <div style={{
          fontSize: 10,
          color: withGlow(semantic.error, 0.53),
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 6,
        }}>
          ERROR
        </div>
        <div style={{ fontSize: 13, color: text.secondary, lineHeight: 1.6 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!responseText && !isStreaming) return null;

  return (
    <div>
      {responseText && (
        <div style={{
          padding: "16px 20px",
          borderRadius: 10,
          background: withGlow(semantic.answer, 0.08),
          border: `1px solid ${withGlow(semantic.answer, 0.2)}`,
        }}>
          <div style={{
            fontSize: 10,
            color: withGlow(semantic.answer, 0.53),
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 8,
          }}>
            <span style={{ color: semantic.answer }}>✓</span> RESPONSE
          </div>
          <div style={{
            fontSize: 14,
            color: text.primary,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {responseText}
          </div>
        </div>
      )}
      {isStreaming && (
        <div style={{
          padding: "8px 12px",
          fontSize: 11,
          color: withGlow(palette.cyan, 0.6),
          fontFamily: "'IBM Plex Mono', monospace",
          marginTop: 12,
        }}>
          {responseText ? "Streaming..." : "Processing query..."}
        </div>
      )}
    </div>
  );
}
