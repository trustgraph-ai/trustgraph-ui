import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { RawNode, RawEdge } from "../../hooks/useRawGraphData";
import { ZoomControls } from "../graph/ZoomControls";
import { border, text, surface } from "../../theme";

// ── Types ────────────────────────────────────────────────────────

interface Node3D extends RawNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

interface Projected {
  node: Node3D;
  sx: number;   // screen x
  sy: number;   // screen y
  scale: number; // perspective scale (closer = larger)
  depth: number; // raw z after camera transform (for sorting)
}

interface RawGraphCanvas3DProps {
  nodes: RawNode[];
  edges: RawEdge[];
  centerUri: string | null;
  highlightedNodes: string[];
  activePredicate: string | null;
  onNodeClick: (node: RawNode) => void;
  onNodeNavigate: (uri: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function truncateLabel(label: string, maxLength = 24): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 1) + "…";
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── 3D Force simulation ──────────────────────────────────────────

const REPULSION = 5000;
const ATTRACTION = 0.01;
const IDEAL_LENGTH = 350;
const CENTER_GRAVITY = 0.002;
const DAMPING = 0.85;
const MAX_VELOCITY = 10;
const SETTLE_THRESHOLD = 0.3;
const WARM_UP_STEPS = 120;
const PERSPECTIVE_DISTANCE = 800;
const BASE_NODE_RADIUS = 9;

function stepSimulation3D(
  nodes: Node3D[],
  edges: RawEdge[],
): { nodes: Node3D[]; totalMovement: number } {
  const n = nodes.length;
  const forces = nodes.map(() => ({ fx: 0, fy: 0, fz: 0 }));

  // Repulsion
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dz = nodes[j].z - nodes[i].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      forces[i].fx -= fx; forces[i].fy -= fy; forces[i].fz -= fz;
      forces[j].fx += fx; forces[j].fy += fy; forces[j].fz += fz;
    }
  }

  // Attraction
  const nodeIndex = new Map<string, number>();
  nodes.forEach((nd, i) => nodeIndex.set(nd.id, i));

  for (const edge of edges) {
    const ai = nodeIndex.get(edge.from);
    const bi = nodeIndex.get(edge.to);
    if (ai === undefined || bi === undefined) continue;
    const dx = nodes[bi].x - nodes[ai].x;
    const dy = nodes[bi].y - nodes[ai].y;
    const dz = nodes[bi].z - nodes[ai].z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const force = ATTRACTION * (dist - IDEAL_LENGTH);
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const fz = (dz / dist) * force;
    forces[ai].fx += fx; forces[ai].fy += fy; forces[ai].fz += fz;
    forces[bi].fx -= fx; forces[bi].fy -= fy; forces[bi].fz -= fz;
  }

  // Center gravity
  for (let i = 0; i < n; i++) {
    forces[i].fx -= nodes[i].x * CENTER_GRAVITY;
    forces[i].fy -= nodes[i].y * CENTER_GRAVITY;
    forces[i].fz -= nodes[i].z * CENTER_GRAVITY;
  }

  // Apply
  let totalMovement = 0;
  const updated = nodes.map((node, i) => {
    let vx = (node.vx + forces[i].fx) * DAMPING;
    let vy = (node.vy + forces[i].fy) * DAMPING;
    let vz = (node.vz + forces[i].fz) * DAMPING;
    vx = clamp(vx, -MAX_VELOCITY, MAX_VELOCITY);
    vy = clamp(vy, -MAX_VELOCITY, MAX_VELOCITY);
    vz = clamp(vz, -MAX_VELOCITY, MAX_VELOCITY);
    totalMovement += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    return { ...node, x: node.x + vx, y: node.y + vy, z: node.z + vz, vx, vy, vz };
  });

  return { nodes: updated, totalMovement };
}

// ── Camera & projection ──────────────────────────────────────────

interface Camera {
  rotX: number;  // pitch (radians)
  rotY: number;  // yaw (radians)
  panX: number;
  panY: number;
  zoom: number;  // distance multiplier
}

