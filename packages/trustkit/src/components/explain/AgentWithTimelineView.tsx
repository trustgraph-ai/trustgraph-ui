import { useState, useCallback } from "react";
import { SearchInput, SearchPreset, SectionLabel, Toolbar, EmptyState } from "../common";
import { AgentStepList } from "./AgentStepList";
import { ExplainTimeline } from "./ExplainTimeline";
import { useAgent } from "../../hooks/useAgent";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import { palette, border } from "../../theme";
import { useSettings } from "@trustgraph/react-state";

interface AgentWithTimelineViewProps {
  collection?: string;
  presets?: SearchPreset[];
}

/**
 * Agent Query with Explain Timeline.
 * Agent reasoning steps on the left, event timeline on the right
 * with document-level sources.
 */
export function AgentWithTimelineView({ collection: collectionProp, presets }: AgentWithTimelineViewProps) {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");

  const explainSession = useExplainSession();
  const { query, steps, isQuerying, error } = useAgent({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession]);

  return (
    <div style={{ display: "flex", height: "var(--page-height)" }}>
      {/* Left: Query + Agent Steps */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${border.default}` }}>
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
            <EmptyState message="Ask a question to see agent reasoning with live explainability." />
          )}

          <AgentStepList
            steps={steps}
            isQuerying={isQuerying}
            error={error}
          />
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
