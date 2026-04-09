import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRawGraphData } from "../../hooks/useRawGraphData";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas } from "./RawGraphCanvas";
import { RawNodeDetailPanel } from "./RawNodeDetailPanel";
import { SplitPane, LoadingState } from "../common";
import { text, palette, border, surface } from "../../theme";

interface RawGraphExplorerProps {
  startUri?: string;
  onNodeSelect?: (node: RawNode | null) => void;
}

export function RawGraphExplorer({ startUri, onNodeSelect }: RawGraphExplorerProps) {
  const {
    nodes, edges, isFetching, isError, error,
    fetchNeighbourhood, resetCache, findStartNode, searchNodes,
  } = useRawGraphData();

  const [centerUri, setCenterUri] = useState<string | null>(startUri || null);
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);
  const [activePredicate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RawNode[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fetchedInitial = useRef(false);

  // Pending selection — set when navigating, resolved when data arrives
  const [pendingSelectUri, setPendingSelectUri] = useState<string | null>(null);

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

  // Build search index when search panel opens
  useEffect(() => {
    if (showSearch && !searchReady) {
      searchNodes("").then(() => setSearchReady(true));
    }
  }, [showSearch, searchReady, searchNodes]);

  // Update results when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (!searchReady) return;
    searchNodes(searchQuery).then(setSearchResults);
  }, [searchQuery, searchReady, searchNodes]);

  // Focus search input when panel opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  const visibleNodes = useMemo(() => Array.from(nodes.values()), [nodes]);
  const visibleEdges = edges;

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

  // Navigate to a node
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

  const handleNodeClick = useCallback((node: RawNode) => {
    // Always look up from the nodes map for the freshest data
    const fresh = nodes.get(node.id) || node;
    setSelectedNode(prev => prev?.id === node.id ? null : fresh);
    onNodeSelect?.(fresh);
  }, [onNodeSelect, nodes]);

  const handleClose = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Search select: add node to graph, keep panel open
  const handleSearchSelect = useCallback((node: RawNode) => {
    setCenterUri(node.id);
    setPendingSelectUri(node.id);
    fetchNeighbourhood(node.id);
  }, [fetchNeighbourhood]);

  // URI paste
  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    if (q.startsWith("http://") || q.startsWith("https://")) {
      setCenterUri(q);
      setPendingSelectUri(q);
      fetchNeighbourhood(q);
    }
  }, [searchQuery, fetchNeighbourhood]);

  // Reset: clear everything
  const handleReset = useCallback(() => {
    resetCache();
    setCenterUri(null);
    setSelectedNode(null);
    setPendingSelectUri(null);
    onNodeSelect?.(null);
  }, [resetCache, onNodeSelect]);

  if (initialLoading) return <LoadingState />;
  if (isError) return <LoadingState variant="error" message={error?.message || "Failed to load graph"} />;

  // The search panel content
  const searchPanel = showSearch ? (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search input */}
      <div style={{ marginBottom: 12 }}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchSubmit();
            if (e.key === "Escape") setShowSearch(false);
          }}
          placeholder="Search..."
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: `1px solid ${border.default}`,
            background: surface.card,
            color: text.primary,
            fontSize: 13,
            fontFamily: "'IBM Plex Sans', sans-serif",
            outline: "none",
          }}
        />
      </div>

      {/* Stats */}
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        color: text.hint,
        marginBottom: 12,
        padding: "0 2px",
      }}>
        {stats}
      </div>

      {/* Loading indicator */}
      {(isFetching || (!searchReady && searchQuery)) && (
        <div style={{
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: palette.amber,
          marginBottom: 8,
          padding: "0 2px",
        }}>
          loading...
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {searchResults.map((node) => (
          <button
            key={node.id}
            onClick={() => handleSearchSelect(node)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              marginBottom: 2,
              borderRadius: 6,
              border: "1px solid transparent",
              background: "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = surface.cardHover;
              e.currentTarget.style.borderColor = `${node.color}44`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <div style={{
              fontSize: 12,
              color: node.color,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              {node.label}
            </div>
          </button>
        ))}
        {searchQuery && searchReady && searchResults.length === 0 && (
          <div style={{
            padding: "20px 4px",
            fontSize: 12,
            color: text.hint,
            fontStyle: "italic",
          }}>
            {searchQuery.startsWith("http") ? "Press Enter to navigate to this URI" : "No matches"}
          </div>
        )}
        {!searchQuery && (
          <div style={{
            padding: "20px 4px",
            fontSize: 12,
            color: text.hint,
            fontStyle: "italic",
            lineHeight: 1.6,
          }}>
            Type to search for entities in the graph
          </div>
        )}
      </div>
    </div>
  ) : null;

  // The detail panel content
  const detailPanel = selectedNode ? (
    <RawNodeDetailPanel
      node={selectedNode}
      edges={visibleEdges}
      nodes={nodes}
      onClose={handleClose}
      onNodeNavigate={handleNodeNavigate}
    />
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      {/* Minimal toolbar: just the search toggle */}
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: `1px solid ${showSearch ? palette.cyan + "44" : border.default}`,
            background: showSearch ? `${palette.cyan}1a` : "transparent",
            color: showSearch ? palette.cyan : text.subtle,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ⌕ Search
        </button>

        {visibleNodes.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: `1px solid ${border.default}`,
              background: "transparent",
              color: text.faint,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}

        {isFetching && !showSearch && (
          <span style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: palette.amber,
          }}>
            loading...
          </span>
        )}

        <div style={{ flex: 1 }} />

        <span style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.hint,
        }}>
          {stats}
        </span>
      </div>

      {/* Graph + side panels */}
      <SplitPane
        height="calc(100vh - 160px)"
        panelSide="left"
        panelBorder
        panel={searchPanel}
      >
        <SplitPane
          height="100%"
          panelSide="right"
          panelBorder
          panel={detailPanel}
        >
          {visibleNodes.length > 0 ? (
            <RawGraphCanvas
              nodes={visibleNodes}
              edges={visibleEdges}
              centerUri={centerUri}
              highlightedNodes={highlightedNodes}
              activePredicate={activePredicate}
              onNodeClick={handleNodeClick}
              onNodeNavigate={handleNodeNavigate}
            />
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: text.hint,
              fontSize: 13,
              fontStyle: "italic",
            }}>
              Open search to find entities
            </div>
          )}
        </SplitPane>
      </SplitPane>
    </div>
  );
}
