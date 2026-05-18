import { useState, useCallback } from "react";
import { useInference } from "@trustgraph/react-state";
import type { ExplainEvent } from "@trustgraph/react-state";

/**
 * Executes a Document RAG query with streaming response and explain events.
 * Wraps useInference.documentRag with state management.
 */
export function useDocumentRag({
  collection,
  onExplain,
}: {
  collection: string;
  onExplain?: (event: ExplainEvent) => void;
}) {
  const [response, setResponse] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { documentRag } = useInference({});

  const handleExplain = useCallback((event: ExplainEvent) => {
    onExplain?.(event);
  }, [onExplain]);

  const query = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || isQuerying) return;

    setIsQuerying(true);
    setResponse("");
    setError(null);

    try {
      await documentRag({
        input: trimmed,
        collection,
        callbacks: {
          onChunk: (chunk: string) => setResponse(prev => prev + chunk),
          onExplain: handleExplain,
          onError: (err: string) => setError(err),
        },
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setIsQuerying(false);
    }
  }, [documentRag, collection, isQuerying, handleExplain]);

  const reset = useCallback(() => {
    setResponse("");
    setError(null);
    setIsQuerying(false);
  }, []);

  return { query, response, isQuerying, error, reset };
}
