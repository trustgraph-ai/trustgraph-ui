import { RawGraphExplorer } from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

/**
 * Schema-Free Graph Navigator — explores raw triple graphs without
 * ontology assumptions. Fetches neighbourhood data on demand as the
 * user navigates, with force-directed layout.
 */
export function RawGraphPage() {
  return (
    <>
      <RawGraphExplorer />
      <DevPanel
        explanation="This view uses the RawGraphExplorer composite to navigate graphs that have no OWL schema. It fetches triple data on demand as you explore — double-click a node or click a relationship in the detail panel to expand its neighbourhood. The graph grows incrementally as you navigate."
        codeSamples={[
          {
            label: "Minimal integration",
            code: `import { RawGraphExplorer } from "@trustgraph/trustkit";

function MyRawGraphPage() {
  return <RawGraphExplorer />;
}`,
          },
          {
            label: "With a starting URI",
            code: `import { RawGraphExplorer } from "@trustgraph/trustkit";

function MyRawGraphPage() {
  return (
    <RawGraphExplorer
      startUri="http://example.org/entity/123"
      onNodeSelect={(node) => {
        console.log("Selected:", node?.label);
      }}
    />
  );
}`,
          },
          {
            label: "Custom view using Tier 1 + Tier 2",
            code: `import {
  useRawGraphData,
  RawGraphCanvas,
} from "@trustgraph/trustkit";
import { useEffect, useState } from "react";

function CustomRawGraph() {
  const [center, setCenter] = useState(null);
  const { nodes, edges, fetchNeighbourhood }
    = useRawGraphData();

  useEffect(() => {
    fetchNeighbourhood("http://example.org/start");
    setCenter("http://example.org/start");
  }, []);

  return (
    <RawGraphCanvas
      nodes={Array.from(nodes.values())}
      edges={edges}
      centerUri={center}
      highlightedNodes={[]}
      activePredicate={null}
      onNodeClick={(n) => console.log(n)}
      onNodeNavigate={async (uri) => {
        await fetchNeighbourhood(uri);
        setCenter(uri);
      }}
    />
  );
}`,
          },
        ]}
        components={[
          { name: "RawGraphExplorer", tier: "3", description: "Self-contained schema-free graph explorer" },
          { name: "RawGraphCanvas", tier: "2", description: "Force-directed SVG graph renderer" },
          { name: "RawNodeDetailPanel", tier: "2", description: "Raw triple detail panel" },
          { name: "FilterBar", tier: "2", description: "Predicate filter chips" },
          { name: "SplitPane", tier: "2", description: "Main content + side panel layout" },
        ]}
        hooks={[
          { name: "useRawGraphData", tier: "1", description: "On-demand triple fetcher with incremental cache" },
        ]}
      />
    </>
  );
}
