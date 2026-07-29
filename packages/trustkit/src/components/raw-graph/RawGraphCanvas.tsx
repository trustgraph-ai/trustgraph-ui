import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { RawNode, RawEdge } from "../../hooks/useRawGraphData";
import { ZoomControls } from "../graph/ZoomControls";
import { useTheme } from "../../theme/ThemeContext";

// ── Types ────────────────────────────────────────────────────────

export interface RawGraphNode extends RawNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface RawGraphCanvasProps {
  nodes: RawNode[];
  edges: RawEdge[];
  centerUri: string | null;
  highlightedNodes: string[];
  activePredicate: string | null;
  onNodeClick: (node: RawNode) => void;
  onNodeNavigate: (uri: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function truncateLabel(label: string, maxLength = 28): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 1) + "…";
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── Force simulation ─────────────────────────────────────────────

const REPULSION = 3000;
const ATTRACTION = 0.015;
const IDEAL_LENGTH = 220;
const CENTER_GRAVITY = 0.003;
const DAMPING = 0.85;
const MAX_VELOCITY = 10;
const SETTLE_THRESHOLD = 0.3;
const WARM_UP_STEPS = 120;

function stepSimulation(
  graphNodes: RawGraphNode[],
  edges: RawEdge[],
  cx: number,
  cy: number,
): { nodes: RawGraphNode[]; totalMovement: number } {
  const n = graphNodes.length;
  const forces = graphNodes.map(() => ({ fx: 0, fy: 0 }));

  // Repulsion between all pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = graphNodes[j].x - graphNodes[i].x;
      const dy = graphNodes[j].y - graphNodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      forces[i].fx -= fx;
      forces[i].fy -= fy;
      forces[j].fx += fx;
      forces[j].fy += fy;
    }
  }

  // Build index for edge attraction
  const nodeIndex = new Map<string, number>();
  graphNodes.forEach((n, i) => nodeIndex.set(n.id, i));

  for (const edge of edges) {
    const ai = nodeIndex.get(edge.from);
    const bi = nodeIndex.get(edge.to);
    if (ai === undefined || bi === undefined) continue;

    const dx = graphNodes[bi].x - graphNodes[ai].x;
    const dy = graphNodes[bi].y - graphNodes[ai].y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = ATTRACTION * (dist - IDEAL_LENGTH);
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    forces[ai].fx += fx;
    forces[ai].fy += fy;
    forces[bi].fx -= fx;
    forces[bi].fy -= fy;
  }

  // Center gravity
  for (let i = 0; i < n; i++) {
    forces[i].fx += (cx - graphNodes[i].x) * CENTER_GRAVITY;
    forces[i].fy += (cy - graphNodes[i].y) * CENTER_GRAVITY;
  }

  // Apply forces
  let totalMovement = 0;
  const updated = graphNodes.map((node, i) => {
    let vx = (node.vx + forces[i].fx) * DAMPING;
    let vy = (node.vy + forces[i].fy) * DAMPING;
    vx = clamp(vx, -MAX_VELOCITY, MAX_VELOCITY);
    vy = clamp(vy, -MAX_VELOCITY, MAX_VELOCITY);
    const x = node.x + vx;
    const y = node.y + vy;
    totalMovement += Math.abs(vx) + Math.abs(vy);
    return { ...node, x, y, vx, vy };
  });

  return { nodes: updated, totalMovement };
}

// ── Component ────────────────────────────────────────────────────

