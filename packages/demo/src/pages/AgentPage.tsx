import { useState } from "react";
import {
  SimpleAgentView,
  AgentWithTimelineView,
  AgentExplainView,
  AgentFullExplainView,
  ModeSelector,
  SectionLabel,
  text,
  border,
  palette,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

type AgentOption = "simple" | "timeline" | "explain" | "full";

const modes = [
  { key: "simple", label: "Simple" },
  { key: "timeline", label: "Timeline" },
  { key: "explain", label: "Split + Graph" },
  { key: "full", label: "Full DAG" },
];

const optionDescriptions: Record<AgentOption, string> = {
  simple: "Agent reasoning steps with no explainability.",
  timeline: "Agent steps with live event timeline.",
  explain: "Agent steps with provenance graph + timeline with full source chains.",
  full: "Full DAG visualization with click-to-inspect detail.",
};

/**
 * Agent Query workflow — demonstrates all 4 explainability options
 * for the agent's ReAct-style reasoning loop.
 */
export function AgentPage() {
  const [option, setOption] = useState<AgentOption>("explain");

  return (
    <>
      {/* Option selector bar */}
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <SectionLabel>EXPLAINABILITY</SectionLabel>
        <ModeSelector
          modes={modes}
          activeMode={option}
          onChange={(key) => setOption(key as AgentOption)}
          color={palette.amber}
        />
        <span style={{
          fontSize: 11,
          color: text.subtle,
          fontStyle: "italic",
          marginLeft: 8,
        }}>
          {optionDescriptions[option]}
        </span>
      </div>

      {/* Active view */}
      {option === "simple" && <SimpleAgentView />}
      {option === "timeline" && <AgentWithTimelineView />}
      {option === "explain" && <AgentExplainView />}
      {option === "full" && <AgentFullExplainView />}

      <DevPanel
        explanation="This page demonstrates 4 levels of explainability for agent queries. The agent runs a ReAct-style loop with multiple thought/observation steps before a final answer. All views use the same useAgent hook — the difference is which explainability components they compose."
        codeSamples={[
          {
            label: "Option 1: Simple (no explainability)",
            code: `import { SimpleAgentView } from "@trustgraph/trustkit";

<SimpleAgentView />`,
          },
          {
            label: "Option 2: With event timeline",
            code: `import { AgentWithTimelineView } from "@trustgraph/trustkit";

<AgentWithTimelineView />`,
          },
          {
            label: "Option 3: Split view with provenance graph",
            code: `import { AgentExplainView } from "@trustgraph/trustkit";

<AgentExplainView />`,
          },
          {
            label: "Option 4: Full explainability DAG",
            code: `import { AgentFullExplainView } from "@trustgraph/trustkit";

<AgentFullExplainView />`,
          },
        ]}
        components={[
          { name: "SimpleAgentView", tier: "3", description: "Agent steps, no explain" },
          { name: "AgentWithTimelineView", tier: "3", description: "Agent steps + event timeline" },
          { name: "AgentExplainView", tier: "3", description: "Agent steps + provenance graph" },
          { name: "AgentFullExplainView", tier: "3", description: "Agent steps + full DAG" },
          { name: "AgentStepCard", tier: "2", description: "Single thought/observation/answer step" },
          { name: "AgentStepList", tier: "2", description: "Scrollable list of agent steps" },
          { name: "ExplainEventCard", tier: "2", description: "Single explain event card" },
          { name: "ExplainTimeline", tier: "2", description: "Scrollable event timeline" },
          { name: "SourceLinkBadge", tier: "2", description: "Clickable source reference" },
          { name: "SourcePanel", tier: "2", description: "Document chunk text viewer" },
        ]}
        hooks={[
          { name: "useAgent", tier: "1", description: "Executes agent query with streaming steps + explain" },
          { name: "useExplainSession", tier: "1", description: "Manages explain event stream" },
          { name: "useExplainEventFetcher", tier: "1", description: "Fetches + parses explain triples with provenance" },
          { name: "useExplainGraph", tier: "1", description: "Derives provenance graph from events" },
          { name: "useSourceDocument", tier: "1", description: "Fetches document chunk text" },
        ]}
      />
    </>
  );
}
