import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SearchPreset, SectionLabel, Toolbar, EmptyState } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { ExplainTimeline } from "./ExplainTimeline";
import { useGraphRag } from "../../hooks/useGraphRag";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import { useTheme } from "../../theme/ThemeContext";
import { useSettings } from "@trustgraph/react-state";

interface RagWithTimelineViewProps {
  collection?: string;
  presets?: SearchPreset[];
}

/**
 * Option 3: Explain Timeline with Document Sources.
 * Response on the left, event timeline on the right with
 * document-level sources (no chunks, collapsed to documents).
 */
export function RagWithTimelineView({ collection: collectionProp, presets }: RagWithTimelineViewProps) {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const explainSession = useExplainSession();
  const { query, response, isQuerying, error } = useGraphRag({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession]);

  return (
    <div style={{ display: "flex", height: "var(--page-height)" }}>
      {/* Left: Query + Response */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${theme.border.default}` }}>
        <Toolbar>
          <SectionLabel marginBottom={12}>GRAPH RAG QUERY</SectionLabel>
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit(input)}
            placeholder="Ask a question..."
            buttonText="Query"
            isLoading={isQuerying}
            buttonColor={theme.palette.cyan}
          presets={presets}
          />
        </Toolbar>

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {!response && !isQuerying && !error && (
            <EmptyState message="Ask a question to see Graph RAG with live explainability." />
          )}

          <StreamingResponse
            text={response}
            isStreaming={isQuerying}
            error={error}
          />
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Right: Event Timeline */}
      <div style={{ width: "40%", display: "flex", flexDirection: "column" }}>
        <ExplainTimeline
          events={explainSession.events}
          isQuerying={isQuerying}
          sourceLevel="document"
        />
      </div>
    </div>
  );
}
