import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@trustgraph/trustkit";
import type { VowlClass, VowlSelection } from "./types";
import type { OntologyProperty, SubClassRelation } from "@trustgraph/trustkit";

interface VowlCanvasProps {
  classes: VowlClass[];
  objectProperties: OntologyProperty[];
  subClassRelations: SubClassRelation[];
  datatypeProperties: OntologyProperty[];
  selection: VowlSelection;
  onSelect: (sel: VowlSelection) => void;
  onClassDoubleClick: (uri: string) => void;
}

interface LayoutNode {
  uri: string;
  label: string;
  comment?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "class" | "datatype";
  domain?: string;
  rangeLabel?: string;
  propUri?: string;
}

const REPULSION = 4000;
const DT_REPULSION = 1500;
const ATTRACTION = 0.012;
const DT_ATTRACTION = 0.03;
const IDEAL_LENGTH = 250;
const DT_IDEAL_LENGTH = 120;
const EDGE_LABEL_REPULSION = 1200;
const CENTER_GRAVITY = 0.002;
const DAMPING = 0.85;
const MAX_VELOCITY = 8;
const SETTLE_THRESHOLD = 0.3;
const CLASS_RADIUS = 40;
const DATATYPE_W = 70;
const DATATYPE_H = 24;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function getLocalName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return i >= 0 ? uri.substring(i + 1) : uri;
}

function truncate(s: string, max = 20): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

const CHAR_WIDTH_MONO = 6.5;
const MAX_LABEL_W = 140;
const LABEL_PAD = 14;

function labelWidth(text: string, charWidth = CHAR_WIDTH_MONO): number {
  return Math.min(text.length * charWidth + LABEL_PAD, MAX_LABEL_W);
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && current.length + 1 + word.length > maxChars) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  } else if (current && lines.length === maxLines) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1] + " " + current, maxChars);
  }
  return lines.map((line, i) => i === maxLines - 1 ? truncate(line, maxChars) : line);
}

interface Edge {
  uri: string;
  from: string;
  to: string;
  label: string;
  kind: "object" | "datatype" | "subclass";
}