export function RawGraphCanvas({
  nodes,
  edges,
  centerUri,
  highlightedNodes,
  activePredicate,
  onNodeClick,
  onNodeNavigate,
}: RawGraphCanvasProps) {
  const { theme, sz } = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [graphNodes, setGraphNodes] = useState<RawGraphNode[]>([]);
  const [settled, setSettled] = useState(false);
  const animRef = useRef<number>(0);
  const [time, setTime] = useState(0);

  // Zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Track previous node positions so we can preserve them across updates
  const prevPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Initialize positions and run warm-up when nodes change
  useEffect(() => {
    if (containerSize.width === 0 || nodes.length === 0) return;

    const prevPositions = prevPositionsRef.current;
    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;

    // Build new graph nodes, preserving positions for nodes that already exist
    let gn: RawGraphNode[] = nodes.map((node, i) => {
      const existing = prevPositions.get(node.id);
      if (existing) {
        // Keep existing position, just update data
        return { ...node, x: existing.x, y: existing.y, vx: 0, vy: 0, r: node.id === centerUri ? 12 : 9 };
      }
      // New node: place near a connected existing node, or in a ring
      const connectedExisting = edges
        .filter(e => e.from === node.id || e.to === node.id)
        .map(e => e.from === node.id ? e.to : e.from)
        .find(id => prevPositions.has(id));

      if (connectedExisting) {
        const anchor = prevPositions.get(connectedExisting)!;
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 40;
        return {
          ...node,
          x: anchor.x + Math.cos(angle) * dist,
          y: anchor.y + Math.sin(angle) * dist,
          vx: 0, vy: 0,
          r: node.id === centerUri ? 12 : 9,
        };
      }

      // Fallback: ring around centre
      const angle = (Math.PI * 2 * i) / nodes.length;
      const radius = Math.min(containerSize.width, containerSize.height) * 0.35;
      return {
        ...node,
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0,
        r: node.id === centerUri ? 12 : 9,
      };
    });

    const isIncremental = prevPositions.size > 0;
    const warmUpSteps = isIncremental ? 40 : WARM_UP_STEPS;

    // Run warm-up steps synchronously
    for (let i = 0; i < warmUpSteps; i++) {
      const result = stepSimulation(gn, edges, cx, cy);
      gn = result.nodes;
    }

    // Save positions for next update
    const newPositions = new Map<string, { x: number; y: number }>();
    for (const n of gn) newPositions.set(n.id, { x: n.x, y: n.y });
    prevPositionsRef.current = newPositions;

    setGraphNodes(gn);
    setSettled(false);

    // Only reset zoom/pan on fresh starts, not incremental exploration
    if (!isIncremental) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [nodes, edges, centerUri, containerSize]);

  // Animated settling phase
  useEffect(() => {
    if (settled || graphNodes.length === 0 || containerSize.width === 0) return;

    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;
    let frameCount = 0;

    function animate() {
      frameCount++;
      setGraphNodes(prev => {
        const { nodes: updated, totalMovement } = stepSimulation(prev, edges, cx, cy);
        if (totalMovement < SETTLE_THRESHOLD * prev.length || frameCount > 300) {
          setSettled(true);
          // Save settled positions for next incremental update
          const pos = new Map<string, { x: number; y: number }>();
          for (const n of updated) pos.set(n.id, { x: n.x, y: n.y });
          prevPositionsRef.current = pos;
        }
        return updated;
      });
      setTime(t => t + 0.015);

      if (!settled) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [settled, graphNodes.length, containerSize, edges]);

  // Keep time ticking for highlight animations
  useEffect(() => {
    if (!settled || highlightedNodes.length === 0) return;

    function tick() {
      setTime(t => t + 0.015);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [settled, highlightedNodes.length]);

  // Grid
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const { width, height } = containerSize;
    if (width === 0) return lines;

    for (let x = 0; x < width; x += 30) {
      lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={height} stroke={theme.border.grid} strokeWidth={0.5} />);
    }
    for (let y = 0; y < height; y += 30) {
      lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={width} y2={y} stroke={theme.border.grid} strokeWidth={0.5} />);
    }
    return lines;
  }, [containerSize, theme.border.grid]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!activePredicate) return edges;
    return edges.filter(e => e.predicateUri === activePredicate);
  }, [edges, activePredicate]);

  // Edge path calculation
  const getEdgePath = useCallback((from: RawGraphNode, to: RawGraphNode) => {
    const x1 = from.x, y1 = from.y;
    const x2 = to.x, y2 = to.y;
    const mx = (x1 + x2) / 2 + (y1 - y2) * 0.1;
    const my = (y1 + y2) / 2 + (x2 - x1) * 0.1;
    return { path: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`, mx, my, x1, y1, x2, y2 };
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(4, Math.max(0.25, zoom * delta));

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const zoomRatio = newZoom / zoom;
    const newPanX = cursorX - (cursorX - pan.x) * zoomRatio;
    const newPanY = cursorY - (cursorY - pan.y) * zoomRatio;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPanPosRef.current.x;
    const dy = e.clientY - lastPanPosRef.current.y;
    lastPanPosRef.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Node index for edge rendering
  const nodeIndex = useMemo(() => {
    const idx = new Map<string, RawGraphNode>();
    for (const n of graphNodes) idx.set(n.id, n);
    return idx;
  }, [graphNodes]);

  if (containerSize.width === 0) {
    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        width={containerSize.width}
        height={containerSize.height}
        style={{ display: "block", background: "transparent", cursor: isPanningRef.current ? "grabbing" : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {/* Grid */}
        <g>{gridLines}</g>

        {/* Transformed content */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

          {/* Edges */}
          <g>
            {filteredEdges.map((edge, i) => {
              const fromNode = nodeIndex.get(edge.from);
              const toNode = nodeIndex.get(edge.to);
              if (!fromNode || !toNode) return null;

              const isHighlighted =
                highlightedNodes.length > 0 &&
                highlightedNodes.includes(edge.from) &&
                highlightedNodes.includes(edge.to);

              const isActive = !activePredicate || edge.predicateUri === activePredicate;
              const { path, mx, my, x1, y1, x2, y2 } = getEdgePath(fromNode, toNode);

              const baseAlpha = isHighlighted ? 0.7 : isActive ? 0.25 : 0.08;
              const pulse = isHighlighted ? Math.sin(time * 4) * 0.15 : 0;
              const alpha = Math.min(1, baseAlpha + pulse);

              // Particle on highlighted edges: travel for half the cycle, pause for the other half
              const cycle = (time * 0.6) % 2; // 0→1 travel, 1→2 pause
              const showParticle = cycle < 1;
              const t = showParticle ? cycle : 1;
              const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
              const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;

              return (
                <g key={`${edge.from}-${edge.predicate}-${edge.to}-${i}`}>
                  <path
                    d={path}
                    stroke={edge.color}
                    strokeOpacity={alpha}
                    strokeWidth={isHighlighted ? 1.5 : 0.75}
                    fill="none"
                  />
                  {/* Predicate label at midpoint */}
                  <text
                    x={mx}
                    y={my - 6}
                    fill={edge.color}
                    fillOpacity={isHighlighted ? 0.7 : 0.35}
                    fontSize={sz(7)}
                    fontFamily="'IBM Plex Mono', monospace"
                    textAnchor="middle"
                  >
                    {edge.predicate}
                  </text>
                  {isHighlighted && showParticle && <circle cx={px} cy={py} r={1.5} fill={theme.text.primary} />}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {graphNodes.map((node) => {
              const isCenter = node.id === centerUri;
              const isHighlighted = highlightedNodes.includes(node.id);
              const isHovered = hovered === node.id;
              const isDimmed = highlightedNodes.length > 0 && !isHighlighted;

              const alpha = isDimmed ? 0.25 : 1;
              const r = isCenter
                ? node.r
                : isHighlighted || isHovered ? node.r * 1.4 : node.r;
              const pulseR = isHighlighted && !settled ? Math.sin(time * 3) * 1.5 : 0;

              return (
                <g
                  key={node.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => onNodeClick(node)}
                  onDoubleClick={() => onNodeNavigate(node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Glow */}
                  {(isHighlighted || isHovered || isCenter) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r + 8 + pulseR}
                      fill="none"
                      stroke={node.color}
                      strokeOpacity={isCenter ? 0.15 : 0.25}
                      strokeWidth={isCenter ? 3 : 2}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + pulseR}
                    fill={node.color}
                    fillOpacity={alpha * (isCenter ? 0.35 : 0.2)}
                    stroke={node.color}
                    strokeOpacity={alpha}
                    strokeWidth={isCenter ? 1.5 : isHighlighted ? 1.25 : 0.75}
                  />

                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + r + 11}
                    fill={theme.text.primary}
                    fillOpacity={alpha * (isHighlighted || isCenter ? 1 : 0.7)}
                    fontSize={sz(isHovered || isCenter ? 8.5 : 7)}
                    fontWeight={isCenter || isHighlighted ? "bold" : "normal"}
                    fontFamily="'IBM Plex Sans', sans-serif"
                    textAnchor="middle"
                  >
                    {truncateLabel(node.label)}
                  </text>
                </g>
              );
            })}
          </g>

        </g>{/* Close transform group */}
      </svg>

      <ZoomControls
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(4, z * 1.2))}
        onZoomOut={() => setZoom(z => Math.max(0.25, z / 1.2))}
        onReset={handleResetView}
      />

      {/* Navigation hint */}
      <div style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        fontSize: sz(10),
        fontFamily: "'IBM Plex Mono', monospace",
        color: theme.text.hint,
      }}>
        click to select · double-click to navigate · shift+drag to pan
      </div>

      {/* Tooltip */}
      {hovered && (() => {
        const node = nodeIndex.get(hovered);
        if (!node) return null;

        // Adjust tooltip position for zoom/pan
        const screenX = node.x * zoom + pan.x;
        const screenY = node.y * zoom + pan.y;

        return (
          <div style={{
            position: "absolute",
            left: screenX + 20,
            top: screenY - 20,
            background: theme.surface.overlay,
            border: `1px solid ${node.color}44`,
            borderRadius: 8,
            padding: "10px 14px",
            pointerEvents: "none",
            backdropFilter: "blur(12px)",
            zIndex: 10,
            minWidth: 200,
            maxWidth: 320,
          }}>
            <div style={{
              color: node.color,
              fontWeight: 700,
              fontSize: sz(12),
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginBottom: node.description ? 4 : 4,
            }}>
              {node.label}
            </div>
            {node.description && (
              <div style={{
                color: theme.text.secondary,
                fontSize: sz(11),
                fontFamily: "'IBM Plex Sans', sans-serif",
                lineHeight: 1.4,
              }}>
                {node.description.length > 120
                  ? node.description.slice(0, 120) + "…"
                  : node.description}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
