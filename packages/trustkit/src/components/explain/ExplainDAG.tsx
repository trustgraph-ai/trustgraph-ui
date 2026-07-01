import { useMemo } from "react";
import type { DAGLayout } from "../../hooks/useExplainDAG";
import { text, withGlow } from "../../theme";

const NODE_W = 140;
const NODE_H = 40;
const H_GAP = 60;
const V_GAP = 60;
const PADDING = 40;

// Switch to horizontal layout when the DAG is mostly a linear chain
const LINEAR_THRESHOLD = 2; // maxColumns <= this → horizontal

interface ExplainDAGProps {
  /** DAG layout data from useExplainDAG */
  layout: DAGLayout;
  /** Currently selected node ID */
  selectedNodeId?: string | null;
  /** Node click handler */
  onNodeClick?: (nodeId: string) => void;
}

/**
 * Renders the explain event DAG as an SVG with rectangular nodes
 * positioned top-to-bottom by derivation depth. Question at the top,
 * answer/synthesis at the bottom.
 */
export function ExplainDAG({ layout, selectedNodeId, onNodeClick }: ExplainDAGProps) {
  const { nodes, edges, maxDepth, maxColumns } = layout;

  const horizontal = maxColumns <= LINEAR_THRESHOLD;

  // Compute positions
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();

    // Group by depth to center nodes within each depth level
    const byDepth = new Map<number, typeof nodes>();
    for (const node of nodes) {
      if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
      byDepth.get(node.depth)!.push(node);
    }

    if (horizontal) {
      // Horizontal layout: depth increases left-to-right, siblings stack vertically
      for (let d = 0; d <= maxDepth; d++) {
        const col = byDepth.get(d) || [];
        const colHeight = col.length * NODE_H + (col.length - 1) * V_GAP;
        const totalHeight = maxColumns * NODE_H + (maxColumns - 1) * V_GAP;
        const offsetY = (totalHeight - colHeight) / 2;

        col.forEach((node, i) => {
          pos.set(node.id, {
            x: PADDING + d * (NODE_W + H_GAP),
            y: PADDING + offsetY + i * (NODE_H + V_GAP),
          });
        });
      }
    } else {
      // Vertical layout: depth increases top-to-bottom, siblings spread horizontally
      for (let d = 0; d <= maxDepth; d++) {
        const row = byDepth.get(d) || [];
        const rowWidth = row.length * NODE_W + (row.length - 1) * H_GAP;
        const totalWidth = maxColumns * NODE_W + (maxColumns - 1) * H_GAP;
        const offsetX = (totalWidth - rowWidth) / 2;

        row.forEach((node, i) => {
          pos.set(node.id, {
            x: PADDING + offsetX + i * (NODE_W + H_GAP),
            y: PADDING + d * (NODE_H + V_GAP),
          });
        });
      }
    }

    return pos;
  }, [nodes, maxDepth, maxColumns, horizontal]);

  const svgWidth = horizontal
    ? (maxDepth + 1) * (NODE_W + H_GAP) - H_GAP + PADDING * 2
    : maxColumns * NODE_W + (maxColumns - 1) * H_GAP + PADDING * 2;
  const svgHeight = horizontal
    ? maxColumns * NODE_H + (maxColumns - 1) * V_GAP + PADDING * 2
    : (maxDepth + 1) * (NODE_H + V_GAP) - V_GAP + PADDING * 2;

  if (nodes.length === 0) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: text.hint,
        fontSize: 13,
        fontStyle: "italic",
      }}>
        The explainability DAG will appear here as the query progresses.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <svg
        width={Math.max(svgWidth, 300)}
        height={Math.max(svgHeight, 200)}
        style={{ display: "block", margin: "0 auto" }}
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;

          let x1: number, y1: number, x2: number, y2: number;
          let pathD: string;
          let arrowPoints: string;

          if (horizontal) {
            // Left-to-right edges
            x1 = from.x + NODE_W;
            y1 = from.y + NODE_H / 2;
            x2 = to.x;
            y2 = to.y + NODE_H / 2;
            const midX = (x1 + x2) / 2;
            pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
            arrowPoints = `${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`;
          } else {
            // Top-to-bottom edges
            x1 = from.x + NODE_W / 2;
            y1 = from.y + NODE_H;
            x2 = to.x + NODE_W / 2;
            y2 = to.y;
            const midY = (y1 + y2) / 2;
            pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            arrowPoints = `${x2},${y2} ${x2 - 4},${y2 - 6} ${x2 + 4},${y2 - 6}`;
          }

          return (
            <g key={i}>
              <path
                d={pathD}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1.5}
              />
              <polygon
                points={arrowPoints}
                fill="rgba(255,255,255,0.15)"
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          const isSelected = selectedNodeId === node.id;
          const nodeColor = node.color;

          return (
            <g
              key={node.id}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: onNodeClick ? "pointer" : "default" }}
            >
              {/* Glow on selected */}
              {isSelected && (
                <rect
                  x={pos.x - 3}
                  y={pos.y - 3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={10}
                  ry={10}
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth={2}
                  opacity={0.5}
                />
              )}

              {/* Node background */}
              <rect
                x={pos.x}
                y={pos.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
                fill={withGlow(nodeColor, 0.1)}
                stroke={withGlow(nodeColor, isSelected ? 0.6 : 0.3)}
                strokeWidth={1}
              />

              {/* Node label — wrap to two lines if needed */}
              {(() => {
                const maxChars = 18;
                const label = node.label;
                if (label.length <= maxChars) {
                  return (
                    <text
                      x={pos.x + NODE_W / 2}
                      y={pos.y + NODE_H / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={nodeColor}
                      fontSize={10}
                      fontWeight={600}
                      fontFamily="'IBM Plex Mono', monospace"
                      style={{ pointerEvents: "none" }}
                    >
                      {label}
                    </text>
                  );
                }
                const mid = label.lastIndexOf(" ", maxChars);
                const line1 = mid > 0 ? label.slice(0, mid) : label.slice(0, maxChars);
                const line2 = mid > 0 ? label.slice(mid + 1) : label.slice(maxChars);
                return (
                  <text
                    x={pos.x + NODE_W / 2}
                    y={pos.y + NODE_H / 2 - 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={nodeColor}
                    fontSize={10}
                    fontWeight={600}
                    fontFamily="'IBM Plex Mono', monospace"
                    style={{ pointerEvents: "none" }}
                  >
                    <tspan x={pos.x + NODE_W / 2} dy={0}>{line1}</tspan>
                    <tspan x={pos.x + NODE_W / 2} dy={12}>{line2}</tspan>
                  </text>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
