import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SearchPreset, SectionLabel, Toolbar, EmptyState } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { useGraphRag } from "../../hooks/useGraphRag";
import { palette } from "../../theme";
import { useSettings } from "@trustgraph/react-state";

interface SimpleRagViewProps {
  collection?: string;
  presets?: SearchPreset[];
}

/**
 * Option 1: Simple RAG Query — no explainability.
 * Just a query input and a streaming response.
 */
export function SimpleRagView({ collection: collectionProp, presets }: SimpleRagViewProps) {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { query, response, isQuerying, error } = useGraphRag({ collection });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    setInput("");
    query(q);
  }, [query, isQuerying]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
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
          presets={presets}
        />
      </Toolbar>

      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
        {!response && !isQuerying && !error && (
          <EmptyState message="Ask a question to get an answer from the knowledge graph." />
        )}

        <StreamingResponse
          text={response}
          isStreaming={isQuerying}
          error={error}
        />

        <div ref={scrollRef} />
      </div>
    </div>
  );
}
