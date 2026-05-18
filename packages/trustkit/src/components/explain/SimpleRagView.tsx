import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SectionLabel, Toolbar, EmptyState } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { useGraphRag } from "../../hooks/useGraphRag";
import { palette } from "../../theme";
import { COLLECTION } from "../../config";

interface SimpleRagViewProps {
  collection?: string;
}

/**
 * Option 1: Simple RAG Query — no explainability.
 * Just a query input and a streaming response.
 */
export function SimpleRagView({ collection = COLLECTION }: SimpleRagViewProps) {
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
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
