/**
 * Shared state management for raw graph composites.
 * Wraps useRawGraphData with common state: center URI, selected node,
 * visible nodes/edges, highlighting, and navigation handlers.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRawGraphData } from "./useRawGraphData";
import type { RawNode } from "./useRawGraphData";

interface UseRawGraphStateOptions {
  startUri?: string;
  onNodeSelect?: (node: RawNode | null) => void;
}

export function useRawGraphState({ startUri, onNodeSelect }: UseRawGraphStateOptions = {}) {
  const graphData = useRawGraphData();
  const { nodes, edges, fetchNeighbourhood, resetCache, findStartNode } = graphData;

  const [centerUri, setCenterUri] = useState<string | null>(startUri || null);
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);
  const [pendingSelectUri, setPendingSelectUri] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchedInitial = useRef(false);

  // Fetch initial neighbourhood
  useEffect(() => {
    if (fetchedInitial.current) return;
    fetchedInitial.current = true;

    (async () => {
      const uri = startUri || await findStartNode();
      if (uri) {
        setCenterUri(uri);
        await fetchNeighbourhood(uri);
      }
      setInitialLoading(false);
    })();
  }, [startUri, fetchNeighbourhood, findStartNode]);

  // Visible nodes/edges are the full cache
  const visibleNodes = useMemo(() => Array.from(nodes.values()), [nodes]);
  const visibleEdges = edges;

  // Highlighted nodes: selected + direct connections
  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const ids = [selectedNode.id];
    for (const edge of visibleEdges) {
      if (edge.from === selectedNode.id) ids.push(edge.to);
      if (edge.to === selectedNode.id) ids.push(edge.from);
    }
    return ids;
  }, [selectedNode, visibleEdges]);

  const stats = `${visibleNodes.length} nodes · ${visibleEdges.length} edges`;

  // Navigate to a node: fetch neighbourhood, select it
  const handleNodeNavigate = useCallback((uri: string) => {
    setCenterUri(uri);
    setPendingSelectUri(uri);
    fetchNeighbourhood(uri);
  }, [fetchNeighbourhood]);

  // Resolve pending selection after fetches
  useEffect(() => {
    if (pendingSelectUri && nodes.has(pendingSelectUri)) {
      const node = nodes.get(pendingSelectUri)!;
      setSelectedNode(node);
      onNodeSelect?.(node);
      setPendingSelectUri(null);
    } else if (selectedNode && nodes.has(selectedNode.id)) {
      const updated = nodes.get(selectedNode.id)!;
      if (updated !== selectedNode) {
        setSelectedNode(updated);
      }
    }
  }, [nodes, pendingSelectUri, selectedNode, onNodeSelect]);

  // Click a node on the canvas
  const handleNodeClick = useCallback((node: RawNode) => {
    const fresh = nodes.get(node.id) || node;
    setSelectedNode(prev => prev?.id === node.id ? null : fresh);
    onNodeSelect?.(fresh);
  }, [onNodeSelect, nodes]);

  // Close detail panel
  const handleClose = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Search select: add to graph
  const handleSearchSelect = useCallback((node: RawNode) => {
    setCenterUri(node.id);
    setPendingSelectUri(node.id);
    fetchNeighbourhood(node.id);
  }, [fetchNeighbourhood]);

  // Reset graph
  const handleReset = useCallback(() => {
    resetCache();
    setCenterUri(null);
    setSelectedNode(null);
    setPendingSelectUri(null);
    onNodeSelect?.(null);
  }, [resetCache, onNodeSelect]);

  return {
    ...graphData,
    centerUri,
    selectedNode,
    visibleNodes,
    visibleEdges,
    highlightedNodes,
    stats,
    initialLoading,
    handleNodeClick,
    handleNodeNavigate,
    handleSearchSelect,
    handleClose,
    handleReset,
  };
}
