import { useState } from "react";
import {
  SimpleRawGraphView,
  RawGraphWithDetail,
  RawGraphWithSearch,
  RawGraphExplorer,
  ModeSelector,
  SectionLabel,
  text,
  border,
  palette,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

type GraphMode = "simple" | "detail" | "search" | "full";

const modes = [
  { key: "simple", label: "Simple" },
  { key: "detail", label: "Detail Panel" },
  { key: "search", label: "Search" },
  { key: "full", label: "Full Explorer" },
];

const modeDescriptions: Record<GraphMode, string> = {
  simple: "Just the graph canvas — wire your own UI around it.",
  detail: "Graph with a detail panel for inspecting node properties.",
  search: "Graph with search to find and add entities.",
  full: "Full explorer with search, detail panel, and toolbar.",
};

/**
 * Schema-Free Graph Navigator — demonstrates all 4 composition levels.
 */
export function RawGraphPage() {
  const [mode, setMode] = useState<GraphMode>("full");

  return (
    <>
      {/* Mode selector bar */}
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <SectionLabel>VIEW</SectionLabel>
        <ModeSelector
          modes={modes}
          activeMode={mode}
          onChange={(key) => setMode(key as GraphMode)}
          color={palette.cyan}
        />
        <span style={{
          fontSize: 11,
          color: text.subtle,
          fontStyle: "italic",
          marginLeft: 8,
        }}>
          {modeDescriptions[mode]}
        </span>
      </div>

      {/* Active view */}
      {mode === "simple" && <SimpleRawGraphView />}
      {mode === "detail" && <RawGraphWithDetail />}
      {mode === "search" && <RawGraphWithSearch />}
      {mode === "full" && <RawGraphExplorer />}

      <DevPanel
        explanation="This page demonstrates 4 levels of composition for schema-free graph navigation. All use the same Tier 1 hooks — the difference is which Tier 2 pieces they include. Use the selector above to switch."
        codeSamples={[
          {
            label: "Option 1: Simple (just the canvas)",
            code: `import { SimpleRawGraphView } from "@trustgraph/trustkit";

<SimpleRawGraphView
  onNodeSelect={(node) => console.log(node)}
/>`,
          },
          {
            label: "Option 2: With detail panel",
            code: `import { RawGraphWithDetail } from "@trustgraph/trustkit";

<RawGraphWithDetail />`,
          },
          {
            label: "Option 3: With search",
            code: `import { RawGraphWithSearch } from "@trustgraph/trustkit";

<RawGraphWithSearch />`,
          },
          {
            label: "Option 4: Full explorer",
            code: `import { RawGraphExplorer } from "@trustgraph/trustkit";

<RawGraphExplorer />`,
          },
          {
            label: "Custom: Tier 1 + Tier 2",
            code: `import {
  useRawGraphState,
  RawGraphCanvas,
  RawNodeDetailPanel,
  RawNodeSearch,
} from "@trustgraph/trustkit";

function MyGraph() {
  const {
    visibleNodes, visibleEdges, centerUri,
    selectedNode, highlightedNodes,
    searchNodes, handleNodeClick,
    handleNodeNavigate, handleSearchSelect,
  } = useRawGraphState();

  return (
    <div style={{ display: "flex" }}>
      <RawNodeSearch
        searchNodes={searchNodes}
        onSelect={handleSearchSelect}
      />
      <RawGraphCanvas
        nodes={visibleNodes}
        edges={visibleEdges}
        centerUri={centerUri}
        highlightedNodes={highlightedNodes}
        activePredicate={null}
        onNodeClick={handleNodeClick}
        onNodeNavigate={handleNodeNavigate}
      />
      {selectedNode && (
        <RawNodeDetailPanel
          uri={selectedNode.id}
          nodeColor={selectedNode.color}
        />
      )}
    </div>
  );
}`,
          },
        ]}
        components={[
          { name: "RawGraphExplorer", tier: "3", description: "Full explorer: search + canvas + detail" },
          { name: "RawGraphWithSearch", tier: "3", description: "Canvas + search panel" },
          { name: "RawGraphWithDetail", tier: "3", description: "Canvas + detail panel" },
          { name: "SimpleRawGraphView", tier: "3", description: "Just the canvas" },
          { name: "RawGraphCanvas", tier: "2", description: "Force-directed SVG graph renderer" },
          { name: "RawNodeDetailPanel", tier: "2", description: "Node properties and relationships" },
          { name: "RawNodeSearch", tier: "2", description: "Entity search panel" },
        ]}
        hooks={[
          { name: "useRawGraphData", tier: "1", description: "On-demand triple fetcher with incremental cache" },
          { name: "useRawGraphState", tier: "1", description: "Shared state: selection, navigation, highlighting" },
          { name: "useNodeDetail", tier: "1", description: "Fresh detail fetch for a single node" },
        ]}
      />
    </>
  );
}
