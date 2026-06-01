import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SectionLabel } from "../common";
import { ExplainGraph } from "../graph/ExplainGraph";
import { StreamingResponse } from "./StreamingResponse";
import { ExplainEventCard } from "./ExplainEventCard";
import { useGraphRag } from "../../hooks/useGraphRag";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import { useExplainGraph } from "../../hooks/useExplainGraph";
import { text, border, palette, withGlow } from "../../theme";
import { useSettings } from "@trustgraph/react-state";

interface GraphRagViewProps {
  /** Collection to query */
  collection?: string;
}

/**
 * Complete Graph RAG query view — input, streaming response,
 * explain event timeline, and provenance graph.
 */
export function GraphRagView({ collection: collectionProp }: GraphRagViewProps) {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const explainScrollRef = useRef<HTMLDivElement>(null);

  const explainSession = useExplainSession();

  const { query, response, isQuerying, error } = useGraphRag({
    collection,
    onExplain: explainSession.addEvent,
  });

  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);
  const { graphNodes, graphEdges } = useExplainGraph(explainSession.events);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  useEffect(() => {
    explainScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [explainSession.events]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    setHighlightedNodeIds([]);
    setHighlightedEdgeIds([]);
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession]);

  const handleEntityClick = useCallback((entityUri: string) => {
    const connectedEdges = graphEdges.filter(e => e.from === entityUri || e.to === entityUri);
    const neighbourIds = new Set<string>([entityUri]);
    const edgeIds: string[] = [];
    for (const e of connectedEdges) {
      edgeIds.push(e.id);
      neighbourIds.add(e.from);
      neighbourIds.add(e.to);
    }
    setHighlightedNodeIds(Array.from(neighbourIds));
    setHighlightedEdgeIds(edgeIds);
  }, [graphEdges]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 110px)" }}>
      {/* LHS: Query + Response */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${border.default}`,
      }}>
        {/* Input */}
        <div style={{ padding: "20px 28px", borderBottom: `1px solid ${border.default}` }}>
          <SectionLabel marginBottom={12}>GRAPH RAG QUERY</SectionLabel>
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit(input)}
            placeholder="Ask a question..."
            buttonText="Query"
            isLoading={isQuerying}
            buttonColor={palette.cyan}
          />
        </div>

        {/* Response */}
        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {!response && !isQuerying && !error && (
            <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
              Ask a question to see Graph RAG in action with live explainability.
            </div>
          )}

          <StreamingResponse
            text={response}
            isStreaming={isQuerying}
            error={error}
          />

          <div ref={scrollRef} />
        </div>
      </div>

      {/* RHS: Graph + Events */}
      <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
        {/* Provenance graph */}
        <div style={{
          height: "45%",
          borderBottom: `1px solid ${border.default}`,
          position: "relative",
        }}>
          <ExplainGraph
            nodes={graphNodes}
            edges={graphEdges}
            highlightedNodeIds={highlightedNodeIds}
            highlightedEdgeIds={highlightedEdgeIds}
            onNodeClick={(nodeId) => {
              setHighlightedNodeIds(prev =>
                prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
              );
            }}
            onEdgeClick={(edgeId) => {
              setHighlightedEdgeIds(prev =>
                prev.includes(edgeId) ? prev.filter(id => id !== edgeId) : [...prev, edgeId]
              );
            }}
          />
        </div>

        {/* Event timeline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${border.default}` }}>
            <SectionLabel>
              EVENTS
              {explainSession.events.length > 0 && (
                <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
                  {explainSession.events.length} event{explainSession.events.length !== 1 ? "s" : ""}
                </span>
              )}
            </SectionLabel>
          </div>

          <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
            {explainSession.events.length === 0 && !isQuerying && (
              <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
                Explain events will appear here as the query progresses.
              </div>
            )}

            {isQuerying && explainSession.events.length === 0 && (
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
              {explainSession.events.map((node, idx) => (
                <ExplainEventCard
                  key={node.explainId}
                  eventType={node.eventType}
                  data={node.data}
                  loading={node.fetching}
                  error={node.error}
                  index={idx}
                  onEntityClick={handleEntityClick}
                />
              ))}
            </div>
            <div ref={explainScrollRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
