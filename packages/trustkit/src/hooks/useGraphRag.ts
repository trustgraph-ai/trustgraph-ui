import { useState, useCallback } from "react";
import { useInference } from "@trustgraph/react-state";
import type { ExplainEvent } from "@trustgraph/react-state";

export interface GraphRagState {
  /** Submit a query */
  query: (input: string) => Promise<void>;
  /** Streaming response text so far */
  response: string;
  /** Whether a query is in progress */
  isQuerying: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Callback to wire into useExplainSession.addEvent */
  onExplain: (event: ExplainEvent) => void;
  /** Reset state for a new query */
  reset: () => void;
}

/**
 * Executes a Graph RAG query with streaming response and explain events.
 * Wraps useInference.graphRag with state management.
 *
 * Wire the returned `onExplain` into a useExplainSession's `addEvent`
 * to capture provenance events.
 */
export function useGraphRag({
  collection,
  onExplain,
  maxSubgraphSize = 150,
}: {
  collection: string;
  onExplain?: (event: ExplainEvent) => void;
  maxSubgraphSize?: number;
}): GraphRagState {
  const [response, setResponse] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { graphRag } = useInference({});

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
      await graphRag({
        input: trimmed,
        collection,
        options: { maxSubgraphSize },
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
  }, [graphRag, collection, maxSubgraphSize, isQuerying, handleExplain]);

  const reset = useCallback(() => {
    setResponse("");
    setError(null);
    setIsQuerying(false);
  }, []);

  return { query, response, isQuerying, error, onExplain: handleExplain, reset };
}