function project(
  node: Node3D,
  camera: Camera,
  cx: number,
  cy: number,
): Projected {
  // Rotate around Y axis (yaw)
  const cosY = Math.cos(camera.rotY);
  const sinY = Math.sin(camera.rotY);
  let x = node.x * cosY + node.z * sinY;
  const z1 = -node.x * sinY + node.z * cosY;
  let y = node.y;

  // Rotate around X axis (pitch)
  const cosX = Math.cos(camera.rotX);
  const sinX = Math.sin(camera.rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  y = y2;

  // Perspective projection
  const d = PERSPECTIVE_DISTANCE * camera.zoom;
  const depth = z2;
  const offset = 150 * camera.zoom;
  const scale = d / (d + z2 + offset);

  const sx = cx + x * scale + camera.panX;
  const sy = cy + y * scale + camera.panY;

  return { node, sx, sy, scale: Math.max(0.1, scale), depth };
}

// ── Component ────────────────────────────────────────────────────

export function RawGraphCanvas3D({
  nodes,
  edges,
  centerUri,
  highlightedNodes,
  activePredicate,
  onNodeClick,
  onNodeNavigate,
}: RawGraphCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [graphNodes, setGraphNodes] = useState<Node3D[]>([]);
  const [settled, setSettled] = useState(false);
  const [time, setTime] = useState(0);
  const animRef = useRef<number>(0);

  // Camera state
  const [camera, setCamera] = useState<Camera>({
    rotX: 0.3,
    rotY: 0.5,
    panX: 0,
    panY: 0,
    zoom: 1,
  });
  const isDraggingRef = useRef<false | "rotate" | "pan" | "zoom">(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Preserve positions across updates
  const prevPositionsRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Initialize and warm up
  useEffect(() => {
    if (containerSize.width === 0 || nodes.length === 0) return;

    const prevPositions = prevPositionsRef.current;

    let gn: Node3D[] = nodes.map((node, i) => {
      const existing = prevPositions.get(node.id);
      if (existing) {
        return { ...node, ...existing, vx: 0, vy: 0, vz: 0 };
      }

      // New node: place near a connected existing node
      const connectedExisting = edges
        .filter(e => e.from === node.id || e.to === node.id)
        .map(e => e.from === node.id ? e.to : e.from)
        .find(id => prevPositions.has(id));

      if (connectedExisting) {
        const anchor = prevPositions.get(connectedExisting)!;
        const offset = 60;
        return {
          ...node,
          x: anchor.x + (Math.random() - 0.5) * offset,
          y: anchor.y + (Math.random() - 0.5) * offset,
          z: anchor.z + (Math.random() - 0.5) * offset,
          vx: 0, vy: 0, vz: 0,
        };
      }

      // Fallback: sphere distribution
      const phi = Math.acos(2 * ((i / nodes.length) - 0.5));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const radius = 200 + Math.random() * 60;
      return {
        ...node,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        vx: 0, vy: 0, vz: 0,
      };
    });

    const isIncremental = prevPositions.size > 0;
    const warmUp = isIncremental ? 40 : WARM_UP_STEPS;

    for (let i = 0; i < warmUp; i++) {
      const result = stepSimulation3D(gn, edges);
      gn = result.nodes;
    }

    const newPositions = new Map<string, { x: number; y: number; z: number }>();
    for (const nd of gn) newPositions.set(nd.id, { x: nd.x, y: nd.y, z: nd.z });
    prevPositionsRef.current = newPositions;

    setGraphNodes(gn);
    setSettled(false);
  }, [nodes, edges, centerUri, containerSize]);

  // Animated settling
  useEffect(() => {
    if (settled || graphNodes.length === 0 || containerSize.width === 0) return;

    let frameCount = 0;
    function animate() {
      frameCount++;
      setGraphNodes(prev => {
        const { nodes: updated, totalMovement } = stepSimulation3D(prev, edges);
        if (totalMovement < SETTLE_THRESHOLD * prev.length || frameCount > 300) {
          setSettled(true);
          const pos = new Map<string, { x: number; y: number; z: number }>();
          for (const nd of updated) pos.set(nd.id, { x: nd.x, y: nd.y, z: nd.z });
          prevPositionsRef.current = pos;
        }
        return updated;
      });
      setTime(t => t + 0.015);
      animRef.current = requestAnimationFrame(animate);
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

  // Project all nodes
  const projected = useMemo(() => {
    if (containerSize.width === 0) return [];
    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;
    return graphNodes.map(n => project(n, camera, cx, cy));
  }, [graphNodes, camera, containerSize]);

  // Z-sorted (back to front)
  const sortedProjected = useMemo(() => {
    return [...projected].sort((a, b) => b.depth - a.depth);
  }, [projected]);

  // Node index for edge rendering
  const projIndex = useMemo(() => {
    const idx = new Map<string, Projected>();
    for (const p of projected) idx.set(p.node.id, p);
    return idx;
  }, [projected]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!activePredicate) return edges;
    return edges.filter(e => e.predicateUri === activePredicate);
  }, [edges, activePredicate]);

  // Grid (subtle, fixed)
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    const { width, height } = containerSize;
    if (width === 0) return lines;
    for (let x = 0; x < width; x += 30) {
      lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={height} stroke={border.grid} strokeWidth={0.5} />);
    }
    for (let y = 0; y < height; y += 30) {
      lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={width} y2={y} stroke={border.grid} strokeWidth={0.5} />);
    }
    return lines;
  }, [containerSize]);

  // ── Mouse handlers ─────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (e.button === 0) {
      isDraggingRef.current = "rotate";
    } else if (e.button === 1) {
      isDraggingRef.current = "zoom";
    } else if (e.button === 2) {
      isDraggingRef.current = "pan";
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current === "rotate") {
      setCamera(c => ({
        ...c,
        rotY: c.rotY + dx * 0.005,
        rotX: clamp(c.rotX + dy * 0.005, -Math.PI / 2, Math.PI / 2),
      }));
    } else if (isDraggingRef.current === "pan") {
      setCamera(c => ({
        ...c,
        panX: c.panX + dx,
        panY: c.panY + dy,
      }));
    } else if (isDraggingRef.current === "zoom") {
      setCamera(c => ({
        ...c,
        zoom: clamp(c.zoom - dy * 0.01, 0.02, 8),
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.12 : 0.88;
    setCamera(c => ({
      ...c,
      zoom: clamp(c.zoom * delta, 0.02, 8),
    }));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleResetView = useCallback(() => {
    setCamera({ rotX: 0.3, rotY: 0.5, panX: 0, panY: 0, zoom: 1 });
  }, []);

  // ── Node click (needs to not fire on drag) ─────────────────────

  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  const handleNodeMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleNodeMouseUp = useCallback((node: RawNode, e: React.MouseEvent) => {
    const dx = e.clientX - mouseDownPosRef.current.x;
    const dy = e.clientY - mouseDownPosRef.current.y;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  const handleNodeDblClick = useCallback((uri: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeNavigate(uri);
  }, [onNodeNavigate]);

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
        style={{ display: "block", background: "transparent", cursor: isDraggingRef.current ? "grabbing" : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        {/* Grid */}
        <g>{gridLines}</g>

        {/* Edges (drawn before nodes, no z-sort needed — they fade by depth) */}
        <g>
          {filteredEdges.map((edge, i) => {
            const fromP = projIndex.get(edge.from);
            const toP = projIndex.get(edge.to);
            if (!fromP || !toP) return null;

            const isHighlighted =
              highlightedNodes.length > 0 &&
              highlightedNodes.includes(edge.from) &&
              highlightedNodes.includes(edge.to);

            const avgScale = (fromP.scale + toP.scale) / 2;
            const depthAlpha = clamp(avgScale * 0.8, 0.05, 1);
            const baseAlpha = isHighlighted ? 0.7 : 0.2;
            const pulse = isHighlighted ? Math.sin(time * 4) * 0.15 : 0;
            const alpha = clamp((baseAlpha + pulse) * depthAlpha, 0.02, 1);

            // Curved edge
            const mx = (fromP.sx + toP.sx) / 2 + (fromP.sy - toP.sy) * 0.08;
            const my = (fromP.sy + toP.sy) / 2 + (toP.sx - fromP.sx) * 0.08;
            const path = `M ${fromP.sx} ${fromP.sy} Q ${mx} ${my} ${toP.sx} ${toP.sy}`;

            // Particle
            const cycle = (time * 0.6) % 2;
            const showParticle = isHighlighted && cycle < 1;
            const t = showParticle ? cycle : 0;
            const px = (1 - t) * (1 - t) * fromP.sx + 2 * (1 - t) * t * mx + t * t * toP.sx;
            const py = (1 - t) * (1 - t) * fromP.sy + 2 * (1 - t) * t * my + t * t * toP.sy;

            return (
              <g key={`${edge.from}-${edge.predicate}-${edge.to}-${i}`}>
                <path
                  d={path}
                  stroke={edge.color}
                  strokeOpacity={alpha}
                  strokeWidth={isHighlighted ? 1.5 * avgScale : 0.75 * avgScale}
                  fill="none"
                />
                {isHighlighted && (
                  <text
                    x={mx} y={my - 5 * avgScale}
                    fill={edge.color}
                    fillOpacity={0.6 * depthAlpha}
                    fontSize={7 * avgScale}
                    fontFamily="'IBM Plex Mono', monospace"
                    textAnchor="middle"
                  >
                    {edge.predicate}
                  </text>
                )}
                {showParticle && (
                  <circle cx={px} cy={py} r={1.5 * avgScale} fill="#fff" fillOpacity={depthAlpha} />
                )}
              </g>
            );
          })}
        </g>

        {/* Nodes (z-sorted, back to front) */}
        <g>
          {sortedProjected.map(({ node, sx, sy, scale }) => {
            const isCenter = node.id === centerUri;
            const isHighlighted = highlightedNodes.includes(node.id);
            const isHovered = hovered === node.id;
            const isDimmed = highlightedNodes.length > 0 && !isHighlighted;

            const depthAlpha = clamp(scale * 0.9, 0.08, 1);
            const alpha = isDimmed ? depthAlpha * 0.25 : depthAlpha;
            const r = BASE_NODE_RADIUS * scale * (isCenter ? 1.3 : isHighlighted || isHovered ? 1.3 : 1);
            const pulseR = isHighlighted && !settled ? Math.sin(time * 3) * 1.5 * scale : 0;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onMouseDown={handleNodeMouseDown}
                onMouseUp={(e) => handleNodeMouseUp(node, e)}
                onDoubleClick={(e) => handleNodeDblClick(node.id, e)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Glow */}
                {(isHighlighted || isHovered || isCenter) && (
                  <circle
                    cx={sx} cy={sy}
                    r={r + 6 * scale + pulseR}
                    fill="none"
                    stroke={node.color}
                    strokeOpacity={isCenter ? 0.12 * depthAlpha : 0.2 * depthAlpha}
                    strokeWidth={(isCenter ? 3 : 2) * scale}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={sx} cy={sy}
                  r={r + pulseR}
                  fill={node.color}
                  fillOpacity={alpha * (isCenter ? 0.35 : 0.2)}
                  stroke={node.color}
                  strokeOpacity={alpha}
                  strokeWidth={(isCenter ? 1.5 : isHighlighted ? 1.25 : 0.75) * scale}
                />

                {/* Label — only show if close enough */}
                {scale > 0.35 && (
                  <text
                    x={sx}
                    y={sy + r + 8 * scale}
                    fill={`rgba(255,255,255,${alpha * (isHighlighted || isCenter ? 1 : 0.7)})`}
                    fontSize={(isHovered || isCenter ? 8.5 : 7) * scale}
                    fontWeight={isCenter || isHighlighted ? "bold" : "normal"}
                    fontFamily="'IBM Plex Sans', sans-serif"
                    textAnchor="middle"
                  >
                    {truncateLabel(node.label)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <ZoomControls
        zoom={1 / camera.zoom}
        onZoomIn={() => setCamera(c => ({ ...c, zoom: clamp(c.zoom * 0.8, 0.02, 8) }))}
        onZoomOut={() => setCamera(c => ({ ...c, zoom: clamp(c.zoom * 1.2, 0.02, 8) }))}
        onReset={handleResetView}
      />

      {/* Controls hint */}
      <div style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        color: text.hint,
      }}>
        drag to rotate · scroll to zoom · right-drag to pan
      </div>

      {/* Tooltip */}
      {hovered && (() => {
        const p = projIndex.get(hovered);
        if (!p) return null;

        return (
          <div style={{
            position: "absolute",
            left: p.sx + 20,
            top: p.sy - 20,
            background: surface.overlay,
            border: `1px solid ${p.node.color}44`,
            borderRadius: 8,
            padding: "10px 14px",
            pointerEvents: "none",
            backdropFilter: "blur(12px)",
            zIndex: 10,
            minWidth: 200,
            maxWidth: 320,
          }}>
            <div style={{
              color: p.node.color,
              fontWeight: 700,
              fontSize: 12,
              fontFamily: "'IBM Plex Sans', sans-serif",
              marginBottom: p.node.description ? 4 : 0,
            }}>
              {p.node.label}
            </div>
            {p.node.description && (
              <div style={{
                color: text.secondary,
                fontSize: 11,
                fontFamily: "'IBM Plex Sans', sans-serif",
                lineHeight: 1.4,
              }}>
                {p.node.description.length > 120
                  ? p.node.description.slice(0, 120) + "…"
                  : p.node.description}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
