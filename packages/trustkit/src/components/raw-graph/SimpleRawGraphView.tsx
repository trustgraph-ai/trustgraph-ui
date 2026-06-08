import { useRawGraphState } from "../../hooks/useRawGraphState";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas } from "./RawGraphCanvas";
import { LoadingState } from "../common";

interface SimpleRawGraphViewProps {
  startUri?: string;
  onNodeSelect?: (node: RawNode | null) => void;
}

/**
 * Minimal raw graph view — just the force-directed canvas.
 * No search panel, no detail panel. The developer wires their own
 * UI around it using the onNodeSelect callback.
 */
export function SimpleRawGraphView({ startUri, onNodeSelect }: SimpleRawGraphViewProps) {
  const {
    visibleNodes, visibleEdges, centerUri, highlightedNodes,
    initialLoading, isError, error,
    handleNodeClick, handleNodeNavigate,
  } = useRawGraphState({ startUri, onNodeSelect });

  if (initialLoading) return <LoadingState />;
  if (isError) return <LoadingState variant="error" message={error?.message || "Failed to load graph"} />;

  return (
    <div style={{ height: "var(--page-height)" }}>
      <RawGraphCanvas
        nodes={visibleNodes}
        edges={visibleEdges}
        centerUri={centerUri}
        highlightedNodes={highlightedNodes}
        activePredicate={null}
        onNodeClick={handleNodeClick}
        onNodeNavigate={handleNodeNavigate}
      />
    </div>
  );
}
