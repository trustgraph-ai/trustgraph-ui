import { useRawGraphState } from "../../hooks/useRawGraphState";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas } from "./RawGraphCanvas";
import { RawNodeDetailPanel } from "./RawNodeDetailPanel";
import { SplitPane, LoadingState } from "../common";

interface RawGraphWithDetailProps {
  startUri?: string;
  onNodeSelect?: (node: RawNode | null) => void;
}

/**
 * Raw graph with a detail panel on the right. Click a node to see
 * its properties and relationships. No search panel.
 */
export function RawGraphWithDetail({ startUri, onNodeSelect }: RawGraphWithDetailProps) {
  const {
    visibleNodes, visibleEdges, centerUri, selectedNode, highlightedNodes,
    initialLoading, isError, error,
    handleNodeClick, handleNodeNavigate, handleClose,
  } = useRawGraphState({ startUri, onNodeSelect });

  if (initialLoading) return <LoadingState />;
  if (isError) return <LoadingState variant="error" message={error?.message || "Failed to load graph"} />;

  const detailPanel = selectedNode ? (
    <RawNodeDetailPanel
      uri={selectedNode.id}
      nodeColor={selectedNode.color}
      onClose={handleClose}
      onNodeNavigate={handleNodeNavigate}
    />
  ) : null;

  return (
    <SplitPane
      height="calc(100vh - 110px)"
      panelSide="right"
      panelBorder
      panel={detailPanel}
    >
      <RawGraphCanvas
        nodes={visibleNodes}
        edges={visibleEdges}
        centerUri={centerUri}
        highlightedNodes={highlightedNodes}
        activePredicate={null}
        onNodeClick={handleNodeClick}
        onNodeNavigate={handleNodeNavigate}
      />
    </SplitPane>
  );
}
