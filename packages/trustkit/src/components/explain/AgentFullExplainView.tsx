import { useState, useCallback } from "react";
import { SearchInput, SearchPreset, SectionLabel, Toolbar } from "../common";
import { AgentStepList } from "./AgentStepList";
import { ExplainEventCard } from "./ExplainEventCard";
import { ExplainDAG } from "./ExplainDAG";
import { SourcePanel } from "./SourcePanel";
import { ExplainGraph } from "../graph/ExplainGraph";
import { useAgent } from "../../hooks/useAgent";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";
import { useExplainDAG } from "../../hooks/useExplainDAG";
import { useExplainGraph } from "../../hooks/useExplainGraph";
import { useSourceDocument } from "../../hooks/useSourceDocument";
import { text, palette, border } from "../../theme";
import { useSettings } from "@trustgraph/react-state";

interface AgentFullExplainViewProps {
  collection?: string;
  presets?: SearchPreset[];
}

/**
 * Agent Query with Full Explainability DAG.
 * The reasoning process as a DAG with click-to-inspect detail panel.
 * DAG on the left with agent steps below, event detail on the right.
 */
export function AgentFullExplainView({ collection: collectionProp, presets }: AgentFullExplainViewProps) {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<string[]>([]);

  const explainSession = useExplainSession();
  const { query, steps, isQuerying, error } = useAgent({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);
  const dagLayout = useExplainDAG(explainSession.events);
  const { graphNodes, graphEdges } = useExplainGraph(explainSession.events);
  const { source, loadSource, close: closeSource } = useSourceDocument();

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    closeSource();
    setSelectedEventId(null);
    setHighlightedNodeIds([]);
    setHighlightedEdgeIds([]);
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession, closeSource]);

  const handleSourceClick = useCallback((src: ProvenanceChain) => {
    if (src.chain.length === 0) return;
    const chunkUri = src.chain[0].uri;
    const docUri = src.chain[src.chain.length - 1].uri;
    loadSource(chunkUri, docUri);
  }, [loadSource]);

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

  const selectedEvent = explainSession.events.find(e => e.explainId === selectedEventId);
  const selectedEventIndex = explainSession.events.findIndex(e => e.explainId === selectedEventId);

  const showSubGraph = selectedEvent && (
    selectedEvent.eventType === "exploration" ||
    selectedEvent.eventType === "focus"
  );

  return (
    <div style={{ display: "flex", height: "var(--page-height)" }}>
      {/* Left: Query + DAG + Agent Steps */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: selectedEvent ? `1px solid ${border.default}` : undefined,
      }}>
        <Toolbar>
          <SectionLabel marginBottom={12}>AGENT QUERY</SectionLabel>
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit(input)}
            placeholder="Ask a question..."
            buttonText="Ask"
            isLoading={isQuerying}
            buttonColor={palette.amber}
            presets={presets}
          />
        </Toolbar>

        {/* DAG */}
        <div style={{
          flex: 1,
          borderBottom: `1px solid ${border.default}`,
          position: "relative",
          minHeight: 200,
        }}>
          <ExplainDAG
            layout={dagLayout}
            selectedNodeId={selectedEventId}
            onNodeClick={(nodeId) => {
              setSelectedEventId(selectedEventId === nodeId ? null : nodeId);
            }}
          />
        </div>

        {/* Agent Steps */}
        <div style={{ maxHeight: "35%", padding: "20px 28px", overflowY: "auto" }}>
          {steps.length === 0 && !isQuerying && !error && (
            <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
              Agent reasoning steps will appear here.
            </div>
          )}

          <AgentStepList
            steps={steps}
            isQuerying={isQuerying}
            error={error}
          />
        </div>

        {source && <SourcePanel source={source} onClose={closeSource} />}
      </div>

      {/* Right: Event Detail Panel */}
      {selectedEvent && (
        <div style={{
          width: 400,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "rgba(12,12,18,0.95)",
          backdropFilter: "blur(12px)",
        }}>
          {/* Header */}
          <div style={{
            flexShrink: 0,
            padding: "16px 20px",
            borderBottom: `1px solid ${border.default}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <SectionLabel>EVENT DETAIL</SectionLabel>
            <button
              onClick={() => setSelectedEventId(null)}
              style={{
                background: "none", border: "none",
                color: text.faint, cursor: "pointer", fontSize: 18,
              }}
            >
              ×
            </button>
          </div>

          {/* Sub-graph for exploration/focus events */}
          {showSubGraph && (
            <div style={{
              flexShrink: 0,
              height: "55%",
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
          )}

          {/* Event card */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
            <ExplainEventCard
              eventType={selectedEvent.eventType}
              data={selectedEvent.data}
              loading={selectedEvent.fetching}
              error={selectedEvent.error}
              index={selectedEventIndex}
              onEntityClick={handleEntityClick}
              onEdgeClick={handleEdgeTripleClick}
              onSourceClick={handleSourceClick}
              sourceLevel="full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
