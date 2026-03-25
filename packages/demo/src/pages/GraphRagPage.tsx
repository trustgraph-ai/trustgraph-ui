import { GraphRagView } from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

/**
 * Graph RAG Query workflow — uses the GraphRagView composite
 * from trustkit.
 */
export function GraphRagPage() {
  return (
    <>
      <GraphRagView />
      <DevPanel
        explanation="This view is a single GraphRagView composite. It internally wires useGraphRag (query execution + streaming), useExplainSession (event management), useExplainEventFetcher (triple fetching + parsing), and useExplainGraph (provenance visualization) into a complete Graph RAG experience."
        codeSamples={[
          {
            label: "Minimal integration",
            code: `import { GraphRagView } from "@trustgraph/trustkit";

function MyRagPage() {
  return <GraphRagView />;
}`,
          },
          {
            label: "With custom collection",
            code: `import { GraphRagView } from "@trustgraph/trustkit";

function MyRagPage() {
  return <GraphRagView collection="my-collection" />;
}`,
          },
          {
            label: "Custom view using Tier 1 + Tier 2",
            code: `import {
  useGraphRag,
  useExplainSession,
  useExplainEventFetcher,
  useExplainGraph,
  StreamingResponse,
  ExplainEventCard,
  ExplainGraph,
  SearchInput,
} from "@trustgraph/trustkit";

function CustomRagView() {
  const explain = useExplainSession();
  const { query, response, isQuerying, error }
    = useGraphRag({
      collection: "default",
      onExplain: explain.addEvent,
    });

  useExplainEventFetcher(
    explain.events, explain.updateEvent
  );
  const { graphNodes, graphEdges }
    = useExplainGraph(explain.events);

  return (
    <div>
      <SearchInput
        value={input}
        onChange={setInput}
        onSubmit={() => query(input)}
        placeholder="Ask..."
        buttonText="Query"
        isLoading={isQuerying}
      />
      <StreamingResponse
        text={response}
        isStreaming={isQuerying}
        error={error}
      />
      <ExplainGraph
        nodes={graphNodes}
        edges={graphEdges}
      />
      {explain.events.map((e, i) => (
        <ExplainEventCard
          key={e.explainId}
          eventType={e.eventType}
          data={e.data}
          loading={e.fetching}
          index={i}
        />
      ))}
    </div>
  );
}`,
          },
        ]}
        components={[
          { name: "GraphRagView", tier: "3", description: "Complete Graph RAG query + explain view" },
          { name: "StreamingResponse", tier: "2", description: "Renders streaming LLM response with status" },
          { name: "ExplainEventCard", tier: "2", description: "Single explain event with type-appropriate content" },
          { name: "ExplainGraph", tier: "2", description: "Provenance graph visualization" },
          { name: "SearchInput", tier: "2", description: "Text input with action button" },
        ]}
        hooks={[
          { name: "useGraphRag", tier: "1", description: "Executes Graph RAG with streaming + explain callbacks" },
          { name: "useExplainSession", tier: "1", description: "Manages explain event stream and state" },
          { name: "useExplainEventFetcher", tier: "1", description: "Auto-fetches and parses explain event triples" },
          { name: "useExplainGraph", tier: "1", description: "Derives provenance graph from explain events" },
        ]}
      />
    </>
  );
}
