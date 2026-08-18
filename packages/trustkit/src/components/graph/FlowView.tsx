import { useMemo, useRef, useState, useEffect } from "react";
import { useTheme } from "../../theme/ThemeContext";

export interface NodeStyle {
  icon: string;
  color: string;
}

export type NodeStyleFn = (uri: string, label: string) => NodeStyle;

export interface FlowStep {
  label: string;
  uri?: string;
  predicate?: string;
  parentUri?: string;
}

export interface FlowChain {
  id: string;
  color: string;
  steps: FlowStep[];
}

const DEFAULT_STYLE: NodeStyle = { icon: "\u25CF", color: "#9CA3AF" };
const defaultNodeStyle: NodeStyleFn = () => DEFAULT_STYLE;

interface FlowNode {
  id: string;
  label: string;
  tier: number;
  lane: number;
  chainIds: Set<string>;
  isFocal: boolean;
  style: NodeStyle;
}

interface FlowEdge {
  from: string;
  to: string;
  predicate: string;
  chainId: string;
  color: string;
}

function dims(sz: (n: number) => number) {
  const ICON_R = sz(18);
  const LABEL_W = sz(120);
  const NODE_W = LABEL_W;
  const NODE_H = ICON_R * 2 + sz(22);
  const TIER_GAP = sz(60);
  const LANE_GAP = sz(12);
  const PAD_X = sz(40);
  const PAD_Y = sz(40);
  return { ICON_R, LABEL_W, NODE_W, NODE_H, TIER_GAP, LANE_GAP, PAD_X, PAD_Y };
}

export interface FlowViewProps {
  chains: FlowChain[];
  onNodeClick?: (uri: string) => void;
  selectedUri?: string | null;
  nodeStyle?: NodeStyleFn;
  emptyMessage?: string;
}

