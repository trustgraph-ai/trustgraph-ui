import { useState, useCallback } from "react";
import { useAgent } from "../../hooks/useAgent";
import type { ExplainEvent } from "@trustgraph/react-state";
import { AgentStepCard } from "../explain/AgentStepCard";
import { text, border, surface, palette } from "../../theme";

interface AgentTestStripProps {
  height?: number;
}

interface DebugEvent {
  id: string;
  graph: string;
  receivedAt: number;
}

/**
 * Compact horizontal test strip for invoking the agent. Sits at the
 * bottom of the agent console. Question in, streaming reasoning + answer
 * out, debug events on the right.
 */
export function AgentTestStrip({ height = 320 }: AgentTestStripProps) {
  const [question, setQuestion] = useState("");
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);

  const handleExplain = useCallback((event: ExplainEvent) => {
    setDebugEvents(prev => {
      if (prev.some(e => e.id === event.explainId)) return prev;
      return [...prev, {
        id: event.explainId,
        graph: event.explainGraph,
        receivedAt: Date.now(),
      }];
    });
  }, []);

  const { query, steps, isQuerying, error } = useAgent({ onExplain: handleExplain });

  const handleRun = () => {
    const q = question.trim();
    if (!q || isQuerying) return;
    setDebugEvents([]);
    query(q);
  };

  return (
    <div style={{
      height,
      borderTop: `1px solid ${border.default}`,
      display: "flex",
      flexDirection: "column",
      background: surface.base,
    }}>
      {/* Header + input */}
      <div style={{
        padding: "10px 20px",
        borderBottom: `1px solid ${border.subtle}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: text.faint,
          letterSpacing: "0.1em",
          flexShrink: 0,
        }}>
          AGENT TEST
        </span>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
          placeholder="Ask the agent a question..."
          disabled={isQuerying}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: 6,
            border: `1px solid ${border.default}`,
            background: surface.card,
            color: text.primary,
            fontSize: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
            outline: "none",
          }}
        />

        <button
          onClick={handleRun}
          disabled={!question.trim() || isQuerying}
          style={{
            padding: "7px 16px",
            borderRadius: 6,
            border: `1px solid ${palette.amber}44`,
            background: !question.trim() || isQuerying ? "transparent" : `${palette.amber}1a`,
            color: !question.trim() || isQuerying ? text.disabled : palette.amber,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            cursor: !question.trim() || isQuerying ? "default" : "pointer",
          }}
        >
          {isQuerying ? "Running..." : "Run"}
        </button>

        <button
          disabled
          title="Single step (coming soon)"
          style={{
            padding: "7px 12px",
            borderRadius: 6,
            border: `1px solid ${border.default}`,
            background: "transparent",
            color: text.disabled,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: "not-allowed",
          }}
        >
          Step ⏵
        </button>
      </div>

      {/* Body — steps + debug events */}
      <div style={{
        flex: 1,
        display: "flex",
        minHeight: 0,
      }}>
        {/* Steps */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 20px",
          minWidth: 0,
        }}>
          {error && (
            <div style={{
              fontSize: 12,
              color: palette.red,
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 8,
            }}>
              Error: {error}
            </div>
          )}

          {steps.length === 0 && !isQuerying && !error && (
            <div style={{
              fontSize: 12,
              color: text.hint,
              fontStyle: "italic",
            }}>
              Type a question and click Run to test the agent.
            </div>
          )}

          {steps.map((step, i) => (
            <AgentStepCard
              key={step.messageId}
              type={step.type}
              content={step.content}
              streaming={!step.complete}
              index={i}
            />
          ))}
        </div>

        {/* Debug events */}
        <div style={{
          width: 320,
          flexShrink: 0,
          borderLeft: `1px solid ${border.default}`,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          <div style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${border.subtle}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              color: text.faint,
              letterSpacing: "0.1em",
            }}>
              EXPLAIN EVENTS
            </span>
            <span style={{
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.hint,
            }}>
              {debugEvents.length}
            </span>
          </div>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 14px",
          }}>
            {debugEvents.length === 0 && (
              <div style={{
                fontSize: 10,
                color: text.hint,
                fontStyle: "italic",
              }}>
                Debug events will appear here as the agent runs.
              </div>
            )}
            {debugEvents.map((evt, i) => (
              <div
                key={evt.id}
                style={{
                  marginBottom: 4,
                  padding: "5px 8px",
                  borderRadius: 4,
                  background: surface.card,
                  border: `1px solid ${border.subtle}`,
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: text.secondary,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ color: palette.cyan }}>#{i + 1}</span>
                  <span style={{
                    color: text.faint,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    textAlign: "right",
                  }}>
                    {evt.id.slice(-12)}
                  </span>
                </div>
                <div style={{
                  fontSize: 9,
                  color: text.hint,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {evt.graph}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