export function VowlCanvas({
  classes,
  objectProperties,
  subClassRelations,
  datatypeProperties,
  selection,
  onSelect,
  onClassDoubleClick,
}: VowlCanvasProps) {
  const { theme, sz } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const nodesRef = useRef<LayoutNode[]>([]);
  const [renderNodes, setRenderNodes] = useState<LayoutNode[]>([]);
  const animRef = useRef(0);
  const [settled, setSettled] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const nodeDragRef = useRef<{
    uri: string;
    selType: "class" | "datatypeProperty";
    selUri: string;
    startScreenX: number;
    startScreenY: number;
    rectLeft: number;
    rectTop: number;
    cx: number;
    cy: number;
    zoom: number;
    moved: boolean;
  } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Sync classes AND datatype properties into layout nodes
  useEffect(() => {
    const existing = new Map(nodesRef.current.map((n) => [n.uri, n]));

    const total = classes.length;
    const radius = Math.max(150, total * 20);
    const classNodes: LayoutNode[] = classes.map((cls, i) => {
      const prev = existing.get(cls.uri);
      if (prev) return { ...prev, label: cls.label, comment: cls.comment, kind: "class" as const };
      const angle = (2 * Math.PI * i) / total - Math.PI / 2;
      return {
        uri: cls.uri, label: cls.label, comment: cls.comment,
        x: radius * Math.cos(angle), y: radius * Math.sin(angle),
        vx: 0, vy: 0, kind: "class" as const,
      };
    });

    const classMap = new Map(classNodes.map((c) => [c.uri, c]));
    const dtSeen = new Set<string>();
    const dtLayoutNodes: LayoutNode[] = [];
    for (const p of datatypeProperties) {
      if (!p.domain) continue;
      const key = `dt:${p.domain}|${p.uri}`;
      if (dtSeen.has(key)) continue;
      dtSeen.add(key);

      const prev = existing.get(key);
      if (prev) {
        dtLayoutNodes.push({
          ...prev, label: p.label, kind: "datatype" as const,
          rangeLabel: p.range ? getLocalName(p.range) : "literal",
        });
      } else {
        const domainNode = classMap.get(p.domain);
        const baseX = domainNode?.x ?? 0;
        const baseY = domainNode?.y ?? 0;
        const angle = Math.random() * 2 * Math.PI;
        dtLayoutNodes.push({
          uri: key, label: p.label,
          x: baseX + Math.cos(angle) * DT_IDEAL_LENGTH,
          y: baseY + Math.sin(angle) * DT_IDEAL_LENGTH,
          vx: 0, vy: 0, kind: "datatype" as const,
          domain: p.domain,
          rangeLabel: p.range ? getLocalName(p.range) : "literal",
          propUri: p.uri,
        });
      }
    }

    const nodes = [...classNodes, ...dtLayoutNodes];
    nodesRef.current = nodes;
    setRenderNodes(nodes);
    setSettled(false);
  }, [classes, datatypeProperties]);

  // Build edges — object property edges + datatype property links
  const edges: Edge[] = [];
  for (const p of objectProperties) {
    if (p.domain && p.range) {
      edges.push({ uri: p.uri, from: p.domain, to: p.range, label: p.label, kind: "object" });
    }
  }
  for (const r of subClassRelations) {
    edges.push({ uri: `subclass:${r.child}|${r.parent}`, from: r.child, to: r.parent, label: "subclass of", kind: "subclass" });
  }
  const dtEdgeSeen = new Set<string>();
  for (const p of datatypeProperties) {
    if (!p.domain) continue;
    const key = `dt:${p.domain}|${p.uri}`;
    if (dtEdgeSeen.has(key)) continue;
    dtEdgeSeen.add(key);
    edges.push({ uri: p.uri, from: p.domain, to: key, label: p.label, kind: "datatype" });
  }

  const nodeIndex = new Map<string, LayoutNode>();
  for (const n of renderNodes) nodeIndex.set(n.uri, n);

  // Force simulation
  useEffect(() => {
    if (settled || nodesRef.current.length === 0) return;
    let running = true;

    function step() {
      const nodes = nodesRef.current;
      const n = nodes.length;
      if (n === 0) { running = false; return; }

      const forces = nodes.map(() => ({ fx: 0, fy: 0 }));

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const rep = (nodes[i].kind === "class" && nodes[j].kind === "class")
            ? REPULSION : DT_REPULSION;
          const force = rep / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          forces[i].fx -= fx;
          forces[i].fy -= fy;
          forces[j].fx += fx;
          forces[j].fy += fy;
        }
      }

      const idx = new Map<string, number>();
      nodes.forEach((nd, i) => idx.set(nd.uri, i));

      for (const edge of edges) {
        const ai = idx.get(edge.from);
        const bi = idx.get(edge.to);
        if (ai === undefined || bi === undefined) continue;
        const dx = nodes[bi].x - nodes[ai].x;
        const dy = nodes[bi].y - nodes[ai].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealLen = edge.kind === "datatype" ? DT_IDEAL_LENGTH : IDEAL_LENGTH;
        const attr = edge.kind === "datatype" ? DT_ATTRACTION : ATTRACTION;
        const displacement = dist - idealLen;
        const force = attr * displacement;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces[ai].fx += fx;
        forces[ai].fy += fy;
        forces[bi].fx -= fx;
        forces[bi].fy -= fy;
      }

      // Repel datatype nodes away from object-property edge midpoints
      for (const edge of edges) {
        if (edge.kind !== "object") continue;
        const ai = idx.get(edge.from);
        const bi = idx.get(edge.to);
        if (ai === undefined || bi === undefined) continue;
        const mx = (nodes[ai].x + nodes[bi].x) / 2;
        const my = (nodes[ai].y + nodes[bi].y) / 2;
        for (let i = 0; i < n; i++) {
          if (nodes[i].kind !== "datatype") continue;
          const dx = nodes[i].x - mx;
          const dy = nodes[i].y - my;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = EDGE_LABEL_REPULSION / (dist * dist);
          forces[i].fx += (dx / dist) * force;
          forces[i].fy += (dy / dist) * force;
        }
      }

      for (let i = 0; i < n; i++) {
        if (nodes[i].kind === "class") {
          forces[i].fx -= nodes[i].x * CENTER_GRAVITY;
          forces[i].fy -= nodes[i].y * CENTER_GRAVITY;
        }
      }

      let totalMovement = 0;
      const pinnedUri = nodeDragRef.current?.uri;
      for (let i = 0; i < n; i++) {
        if (nodes[i].uri === pinnedUri) {
          nodes[i].vx = 0;
          nodes[i].vy = 0;
          continue;
        }
        nodes[i].vx = clamp((nodes[i].vx + forces[i].fx) * DAMPING, -MAX_VELOCITY, MAX_VELOCITY);
        nodes[i].vy = clamp((nodes[i].vy + forces[i].fy) * DAMPING, -MAX_VELOCITY, MAX_VELOCITY);
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
        totalMovement += Math.abs(nodes[i].vx) + Math.abs(nodes[i].vy);
      }

      setRenderNodes([...nodes]);

      if (pinnedUri) {
        if (running) animRef.current = requestAnimationFrame(step);
      } else if (totalMovement < SETTLE_THRESHOLD * n) {
        setSettled(true);
        running = false;
      } else if (running) {
        animRef.current = requestAnimationFrame(step);
      }
    }

    animRef.current = requestAnimationFrame(step);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [settled, edges.length, renderNodes.length]);

  // Pan/zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => clamp(z * factor, 0.15, 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const nd = nodeDragRef.current;
    if (nd) {
      const dist = Math.abs(e.clientX - nd.startScreenX) + Math.abs(e.clientY - nd.startScreenY);
      if (dist > 3) {
        nd.moved = true;
        const svgX = e.clientX - nd.rectLeft;
        const svgY = e.clientY - nd.rectTop;
        const gx = (svgX - nd.cx) / nd.zoom;
        const gy = (svgY - nd.cy) / nd.zoom;
        const node = nodesRef.current.find((n) => n.uri === nd.uri);
        if (node) {
          node.x = gx;
          node.y = gy;
          node.vx = 0;
          node.vy = 0;
          setRenderNodes([...nodesRef.current]);
          setSettled(false);
        }
      }
      return;
    }
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    const nd = nodeDragRef.current;
    if (nd) {
      if (!nd.moved) {
        onSelect({ type: nd.selType, uri: nd.selUri });
      }
      nodeDragRef.current = null;
      return;
    }
    dragRef.current = null;
  }, [onSelect]);

  const cx = size.w / 2 + pan.x;
  const cy = size.h / 2 + pan.y;

  const classColor = "#1f77b4";
  const classFill = "#aec7e8";
  const datatypeColor = "#2ca02c";
  const datatypeFill = "#c7e9c0";
  const selectedStroke = theme.palette.cyan;

  const isSelected = (type: string, uri: string) =>
    selection !== null && selection.type === type && selection.uri === uri;

  const classRenderNodes = renderNodes.filter((n) => n.kind === "class");
  const dtRenderNodes = renderNodes.filter((n) => n.kind === "datatype");
  const objectEdges = edges.filter((e) => e.kind === "object");
  const subClassEdges = edges.filter((e) => e.kind === "subclass");

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <svg
        width={size.w}
        height={size.h}
        style={{ cursor: dragRef.current ? "grabbing" : "default" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect width={size.w} height={size.h} fill="transparent" />

        <g transform={`translate(${cx},${cy}) scale(${zoom})`}>
          {/* Object property edges */}
          {(() => {
            const edgeKeySet = new Set(objectEdges.map((e) => `${e.from}|${e.to}`));
            const CURVE_OFFSET = 35;
            return objectEdges.map((edge, i) => {
            const from = nodeIndex.get(edge.from);
            const to = nodeIndex.get(edge.to);
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;

            const sx = from.x + (dx / dist) * CLASS_RADIUS;
            const sy = from.y + (dy / dist) * CLASS_RADIUS;
            const ex = to.x - (dx / dist) * CLASS_RADIUS;
            const ey = to.y - (dy / dist) * CLASS_RADIUS;

            const isBidi = edgeKeySet.has(`${edge.to}|${edge.from}`);
            const nx = -dy / dist;
            const ny = dx / dist;
            const curveOff = isBidi ? CURVE_OFFSET : 0;
            const cpx = mx + nx * curveOff;
            const cpy = my + ny * curveOff;
            const labelX = isBidi ? 0.25 * sx + 0.5 * cpx + 0.25 * ex : mx;
            const labelY = isBidi ? 0.25 * sy + 0.5 * cpy + 0.25 * ey : my;

            const edgeSelected = isSelected("objectProperty", edge.uri);
            const edgeLabelW = labelWidth(edge.label);
            const edgeMaxChars = Math.floor((MAX_LABEL_W - LABEL_PAD) / CHAR_WIDTH_MONO);

            return (
              <g key={`edge-${i}`}>
                <defs>
                  <marker
                    id={`arrow-${i}`}
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L8,3 L0,6" fill={edgeSelected ? selectedStroke : theme.text.subtle} />
                  </marker>
                </defs>
                {isBidi ? (
                  <path
                    d={`M ${sx},${sy} Q ${cpx},${cpy} ${ex},${ey}`}
                    fill="none"
                    stroke={edgeSelected ? selectedStroke : theme.text.subtle}
                    strokeWidth={edgeSelected ? 2.5 : 1.5}
                    markerEnd={`url(#arrow-${i})`}
                    opacity={edgeSelected ? 0.9 : 0.6}
                  />
                ) : (
                  <line
                    x1={sx}
                    y1={sy}
                    x2={ex}
                    y2={ey}
                    stroke={edgeSelected ? selectedStroke : theme.text.subtle}
                    strokeWidth={edgeSelected ? 2.5 : 1.5}
                    markerEnd={`url(#arrow-${i})`}
                    opacity={edgeSelected ? 0.9 : 0.6}
                  />
                )}
                <rect
                  x={labelX - edgeLabelW / 2}
                  y={labelY - 9}
                  width={edgeLabelW}
                  height={18}
                  rx={4}
                  fill={edgeSelected ? `${selectedStroke}22` : theme.surface.overlay}
                  stroke={edgeSelected ? selectedStroke : theme.text.subtle}
                  strokeWidth={edgeSelected ? 1.5 : 0.5}
                  opacity={0.9}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ type: "objectProperty", uri: edge.uri });
                  }}
                >
                  <title>{edge.label}</title>
                </rect>
                <text
                  x={labelX}
                  y={labelY + 4}
                  textAnchor="middle"
                  fontSize={sz(9)}
                  fontFamily={theme.font.mono}
                  fill={edgeSelected ? selectedStroke : theme.text.secondary}
                  style={{ cursor: "pointer", pointerEvents: "none" }}
                >
                  {truncate(edge.label, edgeMaxChars)}
                </text>
              </g>
            );
          });
          })()}

          {/* Subclass edges — dashed line with hollow arrowhead */}
          {subClassEdges.map((edge, i) => {
            const from = nodeIndex.get(edge.from);
            const to = nodeIndex.get(edge.to);
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const sx = from.x + (dx / dist) * CLASS_RADIUS;
            const sy = from.y + (dy / dist) * CLASS_RADIUS;
            const ex = to.x - (dx / dist) * CLASS_RADIUS;
            const ey = to.y - (dy / dist) * CLASS_RADIUS;

            return (
              <g key={`subclass-${i}`}>
                <defs>
                  <marker
                    id={`subclass-arrow-${i}`}
                    markerWidth="10"
                    markerHeight="8"
                    refX="10"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L10,4 L0,8 Z" fill="none" stroke={theme.text.subtle} strokeWidth={1} />
                  </marker>
                </defs>
                <line
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  stroke={theme.text.subtle}
                  strokeWidth={1.5}
                  strokeDasharray="6,4"
                  markerEnd={`url(#subclass-arrow-${i})`}
                  opacity={0.5}
                />
              </g>
            );
          })}

          {/* Datatype property edges and nodes */}
          {dtRenderNodes.map((dt) => {
            const from = dt.domain ? nodeIndex.get(dt.domain) : undefined;
            if (!from) return null;

            const dtSelected = isSelected("datatypeProperty", dt.propUri!);

            return (
              <g
                key={dt.uri}
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const el = containerRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  nodeDragRef.current = {
                    uri: dt.uri,
                    selType: "datatypeProperty",
                    selUri: dt.propUri!,
                    startScreenX: e.clientX,
                    startScreenY: e.clientY,
                    rectLeft: rect.left,
                    rectTop: rect.top,
                    cx,
                    cy,
                    zoom,
                    moved: false,
                  };
                }}
              >
                <title>{dt.label} ({dt.rangeLabel})</title>
                {(() => {
                  const longestText = dt.label.length > (dt.rangeLabel?.length || 0) ? dt.label : dt.rangeLabel || "";
                  const dtW = Math.max(DATATYPE_W, labelWidth(longestText));
                  const dtMaxChars = Math.floor((dtW - LABEL_PAD) / CHAR_WIDTH_MONO);
                  return (
                    <>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={dt.x}
                        y2={dt.y}
                        stroke={dtSelected ? selectedStroke : "#66bb6a"}
                        strokeWidth={dtSelected ? 1.5 : 1}
                        strokeDasharray="4,3"
                        opacity={dtSelected ? 0.8 : 0.6}
                      />
                      <rect
                        x={dt.x - dtW / 2}
                        y={dt.y - DATATYPE_H / 2}
                        width={dtW}
                        height={DATATYPE_H}
                        rx={3}
                        fill={datatypeFill}
                        stroke={dtSelected ? selectedStroke : datatypeColor}
                        strokeWidth={dtSelected ? 2.5 : 1.5}
                        opacity={0.85}
                      />
                      <text
                        x={dt.x}
                        y={dt.y - 2}
                        textAnchor="middle"
                        fontSize={sz(8)}
                        fontFamily={theme.font.mono}
                        fill="#333"
                        fontWeight={600}
                        style={{ pointerEvents: "none" }}
                      >
                        {truncate(dt.label, dtMaxChars)}
                      </text>
                      <text
                        x={dt.x}
                        y={dt.y + 10}
                        textAnchor="middle"
                        fontSize={sz(7)}
                        fontFamily={theme.font.mono}
                        fill="#666"
                        style={{ pointerEvents: "none" }}
                      >
                        {truncate(dt.rangeLabel || "", dtMaxChars)}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}

          {/* Class nodes (VOWL circles) */}
          {classRenderNodes.map((node) => {
            const classSelected = isSelected("class", node.uri);
            const isHovered = node.uri === hovered;
            const r = CLASS_RADIUS;
            const stroke = classSelected ? selectedStroke : classColor;
            const strokeWidth = classSelected || isHovered ? 3 : 2;
            const lines = wrapText(node.label, 12, 3);
            const lineHeight = sz(12);
            const textY = node.y - ((lines.length - 1) * lineHeight) / 2;

            return (
              <g
                key={node.uri}
                style={{ cursor: nodeDragRef.current?.uri === node.uri ? "grabbing" : "pointer" }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const el = containerRef.current;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  nodeDragRef.current = {
                    uri: node.uri,
                    selType: "class",
                    selUri: node.uri,
                    startScreenX: e.clientX,
                    startScreenY: e.clientY,
                    rectLeft: rect.left,
                    rectTop: rect.top,
                    cx,
                    cy,
                    zoom,
                    moved: false,
                  };
                }}
                onDoubleClick={() => onClassDoubleClick(node.uri)}
                onMouseEnter={() => setHovered(node.uri)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{node.label}{node.comment ? `\n${node.comment}` : ""}</title>
                {classSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + 6}
                    fill="none"
                    stroke={selectedStroke}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={classFill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
                <text
                  x={node.x}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={sz(10)}
                  fontFamily={theme.font.sans}
                  fontWeight={600}
                  fill="#1a1a2e"
                  style={{ pointerEvents: "none" }}
                >
                  {lines.map((line, li) => (
                    <tspan key={li} x={node.x} y={textY + li * lineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: sz(16),
          right: sz(16),
          display: "flex",
          flexDirection: "column",
          gap: sz(4),
        }}
      >
        {[
          { label: "+", action: () => setZoom((z) => clamp(z * 1.2, 0.15, 5)) },
          { label: "−", action: () => setZoom((z) => clamp(z * 0.8, 0.15, 5)) },
          { label: "⟳", action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              width: sz(28),
              height: sz(28),
              background: theme.surface.overlay,
              border: `1px solid ${theme.border.default}`,
              borderRadius: sz(6),
              color: theme.text.secondary,
              cursor: "pointer",
              fontSize: sz(14),
              fontFamily: theme.font.mono,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: sz(8),
          left: sz(12),
          fontSize: sz(9),
          fontFamily: theme.font.mono,
          color: theme.text.hint,
          opacity: 0.6,
        }}
      >
        shift+drag to pan · scroll to zoom · click to select
      </div>
    </div>
  );
}
