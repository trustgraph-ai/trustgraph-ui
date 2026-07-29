import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { IINode } from "../../hooks/useInnovationData";
import { useTheme } from "../../theme/ThemeContext";
import type { Theme } from "../../theme/types";

interface PathFinderProps {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  adjacency: Map<string, { target: string; label: string }[]>;
  onSelectNode: (uri: string) => void;
}

interface PathStep {
  uri: string;
  edgeLabel: string;
}

type FoundPath = PathStep[];

const MAX_DEPTH = 5;
const MAX_PATHS = 8;

const NOISY_EDGES = new Set([
  "located in", "location of",
  "within nation", "contains area",
  "scoped to", "scope of",
  "member nation", "member of",
  "operates in sector", "sector contains",
]);

function findPaths(
  adj: Map<string, { target: string; label: string }[]>,
  start: string,
  end: string,
): FoundPath[] {
  const results: FoundPath[] = [];
  const visited = new Set<string>();

  function dfs(current: string, path: PathStep[], depth: number) {
    if (results.length >= MAX_PATHS) return;
    if (depth > MAX_DEPTH) return;
    if (current === end) {
      results.push([...path]);
      return;
    }

    visited.add(current);
    const edges = adj.get(current) || [];
    for (const edge of edges) {
      if (visited.has(edge.target)) continue;
      path.push({ uri: edge.target, edgeLabel: edge.label });
      dfs(edge.target, path, depth + 1);
      path.pop();
      if (results.length >= MAX_PATHS) break;
    }
    visited.delete(current);
  }

  dfs(start, [{ uri: start, edgeLabel: "" }], 0);
  return results;
}

