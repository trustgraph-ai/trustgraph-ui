import type { ParsedExplainEvent } from "../../utils/explainParse";
import { text, border, surface, palette } from "../../theme";

interface ExplainFacetCardProps {
  event: ParsedExplainEvent;
  /** Whether this card is visually selected */
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * Predicate-driven facet renderer for explain events.
 *
 * Renders all facets present on the event. Doesn't switch on a single
 * event type — instead checks which predicates and types are present
 * and renders a section for each. Unknown types get a badge.
 */
export function ExplainFacetCard({ event, isSelected, onClick }: ExplainFacetCardProps) {
  const isError = event.knownTypes.has("Error");
  const borderColor = isError ? palette.red : isSelected ? palette.cyan : border.default;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        marginBottom: 6,
        borderRadius: 8,
        border: `1px solid ${borderColor}${isSelected ? "" : "88"}`,
        background: isError ? `${palette.red}08` : isSelected ? `${palette.cyan}08` : "transparent",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
      }}
    >
      {/* Header: type badges + step number */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexWrap: "wrap",
        marginBottom: 6,
      }}>
        {/* Step number */}
        {event.stepNumber !== undefined && (
          <span style={{
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 700,
            color: text.muted,
            marginRight: 4,
          }}>
            #{event.stepNumber}
          </span>
        )}

        {/* Known type badges */}
        {event.typeNames
          .filter(t => t !== "Entity") // Entity is universal noise
          .map(t => (
            <TypeBadge
              key={t}
              name={t}
              known={event.knownTypes.has(t)}
              isError={t === "Error"}
            />
          ))}
      </div>

      {/* Label */}
      {event.label && (
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          marginBottom: 6,
        }}>
          {event.label}
        </div>
      )}

      {/* Pattern Decision facet */}
      {event.pattern && (
        <Facet label="Pattern">
          <span style={{ color: palette.cyan }}>{event.pattern}</span>
          {event.taskType && (
            <span style={{ color: text.subtle, marginLeft: 8 }}>
              task type: <span style={{ color: palette.amber }}>{event.taskType}</span>
            </span>
          )}
        </Facet>
      )}

      {/* Query facet */}
      {event.query && (
        <Facet label="Query">
          <span style={{ color: text.primary }}>{event.query}</span>
        </Facet>
      )}

      {/* Tool decision facet (Analysis/ToolUse) */}
      {event.action && (
        <Facet label="Tool">
          <span style={{ color: palette.emerald, fontWeight: 600 }}>{event.action}</span>
          {event.arguments && (
            <pre style={{
              margin: "4px 0 0",
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.secondary,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {formatJson(event.arguments)}
            </pre>
          )}
        </Facet>
      )}

      {/* Tool candidates */}
      {event.toolCandidates.length > 0 && (
        <Facet label="Candidates">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {event.toolCandidates.map(c => (
              <span
                key={c}
                style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: c === event.action ? `${palette.emerald}20` : surface.card,
                  border: `1px solid ${c === event.action ? palette.emerald + "44" : border.subtle}`,
                  color: c === event.action ? palette.emerald : text.subtle,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </Facet>
      )}

      {/* Concepts (Grounding) */}
      {event.concepts.length > 0 && (
        <Facet label="Concepts">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {event.concepts.map((c, i) => (
              <span key={i} style={{
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "1px 6px",
                borderRadius: 3,
                background: `${palette.blue}15`,
                border: `1px solid ${palette.blue}22`,
                color: palette.blue,
              }}>
                {c}
              </span>
            ))}
          </div>
        </Facet>
      )}

      {/* Exploration: entities or chunks */}
      {(event.entities.length > 0 || event.edgeCount !== undefined) && (
        <Facet label="Exploration">
          {event.edgeCount !== undefined && (
            <span style={{ color: text.secondary }}>
              {event.edgeCount} edges, {event.entities.length} entities
            </span>
          )}
        </Facet>
      )}

      {event.chunkCount !== undefined && (
        <Facet label="Chunks">
          <span style={{ color: text.secondary }}>
            {event.chunkCount} candidates, {event.selectedChunks.length} selected
          </span>
        </Facet>
      )}

      {/* Focus: selected edges with concept/score */}
      {event.selectedEdges.length > 0 && (
        <Facet label={`Focus (${event.selectedEdges.length} edges)`}>
          {event.scores.length > 0 && (
            <div style={{
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.secondary,
              lineHeight: 1.6,
            }}>
              {event.scores.slice(0, 3).map((s, i) => (
                <div key={i}>
                  {event.concepts[i] && (
                    <span style={{ color: palette.orange }}>{event.concepts[i]}</span>
                  )}
                  <span style={{ color: text.faint, marginLeft: 6 }}>
                    score: <span style={{ color: palette.cyan }}>{s.toFixed(4)}</span>
                  </span>
                </div>
              ))}
              {event.scores.length > 3 && (
                <div style={{ color: text.hint }}>
                  +{event.scores.length - 3} more
                </div>
              )}
            </div>
          )}
          {event.scores.length === 0 && (
            <span style={{ color: text.secondary }}>
              {event.selectedEdges.length} edge{event.selectedEdges.length !== 1 ? "s" : ""} selected
            </span>
          )}
        </Facet>
      )}

      {/* Plan steps */}
      {event.planSteps.length > 0 && (
        <Facet label="Plan">
          {event.planSteps.map((s, i) => (
            <div key={i} style={{
              fontSize: 11,
              color: text.secondary,
              lineHeight: 1.4,
              marginBottom: 2,
              paddingLeft: 8,
            }}>
              <span style={{ color: text.faint, marginRight: 6 }}>{i + 1}.</span>
              {s}
            </div>
          ))}
        </Facet>
      )}

      {/* Sub-agent goals */}
      {event.subagentGoals.length > 0 && (
        <Facet label="Sub-agent goals">
          {event.subagentGoals.map((g, i) => (
            <div key={i} style={{
              fontSize: 11,
              color: text.secondary,
              lineHeight: 1.4,
              marginBottom: 2,
              paddingLeft: 8,
            }}>
              <span style={{ color: text.faint, marginRight: 6 }}>{i + 1}.</span>
              {g}
            </div>
          ))}
        </Facet>
      )}

      {/* Tool error */}
      {event.toolError && (
        <Facet label="Error">
          <span style={{ color: palette.red }}>{event.toolError}</span>
        </Facet>
      )}

      {/* Termination reason */}
      {event.terminationReason && (
        <Facet label="Terminated">
          <span style={{ color: palette.amber }}>{event.terminationReason}</span>
        </Facet>
      )}

      {/* Metrics row: tokens + latency */}
      {(event.inToken !== undefined || event.llmDurationMs !== undefined || event.toolDurationMs !== undefined) && (
        <div style={{
          display: "flex",
          gap: 12,
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${border.subtle}`,
          fontSize: 9,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.faint,
        }}>
          {event.inToken !== undefined && (
            <span>in: {event.inToken.toLocaleString()}</span>
          )}
          {event.outToken !== undefined && (
            <span>out: {event.outToken.toLocaleString()}</span>
          )}
          {event.llmModel && (
            <span>{event.llmModel}</span>
          )}
          {event.llmDurationMs !== undefined && (
            <span>llm: {event.llmDurationMs}ms</span>
          )}
          {event.toolDurationMs !== undefined && (
            <span>tool: {event.toolDurationMs}ms</span>
          )}
        </div>
      )}

      {/* Unknown types */}
      {event.unknownTypeNames.length > 0 && (
        <div style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${border.subtle}`,
          fontSize: 9,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.hint,
        }}>
          Unrecognised facets: {event.unknownTypeNames.join(", ")}
        </div>
      )}

      {/* Extra predicates */}
      {event.extraPredicates.length > 0 && (
        <div style={{
          marginTop: 4,
          fontSize: 9,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.hint,
        }}>
          {event.extraPredicates.map(({ predicateName, values }) => (
            <div key={predicateName}>
              {predicateName}: {values[0]}{values.length > 1 ? ` (+${values.length - 1})` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function TypeBadge({ name, known, isError }: { name: string; known: boolean; isError?: boolean }) {
  const color = isError
    ? palette.red
    : known
    ? palette.cyan
    : text.hint;

  return (
    <span style={{
      fontSize: 9,
      fontFamily: "'IBM Plex Mono', monospace",
      padding: "1px 5px",
      borderRadius: 3,
      background: `${color}15`,
      border: `1px solid ${color}22`,
      color,
    }}>
      {name}
    </span>
  );
}

function Facet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontSize: 9,
        fontFamily: "'IBM Plex Mono', monospace",
        color: text.faint,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.4 }}>
        {children}
      </div>
    </div>
  );
}

function formatJson(jsonStr: string): string {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}
