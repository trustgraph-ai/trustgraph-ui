import { useState } from "react";
import {
  SimpleRawGraphView,
  RawGraphWithDetail,
  RawGraphWithSearch,
  RawGraphExplorer,
  RawGraphExplorer3D,
  ModeSelector,
  SectionLabel,
  PageGuidance,
  GuidanceSlot,
  useTheme,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

type GraphMode = "simple" | "detail" | "search" | "full" | "3d";

const modes = [
  { key: "simple", label: "Simple" },
  { key: "detail", label: "Detail Panel" },
  { key: "search", label: "Search" },
  { key: "full", label: "Full Explorer" },
  { key: "3d", label: "3D" },
];

const modeDescriptions: Record<GraphMode, string> = {
  simple: "Just the graph canvas — wire your own UI around it.",
  detail: "Graph with a detail panel for inspecting node properties.",
  search: "Graph with search to find and add entities.",
  full: "Full explorer with search, detail panel, and toolbar.",
  "3d": "3D force-directed graph with perspective projection.",
};

/**
 * Schema-Free Graph Navigator — demonstrates all 4 composition levels.
 */
export function RawGraphPage() {
  const [mode, setMode] = useState<GraphMode>("full");
  const { theme, sz } = useTheme();

  return (
    <PageGuidance pageKey="graph-explorer">
      {/* Mode selector bar */}
      <div style={{
        padding: `${sz(10)}px ${sz(28)}px`,
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: sz(16),
      }}>
        <SectionLabel>VIEW</SectionLabel>
        <ModeSelector
          modes={modes}
          activeMode={mode}
          onChange={(key) => setMode(key as GraphMode)}
          color={theme.palette.cyan}
        />
        <span style={{
          fontSize: sz(11),
          color: theme.text.subtle,
          fontStyle: "italic",
          marginLeft: sz(8),
        }}>
          {modeDescriptions[mode]}
        </span>
      </div>

      {/* Active view */}
      <div style={{ position: "relative", flex: 1 }}>
        <div style={{ position: "absolute", top: "3.5em", left: 28, zIndex: 100 }}>
          <GuidanceSlot id="welcome" buttonOffset={{ top: 0, left: 0 }} />
        </div>
        {mode === "simple" && <SimpleRawGraphView />}
        {mode === "detail" && <RawGraphWithDetail />}
        {mode === "search" && <RawGraphWithSearch />}
        {mode === "full" && <RawGraphExplorer />}
        {mode === "3d" && <RawGraphExplorer3D />}
      </div>

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
            label: "Option 5: 3D explorer",
            code: `import { RawGraphExplorer3D } from "@trustgraph/trustkit";

<RawGraphExplorer3D />`,
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
          { name: "RawGraphExplorer3D", tier: "3", description: "Full 3D explorer: search + 3D canvas + detail" },
          { name: "RawGraphExplorer", tier: "3", description: "Full explorer: search + canvas + detail" },
          { name: "RawGraphWithSearch", tier: "3", description: "Canvas + search panel" },
          { name: "RawGraphWithDetail", tier: "3", description: "Canvas + detail panel" },
          { name: "SimpleRawGraphView", tier: "3", description: "Just the canvas" },
          { name: "RawGraphCanvas", tier: "2", description: "2D force-directed SVG graph renderer" },
          { name: "RawGraphCanvas3D", tier: "2", description: "3D force-directed graph with perspective projection" },
          { name: "RawNodeDetailPanel", tier: "2", description: "Node properties and relationships" },
          { name: "RawNodeSearch", tier: "2", description: "Entity search panel" },
        ]}
        hooks={[
          { name: "useRawGraphData", tier: "1", description: "On-demand triple fetcher with incremental cache" },
          { name: "useRawGraphState", tier: "1", description: "Shared state: selection, navigation, highlighting" },
          { name: "useNodeDetail", tier: "1", description: "Fresh detail fetch for a single node" },
        ]}
      />
    </PageGuidance>
  );
}
