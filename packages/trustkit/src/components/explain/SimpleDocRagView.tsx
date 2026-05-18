import { useState, useCallback, useRef, useEffect } from "react";
import { SearchInput, SectionLabel, Toolbar, EmptyState } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { useDocumentRag } from "../../hooks/useDocumentRag";
import { palette } from "../../theme";
import { COLLECTION } from "../../config";

interface SimpleDocRagViewProps {
  collection?: string;
}

/**
 * Simple Document RAG view — no explainability.
 * Just a query input and a streaming response.
 */
export function SimpleDocRagView({ collection = COLLECTION }: SimpleDocRagViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { query, response, isQuerying, error } = useDocumentRag({ collection });

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
          <EmptyState message="Ask a question to search documents by semantic similarity." />
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
