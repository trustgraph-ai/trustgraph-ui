import { useState, useCallback, useRef } from "react";
import { useInference } from "@trustgraph/react-state";
import type { ExplainEvent } from "@trustgraph/react-state";

export type AgentStepType = "thought" | "observation" | "answer";

export interface AgentStep {
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
 * followed by a final answer. Each callback fires per-chunk; a new step
 * is added when the type changes or the previous step was complete.
 */
export function useAgent({
  onExplain,
}: {
  onExplain?: (event: ExplainEvent) => void;
} = {}): AgentState {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { agent } = useInference({});

  // Track current step accumulation across callbacks within a single query.
  // Using a ref so the closure captures a stable reference.
  const accRef = useRef<{ type: string; content: string }>({ type: "", content: "" });

  const appendStep = useCallback((
    type: AgentStepType,
    chunk: string,
    complete?: boolean,
  ) => {
    const acc = accRef.current;

    if (type !== acc.type || acc.type === "") {
      // New step
      acc.type = type;
      acc.content = chunk;
      setSteps(prev => [...prev, { type, content: chunk, complete: !!complete }]);
    } else {
      // Append to current step
      acc.content += chunk;
      setSteps(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          type,
          content: acc.content,
          complete: !!complete,
        };
        return updated;
      });
    }

    if (complete) {
      acc.type = "";
      acc.content = "";
    }
  }, []);

  const query = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || isQuerying) return;

    setIsQuerying(true);
    setSteps([]);
    setError(null);
    accRef.current = { type: "", content: "" };

    try {
      await agent({
        input: trimmed,
        callbacks: {
          onThink: (chunk: string, complete?: boolean) =>
            appendStep("thought", chunk, complete),
          onObserve: (chunk: string, complete?: boolean) =>
            appendStep("observation", chunk, complete),
          onAnswer: (chunk: string, complete?: boolean) =>
            appendStep("answer", chunk, complete),
          onExplain,
          onError: (err: string) => setError(err),
        },
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setIsQuerying(false);
    }
  }, [agent, isQuerying, onExplain, appendStep]);

  return { query, steps, isQuerying, error };
}
