import { useEffect, useRef } from "react";
import { SectionLabel } from "../common";
import { ExplainEventCard } from "./ExplainEventCard";
import type { ExplainNode } from "../../hooks/useExplainSession";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";
import { text, border, palette, withGlow } from "../../theme";

interface ExplainTimelineProps {
  /** Explain events to display */
  events: ExplainNode[];
  /** Whether a query is in progress */
  isQuerying?: boolean;
  /** Entity click handler (for exploration events) */
  onEntityClick?: (uri: string) => void;
  /** Edge click handler (for focus events) — highlights edge on graph */
  onEdgeClick?: (edge: { s: string; p: string; o: string }, edgeUri: string) => void;
  /** Source click handler (for focus events). Omit to hide source links. */
  onSourceClick?: (source: ProvenanceChain) => void;
  /** Source detail level */
  sourceLevel?: "none" | "document" | "full";
}

/**
 * Scrollable timeline of explain event cards with auto-scroll.
 */
export function ExplainTimeline({
  events,
  isQuerying,
  onEntityClick,
  onEdgeClick,
  onSourceClick,
  sourceLevel = "full",
}: ExplainTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${border.default}` }}>
        <SectionLabel>
          EVENTS
          {events.length > 0 && (
            <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
        </SectionLabel>
      </div>

      <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
        {events.length === 0 && !isQuerying && (
          <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
            Explain events will appear here as the query progresses.
          </div>
        )}

        {isQuerying && events.length === 0 && (
          <div style={{
            padding: "8px 12px",
            fontSize: 11,
            color: withGlow(palette.cyan, 0.6),
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Waiting for explain events...
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((node, idx) => (
            <ExplainEventCard
              key={node.explainId}
              eventType={node.eventType}
              data={node.data}
              loading={node.fetching}
              error={node.error}
              index={idx}
              onEntityClick={onEntityClick}
              onEdgeClick={onEdgeClick}
              onSourceClick={sourceLevel !== "none" ? onSourceClick : undefined}
              sourceLevel={sourceLevel}
            />
          ))}
        </div>
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
