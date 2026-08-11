import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { DomainKey, Entity, GraphNode, OntologyType, Relationship } from "../../types";
import { ZoomControls } from "./ZoomControls";
import { useTheme } from "../../theme/ThemeContext";

function truncateLabel(label: string, maxLength = 30): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 1) + "…";
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

interface GraphCanvas3DProps {
  entities: Entity[];
  relationships: Relationship[];
  ontology: OntologyType;
  highlightedEntities: string[];
  onNodeClick: (node: GraphNode) => void;
  activeFilter: DomainKey | null;
}

// ── 3D types ────────────────────────────────────────────────────

interface Node3D extends Entity {
  x: number;
  y: number;
  z: number;
  r: number;
}

interface Projected {
  node: Node3D;
  sx: number;
  sy: number;
  scale: number;
  depth: number;
}

// ── Camera math ─────────────────────────────────────────────────

type Mat3 = [number, number, number, number, number, number, number, number, number];

function mat3Multiply(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0]*b[0] + a[1]*b[3] + a[2]*b[6], a[0]*b[1] + a[1]*b[4] + a[2]*b[7], a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
    a[3]*b[0] + a[4]*b[3] + a[5]*b[6], a[3]*b[1] + a[4]*b[4] + a[5]*b[7], a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
    a[6]*b[0] + a[7]*b[3] + a[8]*b[6], a[6]*b[1] + a[7]*b[4] + a[8]*b[7], a[6]*b[2] + a[7]*b[5] + a[8]*b[8],
  ];
}

function mat3RotX(angle: number): Mat3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function mat3RotY(angle: number): Mat3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function mat3Apply(m: Mat3, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0]*x + m[1]*y + m[2]*z,
    m[3]*x + m[4]*y + m[5]*z,
    m[6]*x + m[7]*y + m[8]*z,
  ];
}

interface Camera {
  rot: Mat3;
  panX: number;
  panY: number;
  zoom: number;
}

const PERSPECTIVE_DISTANCE = 1600;
const BASE_NODE_RADIUS = 9;

function project(
  node: Node3D,
  camera: Camera,
  cx: number,
  cy: number,
): Projected {
  const [x, y, z2] = mat3Apply(camera.rot, node.x, node.y, node.z);
  const d = PERSPECTIVE_DISTANCE * camera.zoom;
  const depth = z2;
  const offset = 150 * camera.zoom;
  const scale = d / (d + z2 + offset);
  const sx = cx + x * scale + camera.panX;
  const sy = cy + y * scale + camera.panY;
  return { node, sx, sy, scale: Math.max(0.1, scale), depth };
}

// ── Component ───────────────────────────────────────────────────

