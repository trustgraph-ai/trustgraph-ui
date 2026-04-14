import { useState, useCallback, useMemo } from "react";
import { useAgent } from "../../hooks/useAgent";
import { useExplainSession } from "../../hooks/useExplainSession";
import { parseExplainEvent } from "../../utils/explainParse";
import type { ParsedExplainEvent } from "../../utils/explainParse";
import type { ExplainEvent } from "@trustgraph/react-state";
import { ExplainFacetCard } from "./ExplainFacetCard";
import { AgentStepCard } from "../explain/AgentStepCard";
import { text, border, surface, palette } from "../../theme";

/**
 * Full-height debug panel for the Agent Console.
 * Test input at top, reasoning steps + facet cards below.
 */
export function AgentDebugPanel() {
  const [question, setQuestion] = useState("");
  const [view, setView] = useState<"steps" | "events">("steps");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const explainSession = useExplainSession();

  const handleExplain = useCallback((event: ExplainEvent) => {
    explainSession.addEvent({
      explainId: event.explainId,
      explainGraph: event.explainGraph,
      explainTriples: (event as any).explainTriples,
    });
  }, [explainSession]);

  const { query, steps, isQuerying, error } = useAgent({ onExplain: handleExplain });

  // Parse explain events using the inline triples
  const parsedEvents: ParsedExplainEvent[] = useMemo(() => {
    return explainSession.events.map(ev =>
      parseExplainEvent(ev.explainId, ev.inlineTriples || [])
    );
  }, [explainSession.events]);

  // Token totals
  const tokenTotals = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    for (const ev of parsedEvents) {
      if (ev.inToken) inTotal += ev.inToken;
      if (ev.outToken) outTotal += ev.outToken;
    }
    return { inTotal, outTotal };
  }, [parsedEvents]);

  // Find pattern decision and termination
  const patternDecision = parsedEvents.find(e => e.knownTypes.has("PatternDecision"));
  const termination = parsedEvents.find(e => e.terminationReason);

  const handleRun = () => {
    const q = question.trim();
    if (!q || isQuerying) return;
    explainSession.reset();
    setSelectedIdx(null);
    query(q);
  };

  const selectedEvent = selectedIdx !== null ? parsedEvents[selectedIdx] : null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      borderLeft: `1px solid ${border.default}`,
    }}>
      {/* Header + input */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${border.default}`,
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: text.faint,
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}>
          AGENT DEBUG
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
            placeholder="Ask the agent..."
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
              padding: "7px 14px",
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
            {isQuerying ? "..." : "Run"}
          </button>
        </div>
      </div>

      {/* Pattern decision banner */}
      {patternDecision && (
        <div style={{
          padding: "6px 16px",
          borderBottom: `1px solid ${border.subtle}`,
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.subtle,
          display: "flex",
          gap: 12,
        }}>
          {patternDecision.pattern && (
            <span>pattern: <span style={{ color: palette.cyan }}>{patternDecision.pattern}</span></span>
          )}
          {patternDecision.taskType && (
            <span>task: <span style={{ color: palette.amber }}>{patternDecision.taskType}</span></span>
          )}
        </div>
      )}

      {/* Token summary bar */}
      {(tokenTotals.inTotal > 0 || tokenTotals.outTotal > 0 || isQuerying) && (
        <div style={{
          padding: "5px 16px",
          borderBottom: `1px solid ${border.subtle}`,
          fontSize: 9,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.faint,
          display: "flex",
          gap: 12,
        }}>
          <span>events: {parsedEvents.length}</span>
          {tokenTotals.inTotal > 0 && <span>in: {tokenTotals.inTotal.toLocaleString()}</span>}
          {tokenTotals.outTotal > 0 && <span>out: {tokenTotals.outTotal.toLocaleString()}</span>}
          {isQuerying && <span style={{ color: palette.amber }}>running...</span>}
        </div>
      )}

      {/* View toggle */}
      <div style={{
        padding: "6px 16px",
        borderBottom: `1px solid ${border.subtle}`,
        display: "flex",
        gap: 8,
      }}>
        {(["steps", "events"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              border: `1px solid ${view === v ? palette.cyan + "44" : border.default}`,
              background: view === v ? `${palette.cyan}1a` : "transparent",
              color: view === v ? palette.cyan : text.subtle,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
          >
            {v === "steps" ? `Steps (${steps.length})` : `Events (${parsedEvents.length})`}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {view === "steps" && (
          <div style={{ padding: "12px 16px" }}>
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
              <div style={{ fontSize: 12, color: text.hint, fontStyle: "italic" }}>
                Run a query to see agent reasoning steps.
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
        )}

        {view === "events" && (
          <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
            {/* Event list */}
            <div style={{
              width: selectedEvent ? "50%" : "100%",
              overflowY: "auto",
              padding: "8px 12px",
              borderRight: selectedEvent ? `1px solid ${border.default}` : "none",
            }}>
              {parsedEvents.length === 0 && !isQuerying && (
                <div style={{ fontSize: 12, color: text.hint, fontStyle: "italic", padding: 8 }}>
                  Run a query to see explain events.
                </div>
              )}

              {parsedEvents.map((ev, i) => (
                <ExplainFacetCard
                  key={ev.uri}
                  event={ev}
                  isSelected={selectedIdx === i}
                  onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
                />
              ))}
            </div>

            {/* Selected event detail */}
            {selectedEvent && (
              <div style={{
                width: "50%",
                overflowY: "auto",
                padding: "12px 16px",
              }}>
                <div style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 600,
                  color: text.faint,
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}>
                  EVENT DETAIL
                </div>

                <ExplainFacetCard event={selectedEvent} />

                {/* DAG links */}
                {selectedEvent.derivedFrom.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{
                      fontSize: 9,
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: text.faint,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}>
                      DERIVED FROM
                    </div>
                    {selectedEvent.derivedFrom.map(uri => {
                      const idx = parsedEvents.findIndex(e => e.uri === uri);
                      const linked = idx >= 0 ? parsedEvents[idx] : null;
                      return (
                        <button
                          key={uri}
                          onClick={() => idx >= 0 && setSelectedIdx(idx)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            marginBottom: 2,
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: surface.card,
                            border: `1px solid ${border.subtle}`,
                            color: linked ? palette.cyan : text.hint,
                            fontSize: 10,
                            fontFamily: "'IBM Plex Mono', monospace",
                            cursor: idx >= 0 ? "pointer" : "default",
                          }}
                        >
                          {linked ? linked.label || linked.typeNames.filter(t => t !== "Entity").join(" + ") : uri.slice(-30)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Termination banner */}
      {termination && !isQuerying && (
        <div style={{
          padding: "6px 16px",
          borderTop: `1px solid ${border.default}`,
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: palette.amber,
        }}>
          Terminated: {termination.terminationReason}
        </div>
      )}
    </div>
  );
}
