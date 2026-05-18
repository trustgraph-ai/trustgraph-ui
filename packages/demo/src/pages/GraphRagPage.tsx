import { useState } from "react";
import {
  SimpleRagView,
  RagWithSourcesView,
  RagWithTimelineView,
  RagExplainView,
  RagFullExplainView,
  ModeSelector,
  SectionLabel,
  text,
  border,
  palette,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

type RagOption = "simple" | "sources" | "timeline" | "explain" | "full";

const modes = [
  { key: "simple", label: "Simple" },
  { key: "sources", label: "Sources" },
  { key: "timeline", label: "Timeline" },
  { key: "explain", label: "Split + Graph" },
  { key: "full", label: "Full DAG" },
];

const optionDescriptions: Record<RagOption, string> = {
  simple: "No explainability — just a question and an answer.",
  sources: "Answer with source citations in a side panel.",
  timeline: "Live event timeline with document-level sources.",
  explain: "Provenance graph + timeline with full source chains.",
  full: "Full DAG visualization with click-to-inspect detail.",
};

/**
 * Graph RAG Query workflow — demonstrates all 5 explainability options.
 */
export function GraphRagPage() {
  const [option, setOption] = useState<RagOption>("explain");

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
          onChange={(key) => setOption(key as RagOption)}
          color={palette.cyan}
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
      {option === "simple" && <SimpleRagView />}
      {option === "sources" && <RagWithSourcesView />}
      {option === "timeline" && <RagWithTimelineView />}
      {option === "explain" && <RagExplainView />}
      {option === "full" && <RagFullExplainView />}

      <DevPanel
        explanation="This page demonstrates 5 levels of explainability, from no explain (SimpleRagView) to full DAG visualization (RagFullExplainView). All 5 use the same Tier 1 hooks — the difference is which Tier 2 pieces they compose. Use the selector above to switch between them."
        codeSamples={[
          {
            label: "Option 1: Simple (no explainability)",
            code: `import { SimpleRagView } from "@trustgraph/trustkit";

<SimpleRagView />`,
          },
          {
            label: "Option 2: With source citations",
            code: `import { RagWithSourcesView } from "@trustgraph/trustkit";

<RagWithSourcesView />`,
          },
          {
            label: "Option 3: Timeline with document sources",
            code: `import { RagWithTimelineView } from "@trustgraph/trustkit";

<RagWithTimelineView />`,
          },
          {
            label: "Option 4: Split view with provenance graph",
            code: `import { RagExplainView } from "@trustgraph/trustkit";

<RagExplainView />`,
          },
          {
            label: "Option 5: Full explainability DAG",
            code: `import { RagFullExplainView } from "@trustgraph/trustkit";

<RagFullExplainView />`,
          },
        ]}
        components={[
          { name: "SimpleRagView", tier: "3", description: "Query + response, no explain" },
          { name: "RagWithSourcesView", tier: "3", description: "Query + response + source citations" },
          { name: "RagWithTimelineView", tier: "3", description: "Query + response + event timeline" },
          { name: "RagExplainView", tier: "3", description: "Split view with provenance graph" },
          { name: "RagFullExplainView", tier: "3", description: "Full DAG with click-to-inspect" },
          { name: "StreamingResponse", tier: "2", description: "Streaming LLM response display" },
          { name: "ExplainEventCard", tier: "2", description: "Single explain event card" },
          { name: "ExplainTimeline", tier: "2", description: "Scrollable event timeline" },
          { name: "SourceLinkBadge", tier: "2", description: "Clickable source reference" },
          { name: "SourcePanel", tier: "2", description: "Document chunk text viewer" },
        ]}
        hooks={[
          { name: "useGraphRag", tier: "1", description: "Executes Graph RAG with streaming + explain" },
          { name: "useExplainSession", tier: "1", description: "Manages explain event stream" },
          { name: "useExplainEventFetcher", tier: "1", description: "Fetches + parses explain triples with provenance" },
          { name: "useExplainGraph", tier: "1", description: "Derives provenance graph from events" },
          { name: "useSourceDocument", tier: "1", description: "Fetches document chunk text" },
        ]}
      />
    </>
  );
}
