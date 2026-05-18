import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SectionLabel, Toolbar, EmptyState } from "../common";
import { ExplainGraph } from "../graph/ExplainGraph";
import { StreamingResponse } from "./StreamingResponse";
import { ExplainTimeline } from "./ExplainTimeline";
import { SourcePanel } from "./SourcePanel";
import { useGraphRag } from "../../hooks/useGraphRag";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";
import { useExplainGraph } from "../../hooks/useExplainGraph";
import { useSourceDocument } from "../../hooks/useSourceDocument";
import { palette, border } from "../../theme";
import { COLLECTION } from "../../config";

interface RagExplainViewProps {
  collection?: string;
}

/**
 * Option 4: Split View with Provenance Graph.
 * Response + source panel on the left, provenance graph + event
 * timeline with full source chains on the right.
 */
export function RagExplainView({ collection = COLLECTION }: RagExplainViewProps) {
  const [input, setInput] = useState("");
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const explainSession = useExplainSession();
  const { query, response, isQuerying, error } = useGraphRag({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);
  const { graphNodes, graphEdges } = useExplainGraph(explainSession.events);
  const { source, loadSource, close: closeSource } = useSourceDocument();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    closeSource();
    setHighlightedNodeIds([]);
    setHighlightedEdgeIds([]);
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession, closeSource]);

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

  const handleEdgeTripleClick = useCallback((edge: { s: string; p: string; o: string }, edgeUri: string) => {
    setHighlightedNodeIds([edge.s, edge.o]);
    setHighlightedEdgeIds([edgeUri]);
  }, []);

  const handleSourceClick = useCallback((src: ProvenanceChain) => {
    if (src.chain.length === 0) return;
    const chunkUri = src.chain[0].uri;
    const docUri = src.chain[src.chain.length - 1].uri;
    loadSource(chunkUri, docUri);
  }, [loadSource]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 110px)" }}>
      {/* Left: Query + Response + Source */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${border.default}` }}>
        <Toolbar>
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
        </Toolbar>

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {!response && !isQuerying && !error && (
            <EmptyState message="Ask a question to see Graph RAG with full provenance." />
          )}

          <StreamingResponse
            text={response}
            isStreaming={isQuerying}
            error={error}
          />
          <div ref={scrollRef} />
        </div>

        {source && <SourcePanel source={source} onClose={closeSource} />}
      </div>

      {/* Right: Graph (top half) + Events (bottom half) */}
      <div style={{ width: "45%", position: "relative" }}>
        {/* Provenance graph — top half, fixed */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          borderBottom: `1px solid ${border.default}`,
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

        {/* Event timeline — bottom half, independently scrollable */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
        }}>
          <ExplainTimeline
            events={explainSession.events}
            isQuerying={isQuerying}
            onEntityClick={handleEntityClick}
            onEdgeClick={handleEdgeTripleClick}
            onSourceClick={handleSourceClick}
            sourceLevel="full"
          />
        </div>
      </div>
    </div>
  );
}
