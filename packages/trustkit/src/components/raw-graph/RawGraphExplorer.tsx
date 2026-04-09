import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRawGraphData, getNeighbourhood } from "../../hooks/useRawGraphData";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas } from "./RawGraphCanvas";
import { RawNodeDetailPanel } from "./RawNodeDetailPanel";
import { LoadingState, SplitPane, FilterBar } from "../common";
import type { FilterItem } from "../common";
import { text, palette, border } from "../../theme";

interface RawGraphExplorerProps {
  /** Neighbourhood depth from center node (default 2) */
  depth?: number;
  /** Callback when a node is selected */
  onNodeSelect?: (node: RawNode | null) => void;
}

export function RawGraphExplorer({ depth = 2, onNodeSelect }: RawGraphExplorerProps) {
  const { nodes, edges, predicates, startNode, isLoading, isError, error } = useRawGraphData();

  // Explored URIs — the graph grows as you navigate
  const [exploredUris, setExploredUris] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);
  const [activePredicate, setActivePredicate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Set initial seed when data loads
  useEffect(() => {
    if (startNode && exploredUris.length === 0) {
      setExploredUris([startNode]);
    }
  }, [startNode, exploredUris.length]);

  // The most recently explored URI (for centering the canvas)
  const centerUri = exploredUris.length > 0 ? exploredUris[exploredUris.length - 1] : null;

  // Compute visible neighbourhood — union of all explored seeds
  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (exploredUris.length === 0 || nodes.size === 0) {
      return { visibleNodes: [], visibleEdges: [] };
    }
    return getNeighbourhood(exploredUris, nodes, edges, depth);
  }, [exploredUris, nodes, edges, depth]);

  // Compute highlighted nodes (selected + its direct connections)
  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const ids = [selectedNode.id];
    for (const edge of visibleEdges) {
      if (edge.from === selectedNode.id) ids.push(edge.to);
      if (edge.to === selectedNode.id) ids.push(edge.from);
    }
    return ids;
  }, [selectedNode, visibleEdges]);

  // Predicate filter items from visible edges
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

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: RawNode[] = [];
    for (const [, node] of nodes) {
      if (node.label.toLowerCase().includes(q) || node.id.toLowerCase().includes(q)) {
        results.push(node);
        if (results.length >= 20) break;
      }
    }
    return results;
  }, [searchQuery, nodes]);

  // Stats
  const stats = `${visibleNodes.length} nodes · ${visibleEdges.length} edges`;

  // Handlers
  const handleNodeClick = useCallback((node: RawNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const handleNodeNavigate = useCallback((uri: string) => {
    // Add to explored set (graph grows), select the target node
    setExploredUris(prev => prev.includes(uri) ? prev : [...prev, uri]);
    const targetNode = nodes.get(uri) || null;
    setSelectedNode(targetNode);
    onNodeSelect?.(targetNode);
  }, [onNodeSelect, nodes]);

  const handleClose = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handlePredicateFilter = useCallback((key: string | null) => {
    setActivePredicate(prev => prev === key ? null : key);
  }, []);

  const handleSearchSelect = useCallback((node: RawNode) => {
    // Search is a deliberate "go somewhere new" — reset explored set
    setExploredUris([node.id]);
    setSelectedNode(null);
    setActivePredicate(null);
    setSearchQuery("");
    setShowSearch(false);
  }, []);

  // Focus search on toggle
  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  if (isLoading) return <LoadingState />;
  if (isError) return <LoadingState variant="error" message={error?.message || "Failed to load graph"} />;
  if (nodes.size === 0) return <LoadingState variant="error" message="No triples found in the graph" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      {/* Toolbar: centre node info + search + predicate filters */}
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}>
        {/* Exploration trail */}
        {exploredUris.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginRight: 8,
            overflow: "hidden",
          }}>
            <div style={{
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.faint,
              letterSpacing: "0.1em",
              flexShrink: 0,
            }}>
              TRAIL:
            </div>
            {exploredUris.slice(-4).map((uri, i, arr) => {
              const n = nodes.get(uri);
              if (!n) return null;
              const isLast = i === arr.length - 1;
              return (
                <span key={uri} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span style={{ color: text.hint, fontSize: 10 }}>→</span>}
                  <button
                    onClick={() => {
                      const targetNode = nodes.get(uri) || null;
                      setSelectedNode(targetNode);
                      onNodeSelect?.(targetNode);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: isLast ? 600 : 400,
                      color: isLast ? n.color : text.subtle,
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      cursor: "pointer",
                      transition: "color 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.label}
                  </button>
                </span>
              );
            })}
            {exploredUris.length > 1 && (
              <button
                onClick={() => {
                  if (exploredUris.length > 0) {
                    setExploredUris([exploredUris[exploredUris.length - 1]]);
                    setSelectedNode(null);
                    setActivePredicate(null);
                    onNodeSelect?.(null);
                  }
                }}
                style={{
                  background: "none",
                  border: `1px solid ${border.default}`,
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: text.faint,
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: 4,
                }}
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Search toggle */}
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

          {/* Search dropdown */}
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
                  placeholder="Search nodes by label or URI..."
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
                      <div style={{
                        fontSize: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: text.hint,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {node.id}
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
                  No nodes found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Depth indicator */}
        <div style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.hint,
        }}>
          depth {depth}
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
        <RawGraphCanvas
          nodes={visibleNodes}
          edges={visibleEdges}
          centerUri={centerUri}
          highlightedNodes={highlightedNodes}
          activePredicate={activePredicate}
          onNodeClick={handleNodeClick}
          onNodeNavigate={handleNodeNavigate}
        />
      </SplitPane>
    </div>
  );
}
