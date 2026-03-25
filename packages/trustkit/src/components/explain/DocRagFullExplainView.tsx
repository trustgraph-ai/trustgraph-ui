import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SectionLabel, Toolbar } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { ExplainEventCard } from "./ExplainEventCard";
import { ExplainDAG } from "./ExplainDAG";
import { SourcePanel } from "./SourcePanel";
import { useDocumentRag } from "../../hooks/useDocumentRag";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";
import { useExplainDAG } from "../../hooks/useExplainDAG";
import { useSourceDocument } from "../../hooks/useSourceDocument";
import { text, palette, border } from "../../theme";
import { COLLECTION } from "../../config";

interface DocRagFullExplainViewProps {
  collection?: string;
}

/**
 * Document RAG with full DAG explainability.
 * DAG on the left with response below, event detail on the right.
 */
export function DocRagFullExplainView({ collection = COLLECTION }: DocRagFullExplainViewProps) {
  const [input, setInput] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const explainSession = useExplainSession();
  const { query, response, isQuerying, error } = useDocumentRag({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);
  const dagLayout = useExplainDAG(explainSession.events);
  const { source, loadSource, close: closeSource } = useSourceDocument();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    closeSource();
    setSelectedEventId(null);
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession, closeSource]);

  const handleSourceClick = useCallback((src: ProvenanceChain) => {
    if (src.chain.length === 0) return;
    const chunkUri = src.chain[0].uri;
    const docUri = src.chain[src.chain.length - 1].uri;
    loadSource(chunkUri, docUri);
  }, [loadSource]);

  const selectedEvent = explainSession.events.find(e => e.explainId === selectedEventId);
  const selectedEventIndex = explainSession.events.findIndex(e => e.explainId === selectedEventId);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 110px)" }}>
      {/* Left: Query + DAG + Response */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRight: selectedEvent ? `1px solid ${border.default}` : undefined,
      }}>
        <Toolbar>
          <SectionLabel marginBottom={12}>DOCUMENT RAG QUERY</SectionLabel>
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit(input)}
            placeholder="Ask a question..."
            buttonText="Query"
            isLoading={isQuerying}
            buttonColor={palette.purple}
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

        {/* Response */}
        <div style={{ maxHeight: "35%", padding: "20px 28px", overflowY: "auto" }}>
          {!response && !isQuerying && !error && (
            <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
              Response will appear here.
            </div>
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

          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
            <ExplainEventCard
              eventType={selectedEvent.eventType}
              data={selectedEvent.data}
              loading={selectedEvent.fetching}
              error={selectedEvent.error}
              index={selectedEventIndex}
              onSourceClick={handleSourceClick}
              sourceLevel="full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
