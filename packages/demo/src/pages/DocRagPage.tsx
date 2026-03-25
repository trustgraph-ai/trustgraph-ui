import { useState } from "react";
import {
  SimpleDocRagView,
  DocRagExplainView,
  DocRagFullExplainView,
  ModeSelector,
  SectionLabel,
  text,
  border,
  palette,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

type DocRagOption = "simple" | "explain" | "full";

const modes = [
  { key: "simple", label: "Simple" },
  { key: "explain", label: "Timeline" },
  { key: "full", label: "Full DAG" },
];

const optionDescriptions: Record<DocRagOption, string> = {
  simple: "No explainability — just a question and an answer from documents.",
  explain: "Response with explain event timeline and source links.",
  full: "Full DAG visualization with click-to-inspect detail.",
};

/**
 * Document RAG Query workflow.
 */
export function DocRagPage() {
  const [option, setOption] = useState<DocRagOption>("explain");

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
          onChange={(key) => setOption(key as DocRagOption)}
          color={palette.purple}
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

      {option === "simple" && <SimpleDocRagView />}
      {option === "explain" && <DocRagExplainView />}
      {option === "full" && <DocRagFullExplainView />}

      <DevPanel
        explanation="Document RAG searches documents by semantic similarity and generates an answer grounded in the retrieved content. Like Graph RAG, it supports explainability — the event timeline shows the retrieval and synthesis steps."
        codeSamples={[
          {
            label: "Simple (no explainability)",
            code: `import { SimpleDocRagView } from "@trustgraph/trustkit";

<SimpleDocRagView />`,
          },
          {
            label: "With explainability",
            code: `import { DocRagExplainView } from "@trustgraph/trustkit";

<DocRagExplainView />`,
          },
          {
            label: "Custom view using hooks",
            code: `import {
  useDocumentRag,
  useExplainSession,
  useExplainEventFetcher,
  StreamingResponse,
  ExplainTimeline,
} from "@trustgraph/trustkit";

function CustomDocRagView() {
  const explain = useExplainSession();
  const { query, response, isQuerying, error }
    = useDocumentRag({
      collection: "default",
      onExplain: explain.addEvent,
    });
  useExplainEventFetcher(
    explain.events, explain.updateEvent
  );

  return (
    <div>
      <SearchInput onSubmit={() => query(input)} />
      <StreamingResponse
        text={response}
        isStreaming={isQuerying}
        error={error}
      />
      <ExplainTimeline events={explain.events} />
    </div>
  );
}`,
          },
        ]}
        components={[
          { name: "SimpleDocRagView", tier: "3", description: "Query + response, no explain" },
          { name: "DocRagExplainView", tier: "3", description: "Query + response + explain timeline" },
          { name: "StreamingResponse", tier: "2", description: "Streaming LLM response display" },
          { name: "ExplainEventCard", tier: "2", description: "Single explain event card" },
          { name: "ExplainTimeline", tier: "2", description: "Scrollable event timeline" },
          { name: "SourcePanel", tier: "2", description: "Document chunk text viewer" },
        ]}
        hooks={[
          { name: "useDocumentRag", tier: "1", description: "Executes Document RAG with streaming + explain" },
          { name: "useExplainSession", tier: "1", description: "Manages explain event stream" },
          { name: "useExplainEventFetcher", tier: "1", description: "Fetches + parses explain triples" },
          { name: "useSourceDocument", tier: "1", description: "Fetches document chunk text" },
        ]}
      />
    </>
  );
}
