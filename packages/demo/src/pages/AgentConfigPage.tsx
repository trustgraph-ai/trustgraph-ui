import { AgentConsole } from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

export function AgentConfigPage() {
  return (
    <>
      <AgentConsole />
      <DevPanel
        explanation="The Agent Console is a three-column workbench: config sidebar on the left, type-aware editor in the middle, and a debug panel on the right. Run agent queries and see every explain event rendered with its facets — tool decisions, candidates, token counts, latency, errors, and termination reason. The debug panel uses a predicate-driven facet renderer that handles any combination of types and degrades gracefully for unknown facets."
        codeSamples={[
          {
            label: "Drop-in console",
            code: `import { AgentConsole } from "@trustgraph/trustkit";

<AgentConsole />`,
          },
          {
            label: "Custom: hooks + pieces",
            code: `import {
  ConfigSidebar,
  ConfigEditor,
  AgentDebugPanel,
  useConfigItems,
} from "@trustgraph/trustkit";

function MyAgentUI() {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display: "flex" }}>
      <ConfigSidebar selected={selected} onSelect={setSelected} />
      <ConfigEditor selected={selected} />
      <AgentDebugPanel />
    </div>
  );
}`,
          },
          {
            label: "Standalone facet renderer",
            code: `import {
  ExplainFacetCard,
  parseExplainEvent,
} from "@trustgraph/trustkit";

// Parse inline triples from an explain event
const parsed = parseExplainEvent(
  event.explainId,
  event.explainTriples
);

// Render all facets present on the event
<ExplainFacetCard event={parsed} />`,
          },
        ]}
        components={[
          { name: "AgentConsole", tier: "3", description: "Full agent config + debug workbench" },
          { name: "ConfigSidebar", tier: "2", description: "Grouped list of all config types" },
          { name: "ConfigEditor", tier: "2", description: "Editor that adapts to the selected config kind" },
          { name: "AgentDebugPanel", tier: "2", description: "Full-height debug panel with facet event rendering" },
          { name: "ExplainFacetCard", tier: "2", description: "Predicate-driven facet renderer for explain events" },
        ]}
        hooks={[
          { name: "useConfigItems", tier: "1", description: "List config items for a given type" },
          { name: "useConfigItem", tier: "1", description: "Fetch and save a single config item" },
          { name: "useAgent", tier: "1", description: "Streaming agent invocation with explain callback" },
          { name: "parseExplainEvent", tier: "1", description: "Parse inline triples into typed facets" },
        ]}
      />
    </>
  );
}
