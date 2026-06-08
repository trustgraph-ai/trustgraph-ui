import { useState, useCallback } from "react";
import { SearchInput, SearchPreset, SectionLabel, Toolbar, EmptyState } from "../common";
import { AgentStepList } from "./AgentStepList";
import { useAgent } from "../../hooks/useAgent";
import { palette } from "../../theme";
import { useSettings } from "@trustgraph/react-state";

interface SimpleAgentViewProps {
  collection?: string;
  presets?: SearchPreset[];
}

/**
 * Simple Agent Query — no explainability.
 * Just a query input and the agent's reasoning steps.
 */
export function SimpleAgentView({ collection: collectionProp, presets }: SimpleAgentViewProps) {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");

  const { query, steps, isQuerying, error } = useAgent({ collection });

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    setInput("");
    query(q);
  }, [query, isQuerying]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
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
          presets={presets}
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