export function FlowView({
  chains,
  onNodeClick,
  selectedUri,
  nodeStyle = defaultNodeStyle,
  emptyMessage = "No data to display",
}: FlowViewProps) {
  const { theme, sz } = useTheme();
  const { ICON_R, NODE_W, NODE_H, TIER_GAP, LANE_GAP, PAD_X, PAD_Y } = dims(sz);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { nodes, edges, tiers } = useMemo(() => {
    const nodeMap = new Map<string, FlowNode>();
    const edgeList: FlowEdge[] = [];
    const edgeSet = new Set<string>();
    const children = new Map<string, Set<string>>();

    for (const chain of chains) {
      const steps = chain.steps;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const id = step.uri ?? `__anon_${chain.id}_${i}`;

        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            label: step.label,
            tier: -1,
            lane: 0,
            chainIds: new Set([chain.id]),
            isFocal: i === 0,
            style: nodeStyle(id, step.label),
          });
        } else {
          nodeMap.get(id)!.chainIds.add(chain.id);
          if (i === 0) nodeMap.get(id)!.isFocal = true;
        }

        const rawPred = step.predicate ?? "";
        const isIncoming = rawPred.startsWith("\u2190 ") || rawPred.startsWith("<- ");
        const predLabel = isIncoming ? rawPred.replace(/^(\u2190 |<- )/, "") : rawPred;

        const parentId = step.parentUri ?? (i === 0 ? null : null);
        if (parentId && nodeMap.has(parentId)) {
          const from = isIncoming ? id : parentId;
          const to = isIncoming ? parentId : id;
          const edgeKey = `${from}\u2192${to}\u2192${predLabel}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edgeList.push({
              from,
              to,
              predicate: predLabel,
              chainId: chain.id,
              color: chain.color,
            });
          }
          if (!children.has(parentId)) children.set(parentId, new Set());
          children.get(parentId)!.add(id);
        } else if (i > 0 && !step.parentUri) {
          const prevStep = steps[i - 1];
          const prevId = prevStep.uri ?? `__anon_${chain.id}_${i - 1}`;
          const from = isIncoming ? id : prevId;
          const to = isIncoming ? prevId : id;
          const edgeKey = `${from}\u2192${to}\u2192${predLabel}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            edgeList.push({
              from,
              to,
              predicate: predLabel,
              chainId: chain.id,
              color: chain.color,
            });
          }
          if (!children.has(prevId)) children.set(prevId, new Set());
          children.get(prevId)!.add(id);
        }
      }
    }

    const focalNodes = Array.from(nodeMap.values()).filter((n) => n.isFocal);
    const visited = new Set<string>();
    const queue: { id: string; tier: number }[] = [];

    for (const f of focalNodes) {
      f.tier = 0;
      visited.add(f.id);
      queue.push({ id: f.id, tier: 0 });
    }

    while (queue.length > 0) {
      const { id, tier } = queue.shift()!;
      const kids = children.get(id);
      if (!kids) continue;
      for (const childId of kids) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        const child = nodeMap.get(childId);
        if (child) {
          child.tier = tier + 1;
          queue.push({ id: childId, tier: tier + 1 });
        }
      }
    }

    for (const node of nodeMap.values()) {
      if (node.tier < 0) node.tier = 0;
    }

    const tierMap = new Map<number, FlowNode[]>();
    for (const node of nodeMap.values()) {
      const arr = tierMap.get(node.tier) ?? [];
      arr.push(node);
      tierMap.set(node.tier, arr);
    }

    const neighbours = new Map<string, Set<string>>();
    for (const edge of edgeList) {
      if (!neighbours.has(edge.from)) neighbours.set(edge.from, new Set());
      if (!neighbours.has(edge.to)) neighbours.set(edge.to, new Set());
      neighbours.get(edge.from)!.add(edge.to);
      neighbours.get(edge.to)!.add(edge.from);
    }

    for (const [, tierNodes] of tierMap) {
      tierNodes.sort((a, b) => a.label.localeCompare(b.label));
      tierNodes.forEach((n, i) => { n.lane = i; });
    }

    const maxTierIdx = Math.max(...tierMap.keys());
    const ITERATIONS = 4;
    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (let t = 1; t <= maxTierIdx; t++) {
        const tierNodes = tierMap.get(t);
        if (!tierNodes) continue;
        for (const node of tierNodes) {
          const nbrs = neighbours.get(node.id);
          if (!nbrs || nbrs.size === 0) continue;
          let sum = 0, count = 0;
          for (const nbrId of nbrs) {
            const nbr = nodeMap.get(nbrId);
            if (nbr && nbr.tier !== t) { sum += nbr.lane; count++; }
          }
          if (count > 0) node.lane = sum / count;
        }
        tierNodes.sort((a, b) => a.lane - b.lane);
        tierNodes.forEach((n, i) => { n.lane = i; });
      }

      for (let t = maxTierIdx - 1; t >= 0; t--) {
        const tierNodes = tierMap.get(t);
        if (!tierNodes) continue;
        for (const node of tierNodes) {
          const nbrs = neighbours.get(node.id);
          if (!nbrs || nbrs.size === 0) continue;
          let sum = 0, count = 0;
          for (const nbrId of nbrs) {
            const nbr = nodeMap.get(nbrId);
            if (nbr && nbr.tier !== t) { sum += nbr.lane; count++; }
          }
          if (count > 0) node.lane = sum / count;
        }
        tierNodes.sort((a, b) => a.lane - b.lane);
        tierNodes.forEach((n, i) => { n.lane = i; });
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
      tiers: tierMap,
    };
  }, [chains, nodeStyle]);

  if (chains.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: theme.text.hint,
          fontSize: sz(12),
          fontFamily: theme.font.sans,
          fontStyle: "italic",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const maxTier = Math.max(...nodes.map((n) => n.tier));
  const maxLanesPerTier = new Map<number, number>();
  for (const [tier, tierNodes] of tiers) {
    maxLanesPerTier.set(tier, tierNodes.length);
  }
  const maxLanes = Math.max(...maxLanesPerTier.values());

  const svgW = PAD_X * 2 + (maxTier + 1) * NODE_W + maxTier * TIER_GAP;
  const svgH = PAD_Y * 2 + maxLanes * (NODE_H + LANE_GAP) - LANE_GAP;

  function nodeX(tier: number) {
    return PAD_X + tier * (NODE_W + TIER_GAP);
  }

  function nodeY(tier: number, lane: number) {
    const lanesInTier = maxLanesPerTier.get(tier) ?? 1;
    const tierHeight = lanesInTier * (NODE_H + LANE_GAP) - LANE_GAP;
    const offsetY = (svgH - PAD_Y * 2 - tierHeight) / 2;
    return PAD_Y + offsetY + lane * (NODE_H + LANE_GAP);
  }

  const nodePositions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    nodePositions.set(node.id, {
      x: nodeX(node.tier),
      y: nodeY(node.tier, node.lane),
    });
  }

  const viewBox = containerSize.width > 0
    ? `0 0 ${Math.max(svgW, containerSize.width)} ${Math.max(svgH, containerSize.height)}`
    : `0 0 ${svgW} ${svgH}`;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: theme.surface.base,
      }}
    >
      <svg
        width={Math.max(svgW, containerSize.width)}
        height={Math.max(svgH, containerSize.height)}
        viewBox={viewBox}
        style={{ display: "block" }}
      >
        <defs>
          {chains.map((chain) => (
            <marker
              key={chain.id}
              id={`arrow-${chain.id}`}
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth={sz(8)}
              markerHeight={sz(6)}
              orient="auto"
            >
              <path d="M0,0 L10,3 L0,6 Z" fill={chain.color} opacity={0.7} />
            </marker>
          ))}
        </defs>

        {edges.map((edge, i) => {
          const from = nodePositions.get(edge.from);
          const to = nodePositions.get(edge.to);
          if (!from || !to) return null;

          const fromCx = from.x + NODE_W / 2;
          const fromCy = from.y + ICON_R;
          const toCx = to.x + NODE_W / 2;
          const toCy = to.y + ICON_R;
          const goesRight = fromCx < toCx;
          const x1 = goesRight ? fromCx + ICON_R : fromCx - ICON_R;
          const y1 = fromCy;
          const x2 = goesRight ? toCx - ICON_R : toCx + ICON_R;
          const y2 = toCy;
          const dx = x2 - x1;
          const cx1 = x1 + dx * 0.4;
          const cx2 = x2 - dx * 0.4;

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2 - 8;

          return (
            <g key={i}>
              <path
                d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                fill="none"
                stroke={edge.color}
                strokeWidth={1.5}
                opacity={0.5}
                markerEnd={`url(#arrow-${edge.chainId})`}
              />
              {edge.predicate && (
                <text
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  fill={theme.text.hint}
                  fontSize={sz(9)}
                  fontFamily={theme.font.mono}
                >
                  {edge.predicate}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((node) => {
          const pos = nodePositions.get(node.id)!;
          const fillColor = node.isFocal ? theme.palette.cyan : node.style.color;
          const cx = pos.x + NODE_W / 2;
          const cy = pos.y + ICON_R;
          const truncated = node.label.length > 18
            ? node.label.slice(0, 16) + "\u2026"
            : node.label;

          return (
            <g
              key={node.id}
              style={{ cursor: node.id.startsWith("__anon") ? "default" : "pointer" }}
              onClick={() => {
                if (!node.id.startsWith("__anon") && onNodeClick) {
                  onNodeClick(node.id);
                }
              }}
            >
              <title>{node.label}{node.id.startsWith("__anon") ? "" : `\n${node.id}`}</title>
              <circle
                cx={cx}
                cy={cy}
                r={ICON_R}
                fill={fillColor}
                opacity={0.2}
              />
              <circle
                cx={cx}
                cy={cy}
                r={ICON_R}
                fill="none"
                stroke={fillColor}
                strokeWidth={1.5}
                opacity={0.6}
              />
              {node.isFocal && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={ICON_R + 4}
                  fill="none"
                  stroke={theme.palette.cyan}
                  strokeWidth={1}
                  opacity={0.4}
                />
              )}
              {selectedUri === node.id && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={ICON_R + 6}
                  fill="none"
                  stroke={theme.palette.cyan}
                  strokeWidth={2}
                  opacity={0.8}
                />
              )}
              <text
                x={cx}
                y={cy - sz(3)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={sz(16)}
              >
                {node.style.icon}
              </text>
              <text
                x={cx}
                y={cy + ICON_R + sz(12)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={node.isFocal ? theme.palette.cyan : theme.text.secondary}
                fontSize={sz(10)}
                fontFamily={theme.font.sans}
                fontWeight={node.isFocal ? 600 : 400}
              >
                {truncated}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