export function GraphCanvas3D({ entities, relationships, ontology, highlightedEntities, onNodeClick, activeFilter }: GraphCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const animRef = useRef<number>(0);
  const { theme, sz } = useTheme();

  const [camera, setCamera] = useState<Camera>(() => ({
    rot: mat3Multiply(mat3RotX(0.3), mat3RotY(0.5)),
    panX: 0,
    panY: 0,
    zoom: 1,
  }));
  const isDraggingRef = useRef<false | "rotate" | "pan" | "zoom">(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

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

  // Place nodes on sphere by domain
  const { nodes3d, domainCenters } = useMemo(() => {
    if (containerSize.width === 0) return { nodes3d: [] as Node3D[], domainCenters: [] as { domain: DomainKey; x: number; y: number; z: number; color: string; label: string }[] };

    const domainKeys = Object.keys(ontology);
    const domainRadius = Math.min(containerSize.width, containerSize.height) * 0.55;
    const subRadius = Math.min(containerSize.width, containerSize.height) * 0.12;

    // Distribute domain centers on a sphere using golden spiral
    const centers = domainKeys.map((domain, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / domainKeys.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        domain,
        x: domainRadius * Math.sin(phi) * Math.cos(theta),
        y: domainRadius * Math.sin(phi) * Math.sin(theta),
        z: domainRadius * Math.cos(phi),
        color: ontology[domain].color,
        label: ontology[domain].label,
      };
    });

    const centerMap = new Map(centers.map(c => [c.domain, c]));

    const nodes3d: Node3D[] = entities.map((e) => {
      const dc = centerMap.get(e.domain)!;
      const subs = ontology[e.domain].subclasses;
      const subIdx = subs.findIndex((s) => s.id === e.id);
      const total = subs.length;

      // Distribute entities in a small sphere around their domain center
      const phi = Math.acos(1 - (2 * (subIdx + 0.5)) / Math.max(total, 1));
      const theta = Math.PI * (1 + Math.sqrt(5)) * subIdx;
      const x = dc.x + subRadius * Math.sin(phi) * Math.cos(theta);
      const y = dc.y + subRadius * Math.sin(phi) * Math.sin(theta);
      const z = dc.z + subRadius * Math.cos(phi);

      return { ...e, x, y, z, r: BASE_NODE_RADIUS };
    });

    return { nodes3d, domainCenters: centers };
  }, [entities, ontology, containerSize]);

  // Animation for highlights
  useEffect(() => {
    if (!highlightedEntities || highlightedEntities.length === 0) return;
    function tick() {
      setTime(t => t + 0.015);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [highlightedEntities]);

  // Project all nodes
  const projected = useMemo(() => {
    if (containerSize.width === 0) return [];
    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;
    return nodes3d.map(n => project(n, camera, cx, cy));
  }, [nodes3d, camera, containerSize]);

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

  // Projected domain centers for labels
  const projectedDomainCenters = useMemo(() => {
    if (containerSize.width === 0) return [];
    const cx = containerSize.width / 2;
    const cy = containerSize.height / 2;
    return domainCenters.map(dc => {
      const [x, y, z2] = mat3Apply(camera.rot, dc.x, dc.y, dc.z);
      const d = PERSPECTIVE_DISTANCE * camera.zoom;
      const offset = 150 * camera.zoom;
      const scale = d / (d + z2 + offset);
      return {
        ...dc,
        sx: cx + x * scale + camera.panX,
        sy: cy + y * scale + camera.panY,
        scale: Math.max(0.1, scale),
        depth: z2,
      };
    });
  }, [domainCenters, camera, containerSize]);

  // Filtered edges
  const filteredRels = useMemo(() => {
    if (!activeFilter) return relationships;
    return relationships.filter((r) => r.domain.includes(activeFilter));
  }, [relationships, activeFilter]);

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
  }, [containerSize, theme]);

  // ── Mouse handlers ────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    if (e.button === 0) isDraggingRef.current = "rotate";
    else if (e.button === 1) isDraggingRef.current = "zoom";
    else if (e.button === 2) isDraggingRef.current = "pan";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current === "rotate") {
      setCamera(c => ({
        ...c,
        rot: mat3Multiply(mat3Multiply(mat3RotX(dy * 0.005), mat3RotY(-dx * 0.005)), c.rot),
      }));
    } else if (isDraggingRef.current === "pan") {
      setCamera(c => ({ ...c, panX: c.panX + dx, panY: c.panY + dy }));
    } else if (isDraggingRef.current === "zoom") {
      setCamera(c => ({ ...c, zoom: clamp(c.zoom - dy * 0.01, 0.02, 8) }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.12 : 0.88;
    setCamera(c => ({ ...c, zoom: clamp(c.zoom * delta, 0.02, 8) }));
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleResetView = useCallback(() => {
    setCamera({ rot: mat3Multiply(mat3RotX(0.3), mat3RotY(0.5)), panX: 0, panY: 0, zoom: 1 });
  }, []);

  // ── Node click (distinguish from drag) ────────────────────────

  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  const handleNodeMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleNodeMouseUp = useCallback((node: Node3D, e: React.MouseEvent) => {
    const dx = e.clientX - mouseDownPosRef.current.x;
    const dy = e.clientY - mouseDownPosRef.current.y;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
      onNodeClick(node as unknown as GraphNode);
    }
  }, [onNodeClick]);

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
        {/* Bloom filters */}
        <defs>
          <filter id="gc3d-bloom-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="gc3d-bloom-strong" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="gc3d-bloom-edge" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid */}
        <g>{gridLines}</g>

        {/* Domain labels */}
        <g>
          {projectedDomainCenters.map(dc => (
            dc.scale > 0.25 && (
              <text
                key={dc.domain}
                x={dc.sx}
                y={dc.sy}
                fill={dc.color + "44"}
                fillOpacity={clamp(dc.scale * 0.8, 0.05, 1)}
                fontSize={sz(11) * dc.scale}
                fontWeight="bold"
                fontFamily={theme.font.mono}
                textAnchor="middle"
              >
                {dc.label.toUpperCase()}
              </text>
            )
          ))}
        </g>

        {/* Edges */}
        <g>
          {filteredRels.map((rel, i) => {
            const fromP = projIndex.get(rel.from);
            const toP = projIndex.get(rel.to);
            if (!fromP || !toP) return null;

            const isHighlighted =
              highlightedEntities &&
              highlightedEntities.includes(rel.from) &&
              highlightedEntities.includes(rel.to);

            const avgScale = (fromP.scale + toP.scale) / 2;
            const depthAlpha = clamp(avgScale * 0.8, 0.05, 1);
            const baseAlpha = isHighlighted ? 0.7 : 0.12;
            const pulse = isHighlighted ? Math.sin(time * 4) * 0.15 : 0;
            const alpha = clamp((baseAlpha + pulse) * depthAlpha, 0.02, 1);

            const mx = (fromP.sx + toP.sx) / 2 + (fromP.sy - toP.sy) * 0.08;
            const my = (fromP.sy + toP.sy) / 2 + (toP.sx - fromP.sx) * 0.08;
            const path = `M ${fromP.sx} ${fromP.sy} Q ${mx} ${my} ${toP.sx} ${toP.sy}`;

            const cycle = (time * 0.6) % 2;
            const showParticle = isHighlighted && cycle < 1;
            const t = showParticle ? cycle : 0;
            const px = (1 - t) * (1 - t) * fromP.sx + 2 * (1 - t) * t * mx + t * t * toP.sx;
            const py = (1 - t) * (1 - t) * fromP.sy + 2 * (1 - t) * t * my + t * t * toP.sy;

            return (
              <g key={`${rel.from}-${rel.predicate}-${rel.to}-${i}`} filter={isHighlighted ? "url(#gc3d-bloom-edge)" : undefined}>
                <defs>
                  <linearGradient id={`gc3d-grad-${rel.from}-${rel.to}-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={fromP.node.color} stopOpacity={alpha} />
                    <stop offset="100%" stopColor={toP.node.color} stopOpacity={alpha} />
                  </linearGradient>
                </defs>
                <path
                  d={path}
                  stroke={`url(#gc3d-grad-${rel.from}-${rel.to}-${i})`}
                  strokeWidth={(isHighlighted ? 1.5 : 0.75) * avgScale}
                  fill="none"
                />
                {showParticle && (
                  <circle cx={px} cy={py} r={1.5 * avgScale} fill={theme.text.primary} fillOpacity={depthAlpha} />
                )}
              </g>
            );
          })}
        </g>

        {/* Nodes (z-sorted, back to front) */}
        <g>
          {sortedProjected.map(({ node, sx, sy, scale }) => {
            const isHighlighted = highlightedEntities && highlightedEntities.includes(node.id);
            const isHovered = hovered === node.id;
            const isDimmed = highlightedEntities && highlightedEntities.length > 0 && !isHighlighted;
            const isFiltered = activeFilter && node.domain !== activeFilter && !relationships.some(
              r => r.domain.includes(activeFilter) && (r.from === node.id || r.to === node.id)
            );

            const depthAlpha = clamp(scale * 0.9, 0.08, 1);
            const alpha = isFiltered ? depthAlpha * 0.15 : isDimmed ? depthAlpha * 0.3 : depthAlpha;
            const r = BASE_NODE_RADIUS * scale * (isHighlighted || isHovered ? 1.4 : 1);
            const pulseR = isHighlighted ? Math.sin(time * 3) * 1.5 * scale : 0;

            const bloomFilter = (isHighlighted || isHovered)
              ? "url(#gc3d-bloom-strong)"
              : !isDimmed && !isFiltered ? "url(#gc3d-bloom-soft)" : undefined;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                filter={bloomFilter}
                onMouseDown={handleNodeMouseDown}
                onMouseUp={(e) => handleNodeMouseUp(node, e)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {(isHighlighted || isHovered) && !isFiltered && (
                  <circle
                    cx={sx} cy={sy}
                    r={r + 6 * scale + pulseR}
                    fill="none"
                    stroke={node.color}
                    strokeOpacity={0.2 * depthAlpha}
                    strokeWidth={2 * scale}
                  />
                )}

                <circle
                  cx={sx} cy={sy}
                  r={r + pulseR}
                  fill={node.color}
                  fillOpacity={alpha * 0.2}
                  stroke={node.color}
                  strokeOpacity={alpha}
                  strokeWidth={(isHighlighted ? 1.25 : 0.75) * scale}
                />

                {scale > 0.35 && (
                  <text
                    x={sx}
                    y={sy + r + 8 * scale}
                    fill={theme.text.primary}
                    fillOpacity={alpha * (isHighlighted ? 1 : 0.7)}
                    fontSize={sz(isHovered ? 8.5 : 7) * scale}
                    fontWeight={isHighlighted ? "bold" : "normal"}
                    fontFamily={theme.font.sans}
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
        fontSize: sz(10),
        fontFamily: theme.font.mono,
        color: theme.text.hint,
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
            background: theme.surface.overlay,
            border: `1px solid ${p.node.color}44`,
            borderRadius: 8,
            padding: "10px 14px",
            pointerEvents: "none",
            backdropFilter: "blur(12px)",
            zIndex: 10,
            minWidth: 180,
          }}>
            <div style={{ color: p.node.color, fontWeight: 700, fontSize: sz(13), fontFamily: theme.font.mono }}>
              {p.node.icon} {p.node.label}
            </div>
            <div style={{ color: "#888", fontSize: sz(11), marginTop: 4, fontFamily: theme.font.mono }}>
              {Object.entries(p.node.props || {}).map(([k, v]) => (
                <div key={k}><span style={{ color: "#666" }}>{k}:</span> <span style={{ color: "#ccc" }}>{String(v)}</span></div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
