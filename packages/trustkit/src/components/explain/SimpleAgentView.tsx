import { useState, useCallback } from "react";
import { SearchInput, SectionLabel, Toolbar, EmptyState } from "../common";
import { AgentStepList } from "./AgentStepList";
import { useAgent } from "../../hooks/useAgent";
import { palette } from "../../theme";
import { COLLECTION } from "../../config";

interface SimpleAgentViewProps {
  collection?: string;
}

/**
 * Simple Agent Query — no explainability.
 * Just a query input and the agent's reasoning steps.
 */
export function SimpleAgentView({ collection = COLLECTION }: SimpleAgentViewProps) {
  const [input, setInput] = useState("");

  const { query, steps, isQuerying, error } = useAgent({ collection });

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    setInput("");
    query(q);
  }, [query, isQuerying]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      <Toolbar>
        <SectionLabel marginBottom={12}>AGENT QUERY</SectionLabel>
        <SearchInput
          value={input}
          onChange={setInput}
          onSubmit={() => handleSubmit(input)}
          placeholder="Ask a question..."
          buttonText="Ask"
          isLoading={isQuerying}
          buttonColor={palette.amber}
        />
      </Toolbar>

      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
        {steps.length === 0 && !isQuerying && !error && (
          <EmptyState message="Ask a question to see the agent reason step by step." />
        )}

        <AgentStepList
          steps={steps}
          isQuerying={isQuerying}
          error={error}
        />
      </div>
    </div>
  );
}
