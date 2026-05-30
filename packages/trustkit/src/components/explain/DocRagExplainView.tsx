import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SectionLabel, Toolbar, EmptyState } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { ExplainTimeline } from "./ExplainTimeline";
import { SourcePanel } from "./SourcePanel";
import { useDocumentRag } from "../../hooks/useDocumentRag";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";
import { useSourceDocument } from "../../hooks/useSourceDocument";
import { palette, border } from "../../theme";
import { useSettings } from "@trustgraph/react-state";

interface DocRagExplainViewProps {
  collection?: string;
}

/**
 * Document RAG with explainability — response on the left,
 * explain event timeline on the right with source links.
 */
export function DocRagExplainView({ collection: collectionProp }: DocRagExplainViewProps) {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const explainSession = useExplainSession();
  const { query, response, isQuerying, error } = useDocumentRag({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);
  const { source, loadSource, close: closeSource } = useSourceDocument();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    closeSource();
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession, closeSource]);

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

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {!response && !isQuerying && !error && (
            <EmptyState message="Ask a question to see Document RAG with live explainability." />
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

      {/* Right: Event Timeline */}
      <div style={{ width: "40%", display: "flex", flexDirection: "column" }}>
        <ExplainTimeline
          events={explainSession.events}
          isQuerying={isQuerying}
          onSourceClick={handleSourceClick}
          sourceLevel="full"
        />
      </div>
    </div>
  );
}
