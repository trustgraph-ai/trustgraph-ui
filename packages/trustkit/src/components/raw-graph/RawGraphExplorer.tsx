import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRawGraphData } from "../../hooks/useRawGraphData";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas } from "./RawGraphCanvas";
import { RawNodeDetailPanel } from "./RawNodeDetailPanel";
import { LoadingState, SplitPane, FilterBar } from "../common";
import type { FilterItem } from "../common";
import { text, palette, border } from "../../theme";

interface RawGraphExplorerProps {
  /** Initial URI to centre on (optional — auto-discovers a start node) */
  startUri?: string;
  /** Callback when a node is selected */
  onNodeSelect?: (node: RawNode | null) => void;
}

export function RawGraphExplorer({ startUri, onNodeSelect }: RawGraphExplorerProps) {
  const {
    nodes, edges, predicates, isFetching, isError, error,
    fetchNeighbourhood, resetCache, findStartNode, searchNodes,
  } = useRawGraphData();

  const [centerUri, setCenterUri] = useState<string | null>(startUri || null);
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);
  const [activePredicate, setActivePredicate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RawNode[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
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

  // Visible nodes and edges are everything in the cache
  const visibleNodes = useMemo(() => Array.from(nodes.values()), [nodes]);
  const visibleEdges = edges;

  // Highlighted nodes (selected + direct connections)
  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const ids = [selectedNode.id];
    for (const edge of visibleEdges) {
      if (edge.from === selectedNode.id) ids.push(edge.to);
      if (edge.to === selectedNode.id) ids.push(edge.from);
    }
    return ids;
  }, [selectedNode, visibleEdges]);

  // Predicate filter items
  const predicateFilters: FilterItem[] = useMemo(() => {
    const predCounts = new Map<string, number>();
    for (const edge of visibleEdges) {
      predCounts.set(edge.predicateUri, (predCounts.get(edge.predicateUri) || 0) + 1);
    }

    const items: FilterItem[] = [];
    for (const [uri, count] of predCounts) {
      const info = predicates.get(uri);
      if (info) {
        items.push({
          key: uri,
          label: `${info.label} (${count})`,
          color: info.color,
        });
      }
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [visibleEdges, predicates]);

  // Build search index when search opens, then filter synchronously
  useEffect(() => {
    if (showSearch && !searchReady) {
      // Trigger index build with empty query — the hook will cache the index
      searchNodes("").then(() => setSearchReady(true));
    }
  }, [showSearch, searchReady, searchNodes]);

  // Update results when query changes (synchronous after index is built)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (!searchReady) return;

    searchNodes(searchQuery).then(setSearchResults);
  }, [searchQuery, searchReady, searchNodes]);

  const stats = `${visibleNodes.length} nodes · ${visibleEdges.length} edges`;

  // Pending selection — set when navigating, resolved when data arrives
  const [pendingSelectUri, setPendingSelectUri] = useState<string | null>(null);

  // Navigate to a node: fetch its neighbourhood, mark it for selection
  const handleNodeNavigate = useCallback((uri: string) => {
    setCenterUri(uri);
    setPendingSelectUri(uri);
    fetchNeighbourhood(uri);
  }, [fetchNeighbourhood]);

  // Resolve pending selection and keep selectedNode fresh after fetches
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
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const handleClose = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handlePredicateFilter = useCallback((key: string | null) => {
    setActivePredicate(prev => prev === key ? null : key);
  }, []);

  // Search select: add node to the graph (don't reset)
  const handleSearchSelect = useCallback((node: RawNode) => {
    setCenterUri(node.id);
    setPendingSelectUri(node.id);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
    fetchNeighbourhood(node.id);
  }, [fetchNeighbourhood]);

  // URI paste: add to graph
  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    if (q.startsWith("http://") || q.startsWith("https://")) {
      setCenterUri(q);
      setPendingSelectUri(q);
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
      fetchNeighbourhood(q);
    }
  }, [searchQuery, fetchNeighbourhood]);

  // Reset: clear everything
  const handleReset = useCallback(() => {
    resetCache();
    setCenterUri(null);
    setSelectedNode(null);
    setActivePredicate(null);
    setPendingSelectUri(null);
    onNodeSelect?.(null);
  }, [resetCache, onNodeSelect]);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  if (initialLoading) return <LoadingState />;
  if (isError) return <LoadingState variant="error" message={error?.message || "Failed to load graph"} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      {/* Toolbar */}
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        {/* Reset button */}
        {visibleNodes.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              background: "none",
              border: `1px solid ${border.default}`,
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.faint,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Clear
          </button>
        )}

        {/* Loading indicator */}
        {isFetching && (
          <span style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: palette.amber,
          }}>
            loading...
          </span>
        )}

        {/* Search */}
        <div style={{ position: "relative" }}>
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

          {showSearch && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              width: 360,
              background: "rgba(12,12,18,0.98)",
              border: `1px solid ${border.medium}`,
              borderRadius: 8,
              backdropFilter: "blur(12px)",
              zIndex: 100,
              overflow: "hidden",
            }}>
              <div style={{ padding: "8px 12px", borderBottom: `1px solid ${border.subtle}` }}>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSubmit();
                    if (e.key === "Escape") setShowSearch(false);
                  }}
                  placeholder="Search the graph..."
                  style={{
                    width: "100%",
                    padding: "8px 0",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: text.primary,
                    fontSize: 13,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                />
              </div>
              {searchResults.length > 0 && (
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {searchResults.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => handleSearchSelect(node)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{
                        fontSize: 12,
                        color: node.color,
                        fontWeight: 600,
                      }}>
                        {node.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div style={{
                  padding: "16px 12px",
                  fontSize: 12,
                  color: text.hint,
                  fontStyle: "italic",
                  textAlign: "center",
                }}>
                  {searchQuery.startsWith("http") ? "Press Enter to navigate to this URI" : "No matches"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Predicate filters */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <FilterBar
            items={predicateFilters}
            selectedKey={activePredicate}
            onSelect={handlePredicateFilter}
            stats={stats}
            showAll
            allLabel="All predicates"
            emptyMessage=""
            maxItems={8}
          />
        </div>
      </div>

      {/* Graph + detail panel */}
      <SplitPane
        height="calc(100vh - 160px)"
        panelSide="right"
        panelBorder
        panel={selectedNode ? (
          <RawNodeDetailPanel
            node={selectedNode}
            edges={visibleEdges}
            nodes={nodes}
            onClose={handleClose}
            onNodeNavigate={handleNodeNavigate}
          />
        ) : null}
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
            Use search to find a starting node
          </div>
        )}
      </SplitPane>
    </div>
  );
}
