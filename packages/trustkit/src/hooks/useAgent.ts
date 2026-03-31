import { useState, useCallback } from "react";
import { useInference } from "@trustgraph/react-state";
import type { ExplainEvent } from "@trustgraph/react-state";
import { COLLECTION } from "../config";

export type AgentStepType = "thought" | "observation" | "answer";

export interface AgentStep {
  /** Backend message ID — ties chunks to the same step */
  messageId: string;
  /** Step type — thought, observation, or answer */
  type: AgentStepType;
  /** Accumulated text content */
  content: string;
  /** Whether this step's message is complete */
  complete: boolean;
}

export interface AgentState {
  /** Submit a query */
  query: (input: string) => Promise<void>;
  /** Ordered list of agent reasoning steps */
  steps: AgentStep[];
  /** Whether a query is in progress */
  isQuerying: boolean;
  /** Error message if query failed */
  error: string | null;
}

/**
 * Executes an agent query with streaming thought/observation/answer steps
 * and optional explainability events.
 *
 * The agent runs a ReAct-style loop: multiple thought/observation pairs
 * followed by a final answer. Each chunk carries a `messageId` that ties
 * it to a specific step, so concurrent/interleaved streams are handled
 * correctly.
 */
export function useAgent({
  collection = COLLECTION,
  onExplain,
}: {
  collection?: string;
  onExplain?: (event: ExplainEvent) => void;
} = {}): AgentState {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { agent } = useInference({});

  const query = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || isQuerying) return;

    setIsQuerying(true);
    setSteps([]);
    setError(null);

    // Per-step content accumulators keyed by messageId.
    // Local to this invocation — no ref needed.
    const accumulators = new Map<string, string>();

    const handleChunk = (
      type: AgentStepType,
      chunk: string,
      complete: boolean,
      messageId?: string,
    ) => {
      // Use messageId if provided, otherwise fall back to a synthetic key
      const id = messageId || `_fallback_${type}_${Date.now()}`;

      const existing = accumulators.get(id);
      if (existing !== undefined) {
        // Append to existing step
        const updated = existing + chunk;
        accumulators.set(id, updated);
        setSteps(prev => {
          const idx = prev.findIndex(s => s.messageId === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { messageId: id, type, content: updated, complete };
          return next;
        });
      } else {
        // New step
        accumulators.set(id, chunk);
        setSteps(prev => [...prev, { messageId: id, type, content: chunk, complete }]);
      }

      if (complete) {
        accumulators.delete(id);
      }
    };

    try {
      await agent({
        input: trimmed,
        collection,
        callbacks: {
          onThink: (chunk: string, complete: boolean, messageId?: string) =>
            handleChunk("thought", chunk, complete, messageId),
          onObserve: (chunk: string, complete: boolean, messageId?: string) =>
            handleChunk("observation", chunk, complete, messageId),
          onAnswer: (chunk: string, complete: boolean, messageId?: string) =>
            handleChunk("answer", chunk, complete, messageId),
          onExplain,
          onError: (err: string) => setError(err),
        },
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setIsQuerying(false);
    }
  }, [agent, collection, isQuerying, onExplain]);

  return { query, steps, isQuerying, error };
}