function EntityPicker({
  nodes,
  abbreviations,
  value,
  onChange,
  placeholder,
}: {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  value: string | null;
  onChange: (uri: string | null) => void;
  placeholder: string;
}) {
  const { theme, sz } = useTheme();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const matches = useMemo(() => {
    if (!search) return [];
    const term = search.toLowerCase();
    const result: IINode[] = [];
    for (const node of nodes.values()) {
      if (result.length >= 20) break;
      const abbr = abbreviations.get(node.uri)?.toLowerCase() || "";
      if (node.label.toLowerCase().includes(term) || abbr.includes(term)) {
        result.push(node);
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [search, nodes, abbreviations]);

  const selected = value ? nodes.get(value) : null;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      {selected && !open ? (
        <div
          onClick={() => { setOpen(true); setSearch(""); }}
          style={{
            padding: "8px 12px", borderRadius: 6, fontSize: sz(13),
            background: "rgba(255,255,255,0.06)", border: `1px solid ${theme.border.medium}`,
            color: theme.text.primary, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>{selected.label}</span>
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setSearch(""); }}
            style={{ color: theme.text.faint, cursor: "pointer", fontSize: sz(11), marginLeft: 8 }}
          >✕</span>
        </div>
      ) : (
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={open}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: sz(13),
            background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border.default}`,
            color: theme.text.primary, outline: "none",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        />
      )}
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          marginTop: 4, borderRadius: 6, overflow: "hidden",
          background: "#15151F", border: `1px solid ${theme.border.medium}`,
          maxHeight: 240, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {matches.map(node => (
            <div
              key={node.uri}
              onClick={() => { onChange(node.uri); setOpen(false); setSearch(""); }}
              style={{
                padding: "6px 12px", cursor: "pointer", fontSize: sz(12),
                color: theme.text.secondary, borderBottom: `1px solid ${theme.border.subtle}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: theme.text.primary }}>{node.label}</span>
              <span style={{ color: theme.text.faint, fontSize: sz(10), marginLeft: 8 }}>
                {node.kind.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildEdgeColors(theme: Theme): Record<string, string> {
  return {
    "delivers capability in": theme.palette.emerald,
    "seeks capability in": theme.palette.rose,
    "sub-organisation of": theme.palette.blue,
    "parent of": theme.palette.blue,
    "member of": theme.palette.cyan,
    "partner": theme.palette.pink,
    "operates framework": theme.palette.purple,
    "listed on framework": theme.palette.purple,
    "provides access to": theme.palette.cyan,
    "holds role at": theme.palette.amber,
    "has expertise in": theme.palette.emerald,
    "sub-domain of": theme.palette.emerald,
    "located in": "#67E8F9",
    "funded by": theme.palette.pink,
    "operates in sector": theme.palette.orange,
    "targets segment": theme.palette.rose,
    "belongs to segment": theme.palette.rose,
    "member nation": theme.palette.cyan,
    "within nation": "#67E8F9",
    "scoped to": theme.palette.cyan,
  };
}

// --- Subway map visualization (DAG layout — each entity appears once) ---

interface DagNode {
  uri: string;
  layer: number;
  order: number;
  pathCount: number;
  isStart: boolean;
  isEnd: boolean;
}

interface DagEdge {
  from: string;
  to: string;
  label: string;
}

function buildDag(paths: FoundPath[]): { nodes: Map<string, DagNode>; edges: DagEdge[] } {
  const startUri = paths[0]?.[0]?.uri || "";
  const endUri = paths[0]?.[paths[0].length - 1]?.uri || "";

  // Collect directed edges as they appear in paths (always forward: earlier step → later step)
  const edgeSet = new Map<string, DagEdge>();
  const nodePathCount = new Map<string, number>();
  const successors = new Map<string, Set<string>>();
  const allUris = new Set<string>();

  for (const path of paths) {
    const seen = new Set<string>();
    for (let si = 0; si < path.length; si++) {
      const uri = path[si].uri;
      allUris.add(uri);
      if (!seen.has(uri)) {
        nodePathCount.set(uri, (nodePathCount.get(uri) ?? 0) + 1);
        seen.add(uri);
      }
      if (si > 0) {
        const from = path[si - 1].uri;
        const to = uri;
        const label = path[si].edgeLabel;
        const key = `${from}\0${to}\0${label}`;
        if (!edgeSet.has(key)) {
          edgeSet.set(key, { from, to, label });
          if (!successors.has(from)) successors.set(from, new Set());
          successors.get(from)!.add(to);
        }
      }
    }
  }

  // Remove cycle-causing edges: for each pair with edges in both directions,
  // keep only the one where the source has the lower minimum depth across paths
  const minDepth = new Map<string, number>();
  for (const path of paths) {
    for (let si = 0; si < path.length; si++) {
      const uri = path[si].uri;
      minDepth.set(uri, Math.min(minDepth.get(uri) ?? Infinity, si));
    }
  }
  const pairSeen = new Set<string>();
  const edgesToRemove = new Set<string>();
  for (const [key, edge] of edgeSet) {
    const pairKey = [edge.from, edge.to].sort().join("\0");
    if (pairSeen.has(pairKey)) continue;
    pairSeen.add(pairKey);
    // Check if reverse exists
    for (const [rk, re] of edgeSet) {
      if (re.from === edge.to && re.to === edge.from) {
        // Keep the edge where source has lower minDepth
        const fwd = (minDepth.get(edge.from) ?? 0);
        const rev = (minDepth.get(re.from) ?? 0);
        if (fwd <= rev) edgesToRemove.add(rk);
        else edgesToRemove.add(key);
        break;
      }
    }
  }
  for (const key of edgesToRemove) {
    const removed = edgeSet.get(key);
    if (removed) {
      edgeSet.delete(key);
      const succs = successors.get(removed.from);
      if (succs) succs.delete(removed.to);
    }
  }

  // Compute layers via longest path from start (guarantees all edges go left→right)
  const dist = new Map<string, number>();
  for (const uri of allUris) dist.set(uri, -1);
  dist.set(startUri, 0);

  const maxIter = allUris.size;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (const edge of edgeSet.values()) {
      const du = dist.get(edge.from) ?? -1;
      if (du < 0) continue;
      const dv = dist.get(edge.to) ?? -1;
      if (du + 1 > dv) {
        dist.set(edge.to, du + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Group nodes by layer and order within layers using barycenter
  const layers = new Map<number, string[]>();
  for (const [uri, layer] of dist) {
    if (layer < 0) continue;
    const list = layers.get(layer) || [];
    list.push(uri);
    layers.set(layer, list);
  }

  const nodeOrder = new Map<string, number>();
  const sortedLayerKeys = [...layers.keys()].sort((a, b) => a - b);

  for (const layerIdx of sortedLayerKeys) {
    const uris = layers.get(layerIdx)!;
    if (layerIdx === 0) {
      uris.forEach((u, i) => nodeOrder.set(u, i));
      continue;
    }

    const bary = new Map<string, number>();
    for (const uri of uris) {
      let sum = 0;
      let count = 0;
      for (const edge of edgeSet.values()) {
        if (edge.to === uri && nodeOrder.has(edge.from)) {
          sum += nodeOrder.get(edge.from)!;
          count++;
        }
      }
      bary.set(uri, count > 0 ? sum / count : 0);
    }
    uris.sort((a, b) => (bary.get(a) ?? 0) - (bary.get(b) ?? 0));
    uris.forEach((u, i) => nodeOrder.set(u, i));
  }

  // Build final node map
  const nodes = new Map<string, DagNode>();
  for (const [uri, layer] of dist) {
    if (layer < 0) continue;
    nodes.set(uri, {
      uri,
      layer,
      order: nodeOrder.get(uri) ?? 0,
      pathCount: nodePathCount.get(uri) ?? 0,
      isStart: uri === startUri,
      isEnd: uri === endUri,
    });
  }

  // Filter edges to only those with both endpoints in the layout
  const validEdges = [...edgeSet.values()].filter(e => nodes.has(e.from) && nodes.has(e.to));

  return { nodes, edges: validEdges };
}

const NODE_H = 44;
const COL_GAP = 120;
const ROW_GAP = 24;
const STATION_R = 6;
const MIN_NODE_W = 150;
const CHAR_W = 7.5;

function SubwayMap({
  paths,
  nodeLabel,
  nodeKindColor,
  nodes: nodeMap,
  onSelectNode,
  edgeColorFn,
}: {
  paths: FoundPath[];
  nodeLabel: (uri: string) => string;
  nodeKindColor: (uri: string) => string;
  nodes: Map<string, IINode>;
  onSelectNode: (uri: string) => void;
  edgeColorFn: (label: string) => string;
}) {
  const { theme, sz } = useTheme();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { dagNodes, dagEdges, svgWidth, svgHeight, bypassBaseY, nodeW } = useMemo(() => {
    const { nodes: dn, edges: de } = buildDag(paths);

    // Compute node width from longest label
    let maxLabelLen = 0;
    for (const uri of dn.keys()) {
      const label = nodeLabel(uri);
      if (label.length > maxLabelLen) maxLabelLen = label.length;
    }
    const computedW = Math.max(MIN_NODE_W, Math.min(220, maxLabelLen * CHAR_W + 24));

    let maxLayer = 0;
    const layerCounts = new Map<number, number>();
    for (const n of dn.values()) {
      if (n.layer > maxLayer) maxLayer = n.layer;
      layerCounts.set(n.layer, (layerCounts.get(n.layer) ?? 0) + 1);
    }
    let maxRowCount = 0;
    for (const c of layerCounts.values()) if (c > maxRowCount) maxRowCount = c;

    let bypassCount = 0;
    for (const e of de) {
      const from = dn.get(e.from);
      const to = dn.get(e.to);
      if (from && to && to.layer - from.layer > 1) bypassCount++;
    }

    const padX = 20;
    const padY = 20;
    const nodeAreaH = maxRowCount * (NODE_H + ROW_GAP);
    const bypassAreaH = bypassCount > 0 ? 30 + bypassCount * 18 : 0;
    const w = padX * 2 + (maxLayer + 1) * computedW + maxLayer * COL_GAP;
    const h = padY * 2 + nodeAreaH + bypassAreaH;
    const bpBaseY = padY + nodeAreaH + 20;

    return { dagNodes: dn, dagEdges: de, svgWidth: w, svgHeight: h, bypassBaseY: bpBaseY, nodeW: computedW };
  }, [paths, nodeLabel]);

  const nodeX = (layer: number) => 20 + layer * (nodeW + COL_GAP) + nodeW / 2;
  const nodeY = (order: number) => 20 + order * (NODE_H + ROW_GAP) + NODE_H / 2;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const MIN_RENDER_WIDTH = 800;
  const fitsNaturally = containerWidth >= svgWidth;
  const needsScroll = containerWidth > 0 && containerWidth < MIN_RENDER_WIDTH && svgWidth > containerWidth;

  const renderWidth = fitsNaturally
    ? containerWidth
    : needsScroll ? svgWidth : containerWidth;
  const scale = renderWidth / svgWidth;
  const displayHeight = svgHeight * scale;

  return (
    <div
      ref={containerRef}
      style={{
        borderRadius: 8, background: "rgba(255,255,255,0.02)",
        border: `1px solid ${theme.border.subtle}`,
        overflowX: needsScroll ? "auto" : "hidden",
        overflowY: "hidden",
      }}
    >
      <svg
        width={needsScroll ? svgWidth : "100%"}
        height={displayHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMin meet"
        style={{ display: "block" }}
      >
        {/* Edges */}
        {dagEdges.map((edge, i) => {
          const from = dagNodes.get(edge.from);
          const to = dagNodes.get(edge.to);
          if (!from || !to) return null;

          const x1 = nodeX(from.layer) + nodeW / 2;
          const y1 = nodeY(from.order);
          const x2 = nodeX(to.layer) - nodeW / 2;
          const y2 = nodeY(to.order);

          const color = edgeColorFn(edge.label);
          const layerSpan = to.layer - from.layer;

          const bendR = Math.min(20, Math.abs(y2 - y1) / 2, COL_GAP / 4);
          let path: string;
          let labelX: number;
          let labelY: number;

          if (y1 === y2 && layerSpan <= 1) {
            path = `M${x1},${y1} L${x2},${y2}`;
            labelX = (x1 + x2) / 2;
            labelY = y1;
          } else if (layerSpan <= 1) {
            // Adjacent layers: bend in the middle of the gap
            const midX = (x1 + x2) / 2;
            path = `M${x1},${y1} L${midX - bendR},${y1} Q${midX},${y1} ${midX},${y1 + (y2 > y1 ? bendR : -bendR)} L${midX},${y2 - (y2 > y1 ? bendR : -bendR)} Q${midX},${y2} ${midX + bendR},${y2} L${x2},${y2}`;
            labelX = midX;
            labelY = (y1 + y2) / 2;
          } else {
            // Multi-layer span: route below all nodes through bypass area
            // Count which bypass lane this edge uses
            let bypassIdx = 0;
            for (let j = 0; j < i; j++) {
              const ef = dagNodes.get(dagEdges[j].from);
              const et = dagNodes.get(dagEdges[j].to);
              if (ef && et && et.layer - ef.layer > 1) bypassIdx++;
            }
            const bypassY = bypassBaseY + bypassIdx * 18;
            const r = 12;

            // Down from source → horizontal along bypass → up to target
            path = [
              `M${x1},${y1}`,
              `L${x1 + r},${y1}`,
              `Q${x1 + r * 2},${y1} ${x1 + r * 2},${y1 + r}`,
              `L${x1 + r * 2},${bypassY - r}`,
              `Q${x1 + r * 2},${bypassY} ${x1 + r * 3},${bypassY}`,
              `L${x2 - r * 3},${bypassY}`,
              `Q${x2 - r * 2},${bypassY} ${x2 - r * 2},${bypassY - r}`,
              `L${x2 - r * 2},${y2 + r}`,
              `Q${x2 - r * 2},${y2} ${x2 - r},${y2}`,
              `L${x2},${y2}`,
            ].join(" ");

            labelX = (x1 + x2) / 2;
            labelY = bypassY;
          }

          const isBypass = layerSpan > 1;

          // Offset labels for edges sharing the same target to avoid stacking
          let labelOffset = 0;
          for (let j = 0; j < i; j++) {
            const ej = dagEdges[j];
            if (ej.to === edge.to && dagNodes.get(ej.from)?.layer === from.layer) {
              labelOffset += 16;
            }
          }

          return (
            <g key={i}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isBypass ? 1.5 : 2}
                strokeOpacity={isBypass ? 0.35 : 0.5}
                strokeDasharray={isBypass ? "6 4" : undefined}
              />
              <rect
                x={labelX - edge.label.length * 2.6 - 4}
                y={labelY - 7 + labelOffset}
                width={edge.label.length * 5.2 + 8}
                height={14}
                rx={3}
                fill="#15151F"
                fillOpacity={0.92}
              />
              <text
                x={labelX}
                y={labelY + 3.5 + labelOffset}
                textAnchor="middle"
                fontSize={sz(8)}
                fontFamily="'IBM Plex Mono', monospace"
                fill={color}
                fillOpacity={isBypass ? 0.65 : 0.85}
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {[...dagNodes.entries()].map(([uri, node]) => {
          const x = nodeX(node.layer);
          const y = nodeY(node.order);
          const color = nodeKindColor(uri);
          const label = nodeLabel(uri);
          const kind = nodeMap.get(uri)?.kind || "";
          const isHovered = hoveredNode === uri;

          const isHub = node.pathCount > 1 && !node.isStart && !node.isEnd;

          return (
            <g
              key={uri}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectNode(uri)}
              onMouseEnter={() => setHoveredNode(uri)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <rect
                x={x - nodeW / 2}
                y={y - NODE_H / 2}
                width={nodeW}
                height={NODE_H}
                rx={8}
                fill={isHovered ? `${color}22` : `${color}11`}
                stroke={node.isStart || node.isEnd ? color : `${color}44`}
                strokeWidth={node.isStart || node.isEnd ? 2 : 1}
                style={{ transition: "fill 0.12s" }}
              />

              {isHub && (
                <>
                  <circle cx={x - nodeW / 2} cy={y} r={STATION_R + 1} fill="#15151F" />
                  <circle cx={x - nodeW / 2} cy={y} r={STATION_R} fill="none" stroke={color} strokeWidth={2} />
                </>
              )}

              <text
                x={x}
                y={y - 4}
                textAnchor="middle"
                fontSize={sz(10)}
                fontWeight={500}
                fill={color}
              >
                {label.length > 28 ? label.slice(0, 27) + "…" : label}
              </text>

              <text
                x={x}
                y={y + 10}
                textAnchor="middle"
                fontSize={sz(7)}
                fontFamily="'IBM Plex Mono', monospace"
                fill={theme.text.hint}
              >
                {kind.replace(/([A-Z])/g, " $1").trim()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PathFinder({ nodes, abbreviations, adjacency, onSelectNode }: PathFinderProps) {
  const { theme, sz } = useTheme();
  const [startUri, setStartUri] = useState<string | null>(null);
  const [endUri, setEndUri] = useState<string | null>(null);
  const [paths, setPaths] = useState<FoundPath[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const EDGE_COLORS = useMemo(() => buildEdgeColors(theme), [theme]);

  const edgeColor = useCallback((label: string): string => {
    return EDGE_COLORS[label] || theme.text.faint;
  }, [EDGE_COLORS, theme.text.faint]);

  const allEdgeLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const edges of adjacency.values()) {
      for (const e of edges) labels.add(e.label);
    }
    return [...labels].sort();
  }, [adjacency]);

  const [disabledEdges, setDisabledEdges] = useState<Set<string>>(() => new Set(NOISY_EDGES));

  const filteredAdj = useMemo(() => {
    if (disabledEdges.size === 0) return adjacency;
    const adj = new Map<string, { target: string; label: string }[]>();
    for (const [uri, edges] of adjacency) {
      const filtered = edges.filter(e => !disabledEdges.has(e.label));
      if (filtered.length > 0) adj.set(uri, filtered);
    }
    return adj;
  }, [adjacency, disabledEdges]);

  const toggleEdge = useCallback((label: string) => {
    setDisabledEdges(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const handleFind = useCallback(() => {
    if (!startUri || !endUri) return;
    setSearching(true);
    setTimeout(() => {
      const found = findPaths(filteredAdj, startUri, endUri);
      setPaths(found);
      setSearching(false);
    }, 10);
  }, [startUri, endUri, filteredAdj]);

  const nodeLabel = useCallback((uri: string): string => {
    const n = nodes.get(uri);
    if (!n) return uri.split("/").pop() || uri;
    return n.label;
  }, [nodes]);

  const nodeKindColor = useCallback((uri: string): string => {
    const n = nodes.get(uri);
    if (!n) return theme.text.muted;
    const KIND_COLORS: Record<string, string> = {
      GovernmentDepartment: theme.palette.blue, MilitaryCommand: "#5B8DEF",
      Agency: theme.palette.cyan, InnovationHub: theme.palette.emerald,
      PrimeContractor: theme.palette.orange, SME: theme.palette.amber,
      Startup: "#FCD34D", Investor: theme.palette.pink,
      Accelerator: theme.palette.emerald, ResearchOrganisation: theme.palette.purple,
      University: "#C4B5FD", Person: theme.palette.amber,
      CapabilityDomain: theme.palette.emerald, Framework: theme.palette.purple,
      InnovationChallenge: "#C4B5FD", CustomerSegment: theme.palette.rose,
      Nation: theme.palette.cyan, Region: "#67E8F9",
      IndustrySector: theme.palette.orange,
    };
    return KIND_COLORS[n.kind] || theme.text.muted;
  }, [nodes, theme]);

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: sz(16), fontWeight: 600, color: theme.text.primary, marginBottom: 6,
          }}>
            Pathway Finder
          </div>
          <div style={{ fontSize: sz(12), color: theme.text.faint, lineHeight: 1.5 }}>
            Find connection paths between any two entities in the ecosystem.
            Discover how organisations, capabilities, procurement routes, and people are linked.
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Selectors */}
        <div style={{
          display: "flex", gap: 12, alignItems: "center", marginBottom: 20,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: sz(9), color: theme.palette.emerald, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
            }}>From</div>
            <EntityPicker
              nodes={nodes}
              abbreviations={abbreviations}
              value={startUri}
              onChange={setStartUri}
              placeholder="Search start entity..."
            />
          </div>
          <div style={{ color: theme.text.faint, fontSize: sz(18), paddingTop: 16 }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: sz(9), color: theme.palette.rose, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
            }}>To</div>
            <EntityPicker
              nodes={nodes}
              abbreviations={abbreviations}
              value={endUri}
              onChange={setEndUri}
              placeholder="Search destination entity..."
            />
          </div>
          <div style={{ paddingTop: 16 }}>
            <button
              onClick={handleFind}
              disabled={!startUri || !endUri || startUri === endUri || searching}
              style={{
                padding: "8px 20px", borderRadius: 6,
                background: startUri && endUri && startUri !== endUri
                  ? `${theme.palette.emerald}22` : "rgba(255,255,255,0.04)",
                color: startUri && endUri && startUri !== endUri
                  ? theme.palette.emerald : theme.text.faint,
                fontSize: sz(12), fontWeight: 600, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s",
                border: `1px solid ${startUri && endUri ? theme.palette.emerald + "44" : theme.border.default}`,
              }}
            >
              {searching ? "Searching..." : "Find Paths"}
            </button>
          </div>
        </div>

        {/* Edge type filters */}
        {allEdgeLabels.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                cursor: "pointer", userSelect: "none",
                fontSize: sz(10), color: theme.text.faint,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <span style={{
                display: "inline-block", transition: "transform 0.15s",
                transform: filtersOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: sz(8),
              }}>▶</span>
              Relationship filters
              {disabledEdges.size > 0 && (
                <span style={{
                  fontSize: sz(9), color: theme.palette.amber,
                  background: `${theme.palette.amber}15`, padding: "1px 6px",
                  borderRadius: 3,
                }}>
                  {disabledEdges.size} excluded
                </span>
              )}
            </div>
            {filtersOpen && (
              <div style={{
                marginTop: 8, padding: 12, borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${theme.border.subtle}`,
              }}>
                <div style={{
                  display: "flex", gap: 8, marginBottom: 10,
                  fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  <span
                    onClick={() => setDisabledEdges(new Set())}
                    style={{ color: theme.palette.emerald, cursor: "pointer" }}
                  >Enable all</span>
                  <span style={{ color: theme.border.medium }}>|</span>
                  <span
                    onClick={() => setDisabledEdges(new Set(NOISY_EDGES))}
                    style={{ color: theme.text.faint, cursor: "pointer" }}
                  >Reset defaults</span>
                </div>
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 6,
                }}>
                  {allEdgeLabels.map(label => {
                    const disabled = disabledEdges.has(label);
                    const color = edgeColor(label);
                    return (
                      <div
                        key={label}
                        onClick={() => toggleEdge(label)}
                        style={{
                          padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                          fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace",
                          background: disabled ? "rgba(255,255,255,0.02)" : `${color}15`,
                          border: `1px solid ${disabled ? theme.border.subtle : color + "44"}`,
                          color: disabled ? theme.text.hint : color,
                          opacity: disabled ? 0.5 : 1,
                          transition: "all 0.12s",
                          textDecoration: disabled ? "line-through" : "none",
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {paths === null && startUri && endUri && (
          <div style={{
            padding: 32, textAlign: "center", color: theme.text.hint, fontSize: sz(12),
          }}>
            Click "Find Paths" to discover connections
          </div>
        )}
      </div>

      {/* Results — full width, no maxWidth constraint */}
      {paths !== null && (
        <div style={{ padding: "0 16px" }}>
          {paths.length === 0 ? (
            <div style={{
              padding: 32, textAlign: "center", borderRadius: 8,
              background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border.subtle}`,
              maxWidth: 900, margin: "0 auto",
            }}>
              <div style={{ fontSize: sz(24), opacity: 0.3, marginBottom: 8 }}>∅</div>
              <div style={{ color: theme.text.faint, fontSize: sz(13) }}>
                No paths found within {MAX_DEPTH} steps
              </div>
              <div style={{ color: theme.text.hint, fontSize: sz(11), marginTop: 4 }}>
                These entities may not be connected in the current dataset
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: sz(10), color: theme.text.faint, marginBottom: 12,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {paths.length} path{paths.length !== 1 ? "s" : ""} found
                {paths.length >= MAX_PATHS && " (showing first " + MAX_PATHS + ")"}
              </div>

              <SubwayMap
                paths={paths}
                nodeLabel={nodeLabel}
                nodeKindColor={nodeKindColor}
                nodes={nodes}
                onSelectNode={onSelectNode}
                edgeColorFn={edgeColor}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
