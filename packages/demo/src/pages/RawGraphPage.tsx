import { RawGraphExplorer } from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

/**
 * Schema-Free Graph Navigator — explores raw triple graphs without
 * ontology assumptions. Uses neighbourhood-based exploration with
 * force-directed layout.
 */
export function RawGraphPage() {
  return (
    <>
      <RawGraphExplorer />
      <DevPanel
        explanation="This view uses the RawGraphExplorer composite to navigate graphs that have no OWL schema. It discovers nodes from raw triples, assigns colours by URI hash, uses force-directed layout, and supports neighbourhood-based exploration — double-click any node to re-centre the graph on it."
        codeSamples={[
          {
            label: "Minimal integration",
            code: `import { RawGraphExplorer } from "@trustgraph/trustkit";

function MyRawGraphPage() {
  return <RawGraphExplorer />;
}`,
          },
          {
            label: "Custom depth and selection callback",
            code: `import { RawGraphExplorer } from "@trustgraph/trustkit";

function MyRawGraphPage() {
  const handleSelect = (node) => {
    console.log("Selected:", node?.label);
  };

  return (
    <RawGraphExplorer
      depth={3}
      onNodeSelect={handleSelect}
    />
  );
}`,
          },
          {
            label: "Custom view using Tier 1 + Tier 2",
            code: `import {
  useRawGraphData,
  getNeighbourhood,
  RawGraphCanvas,
  RawNodeDetailPanel,
} from "@trustgraph/trustkit";

function CustomRawGraph() {
  const [center, setCenter] = useState(null);
  const [selected, setSelected] = useState(null);
  const { nodes, edges, startNode } = useRawGraphData();

  const centerUri = center || startNode;
  const { visibleNodes, visibleEdges } =
    getNeighbourhood(centerUri, nodes, edges, 2);

  return (
    <RawGraphCanvas
      nodes={visibleNodes}
      edges={visibleEdges}
      centerUri={centerUri}
      highlightedNodes={
        selected ? [selected.id] : []
      }
      activePredicate={null}
      onNodeClick={setSelected}
      onNodeNavigate={setCenter}
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
          { name: "useRawGraphData", tier: "1", description: "Fetches triples and builds node/edge index without schema assumptions" },
          { name: "getNeighbourhood", tier: "1", description: "Extracts visible nodes/edges by BFS from a centre node" },
        ]}
      />
    </>
  );
}
