import { AgentConsole } from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

export function AgentConfigPage() {
  return (
    <>
      <AgentConsole />
      <DevPanel
        explanation="The Agent Console is a single workbench for managing all agent configuration: patterns, task types, tools, MCP tools, and tool services. The bottom strip lets you test the agent against the current configuration with a simple question + answer flow. Single-step debugging and per-tool invocation will land once the backend supports them."
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
  AgentTestStrip,
  useConfigItems,
} from "@trustgraph/trustkit";

function MyAgentUI() {
  const [selected, setSelected] = useState(null);
  return (
    <div>
      <ConfigSidebar selected={selected} onSelect={setSelected} />
      <ConfigEditor selected={selected} />
      <AgentTestStrip />
    </div>
  );
}`,
          },
        ]}
        components={[
          { name: "AgentConsole", tier: "3", description: "Full agent config workbench" },
          { name: "ConfigSidebar", tier: "2", description: "Grouped list of all config types" },
          { name: "ConfigEditor", tier: "2", description: "Editor that adapts to the selected config kind" },
          { name: "AgentTestStrip", tier: "2", description: "Bottom strip for invoking the agent" },
        ]}
        hooks={[
          { name: "useConfigItems", tier: "1", description: "List config items for a given type" },
          { name: "useConfigItem", tier: "1", description: "Fetch and save a single config item" },
          { name: "useAgent", tier: "1", description: "Streaming agent invocation" },
        ]}
      />
    </>
  );
}
