import { useState, useCallback } from "react";
import { useAgent } from "../../hooks/useAgent";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import type { ExplainEvent } from "@trustgraph/react-state";
import { AgentStepCard } from "../explain/AgentStepCard";
import { ExplainEventCard } from "../explain/ExplainEventCard";
import { text, border, surface, palette } from "../../theme";

interface AgentTestStripProps {
  height?: number;
}

/**
 * Compact horizontal test strip for invoking the agent. Sits at the
 * bottom of the agent console. Question in, streaming reasoning + answer
 * out, debug events on the right.
 */
export function AgentTestStrip({ height = 320 }: AgentTestStripProps) {
  const [question, setQuestion] = useState("");
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);

  const explainSession = useExplainSession();
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);

  const handleExplain = useCallback((event: ExplainEvent) => {
    explainSession.addEvent({
      explainId: event.explainId,
      explainGraph: event.explainGraph,
      explainTriples: (event as any).explainTriples,
    });
  }, [explainSession]);

  const { query, steps, isQuerying, error } = useAgent({ onExplain: handleExplain });

  const handleRun = () => {
    const q = question.trim();
    if (!q || isQuerying) return;
    explainSession.reset();
    setSelectedEventIdx(null);
    query(q);
  };

  const events = explainSession.events;
  const selectedEvent = selectedEventIdx !== null ? events[selectedEventIdx] : null;

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

        {/* Explain events list */}
        <div style={{
          width: 220,
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
              {events.length}
            </span>
          </div>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 10px",
          }}>
            {events.length === 0 && (
              <div style={{
                fontSize: 10,
                color: text.hint,
                fontStyle: "italic",
              }}>
                Events appear as the agent runs.
              </div>
            )}
            {events.map((evt, i) => {
              const isSelected = selectedEventIdx === i;
              return (
                <button
                  key={evt.explainId}
                  onClick={() => setSelectedEventIdx(i)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    marginBottom: 3,
                    padding: "5px 8px",
                    borderRadius: 4,
                    background: isSelected ? `${palette.cyan}1a` : surface.card,
                    border: `1px solid ${isSelected ? palette.cyan + "44" : border.subtle}`,
                    fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: text.secondary,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ color: isSelected ? palette.cyan : text.faint }}>
                      #{i + 1}
                    </span>
                    <span style={{
                      color: evt.fetched ? palette.emerald : text.hint,
                      fontSize: 9,
                    }}>
                      {evt.eventType}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected event detail */}
        {selectedEvent && (
          <div style={{
            width: 360,
            flexShrink: 0,
            borderLeft: `1px solid ${border.default}`,
            overflowY: "auto",
            padding: "12px 16px",
          }}>
            <ExplainEventCard
              eventType={selectedEvent.eventType}
              data={selectedEvent.data}
              loading={selectedEvent.fetching}
              error={selectedEvent.error}
              index={selectedEventIdx ?? 0}
              sourceLevel="full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
