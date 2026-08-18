import { useState, useMemo, useCallback, useRef } from "react";
import { useTheme } from "../../theme/ThemeContext";

export interface TTPRecord {
  eventUri: string;
  eventName: string;
  severity?: string;
  nodeId: string;
  nodeName: string;
  groupName: string;
}

export interface TTPMapProps {
  records: TTPRecord[];
  groupOrder?: string[];
  severityColors?: Record<string, string>;
  lineColors?: string[];
  emptyMessage?: string;
}

const DEFAULT_LINE_PALETTE = [
  "#36D399", "#F87171", "#38BDF8", "#FBBF24", "#C084FC",
  "#FB923C", "#67E8F9", "#F472B6", "#A3E635", "#818CF8",
  "#E879F9", "#34D399", "#FCA5A1", "#93C5FD", "#FDE68A",
];

const DEFAULT_SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff4444",
  high: "#ff8800",
  medium: "#ffcc00",
  low: "#44cc44",
};

interface TechniqueNode {
  nodeId: string;
  name: string;
  group: string;
  groupIdx: number;
  events: Set<string>;
  order: number;
}

interface EventLine {
  uri: string;
  name: string;
  severity: string;
  techniques: string[];
}

const NODE_W = 130;
const NODE_H = 32;
const COL_GAP = 24;
const ROW_GAP = 8;
const HEADER_H = 50;
const PAD_X = 16;
const PAD_Y = 10;

export function TTPMap({
  records,
  groupOrder,
  severityColors = DEFAULT_SEVERITY_COLORS,
  lineColors = DEFAULT_LINE_PALETTE,
  emptyMessage = "No data to display",
}: TTPMapProps) {
  const { theme, sz } = useTheme();
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [hoveredTechnique, setHoveredTechnique] = useState<string | null>(null);

  const { techniques, events, usedGroups } = useMemo(() => {
    const techMap = new Map<string, TechniqueNode>();
    const eventMap = new Map<string, EventLine>();

    const allGroups = groupOrder ?? [...new Set(records.map((r) => r.groupName))];
    const groupIdx = new Map<string, number>();
    allGroups.forEach((g, i) => groupIdx.set(g, i));

    const techGroup = new Map<string, { group: string; groupIdx: number; name: string }>();
    for (const r of records) {
      const idx = groupIdx.get(r.groupName) ?? 99;
      const existing = techGroup.get(r.nodeId);
      if (!existing || idx < existing.groupIdx) {
        techGroup.set(r.nodeId, { group: r.groupName, groupIdx: idx, name: r.nodeName });
      }
    }

    for (const r of records) {
      const assigned = techGroup.get(r.nodeId)!;
      const key = r.nodeId;

      if (!techMap.has(key)) {
        techMap.set(key, {
          nodeId: r.nodeId,
          name: assigned.name,
          group: assigned.group,
          groupIdx: assigned.groupIdx,
          events: new Set(),
          order: 0,
        });
      }
      techMap.get(key)!.events.add(r.eventUri);

      if (!eventMap.has(r.eventUri)) {
        eventMap.set(r.eventUri, {
          uri: r.eventUri,
          name: r.eventName,
          severity: r.severity ?? "",
          techniques: [],
        });
      }
      const ev = eventMap.get(r.eventUri)!;
      if (!ev.techniques.includes(key)) ev.techniques.push(key);
    }

    for (const ev of eventMap.values()) {
      ev.techniques = [...new Set(ev.techniques)];
    }

    const byGroup = new Map<string, TechniqueNode[]>();
    for (const tech of techMap.values()) {
      const list = byGroup.get(tech.group) || [];
      list.push(tech);
      byGroup.set(tech.group, list);
    }

    for (const [, list] of byGroup) {
      list.sort((a, b) => b.events.size - a.events.size);
      list.forEach((t, i) => { t.order = i; });
    }

    const used = [...new Set([...techMap.values()].map((t) => t.group))]
      .sort((a, b) => {
        const ai = groupIdx.get(a) ?? 99;
        const bi = groupIdx.get(b) ?? 99;
        return ai - bi;
      });

    for (const ev of eventMap.values()) {
      ev.techniques.sort((a, b) => {
        const ta = techMap.get(a)!;
        const tb = techMap.get(b)!;
        return ta.groupIdx - tb.groupIdx;
      });
    }

    for (let iter = 0; iter < 8; iter++) {
      for (let ti = 1; ti < used.length; ti++) {
        const group = used[ti];
        const prevGroup = used[ti - 1];
        const list = byGroup.get(group);
        if (!list) continue;

        for (const tech of list) {
          let sum = 0;
          let count = 0;
          for (const ev of eventMap.values()) {
            const techs = ev.techniques;
            const myIdx = techs.indexOf(tech.nodeId);
            if (myIdx < 0) continue;
            for (let j = myIdx - 1; j >= 0; j--) {
              const prev = techMap.get(techs[j]);
              if (prev && prev.group === prevGroup) {
                sum += prev.order;
                count++;
                break;
              }
            }
          }
          if (count > 0) tech.order = sum / count;
        }

        list.sort((a, b) => a.order - b.order);
        list.forEach((t, i) => { t.order = i; });
      }
    }

    return { techniques: techMap, events: eventMap, usedGroups: used };
  }, [records, groupOrder]);

  const groupColIdx = useMemo(() => {
    const map = new Map<string, number>();
    usedGroups.forEach((t, i) => map.set(t, i));
    return map;
  }, [usedGroups]);

  const { svgWidth, svgHeight } = useMemo(() => {
    let maxRows = 0;
    for (const group of usedGroups) {
      const count = [...techniques.values()].filter((t) => t.group === group).length;
      if (count > maxRows) maxRows = count;
    }
    const w = PAD_X * 2 + usedGroups.length * NODE_W + (usedGroups.length - 1) * COL_GAP;
    const h = PAD_Y + HEADER_H + maxRows * (NODE_H + ROW_GAP) + 40;
    return { svgWidth: w, svgHeight: h };
  }, [usedGroups, techniques]);

  const nodeX = useCallback((group: string) => {
    const col = groupColIdx.get(group) ?? 0;
    return PAD_X + col * (NODE_W + COL_GAP) + NODE_W / 2;
  }, [groupColIdx]);

  const nodeY = useCallback((order: number) => {
    return PAD_Y + HEADER_H + order * (NODE_H + ROW_GAP) + NODE_H / 2;
  }, []);

  interface EventEdge {
    eventUri: string;
    color: string;
    x1: number; y1: number;
    x2: number; y2: number;
  }

  const { eventEdges, eventColors } = useMemo(() => {
    const edges: EventEdge[] = [];
    const colors = new Map<string, string>();
    let colorIdx = 0;

    for (const ev of events.values()) {
      if (ev.techniques.length === 0) continue;
      const color = lineColors[colorIdx % lineColors.length];
      colors.set(ev.uri, color);
      colorIdx++;

      const byCol = new Map<number, string[]>();
      for (const key of ev.techniques) {
        const tech = techniques.get(key);
        if (!tech) continue;
        const col = groupColIdx.get(tech.group) ?? 0;
        const list = byCol.get(col) || [];
        list.push(key);
        byCol.set(col, list);
      }

      const sortedCols = [...byCol.keys()].sort((a, b) => a - b);

      for (let ci = 0; ci < sortedCols.length - 1; ci++) {
        const fromKeys = byCol.get(sortedCols[ci])!;
        const toKeys = byCol.get(sortedCols[ci + 1])!;
        for (const fk of fromKeys) {
          const ft = techniques.get(fk)!;
          for (const tk of toKeys) {
            const tt = techniques.get(tk)!;
            edges.push({
              eventUri: ev.uri,
              color,
              x1: nodeX(ft.group), y1: nodeY(ft.order),
              x2: nodeX(tt.group), y2: nodeY(tt.order),
            });
          }
        }
      }
    }
    return { eventEdges: edges, eventColors: colors };
  }, [events, techniques, nodeX, nodeY, groupColIdx, lineColors]);

  const containerRef = useRef<HTMLDivElement>(null);

  if (techniques.size === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        flex: 1, color: theme.text.hint, fontSize: sz(11),
        fontFamily: theme.font.mono, fontStyle: "italic",
      }}>
        {emptyMessage}
      </div>
    );
  }

  const selectedTech = selectedTechnique ? techniques.get(selectedTechnique) : null;
  const selectedEvents = selectedTech
    ? [...events.values()].filter((e) => e.techniques.includes(selectedTechnique!))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Legend */}
      <div style={{
        padding: "8px 20px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: sz(9), fontFamily: theme.font.mono,
          color: theme.text.hint, textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {events.size} event{events.size !== 1 ? "s" : ""} · {techniques.size} technique{techniques.size !== 1 ? "s" : ""}
        </span>
        <div style={{ flex: 1 }} />
        {[...events.values()].map((ev) => {
          const color = eventColors.get(ev.uri) || theme.text.subtle;
          return (
            <span
              key={ev.uri}
              onMouseEnter={() => setHoveredEvent(ev.uri)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: sz(9), fontFamily: theme.font.mono,
                color: hoveredEvent === ev.uri ? theme.text.primary : theme.text.subtle,
                cursor: "pointer",
              }}
            >
              <span style={{
                width: 10, height: 3, borderRadius: 1,
                background: color,
              }} />
              {ev.name.length > 25 ? ev.name.slice(0, 24) + "\u2026" : ev.name}
            </span>
          );
        })}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Map */}
        <div
          ref={containerRef}
          style={{
            flex: selectedTech ? "0 0 70%" : 1,
            overflow: "auto",
            padding: 8,
          }}
        >
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{ display: "block" }}
          >
            {/* Group column headers */}
            {usedGroups.map((group) => {
              const x = nodeX(group);
              return (
                <text
                  key={group}
                  x={x} y={PAD_Y + 16}
                  textAnchor="middle"
                  fontSize={sz(8)}
                  fontFamily={theme.font.mono}
                  fill={theme.text.hint}
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {group}
                </text>
              );
            })}

            {/* Event edges */}
            {eventEdges.map((edge, i) => {
              const isHighlighted = hoveredEvent === edge.eventUri;
              const isDimmed = hoveredEvent && hoveredEvent !== edge.eventUri;
              const ev = events.get(edge.eventUri);
              const isTechHighlighted = hoveredTechnique && ev?.techniques.includes(hoveredTechnique);

              const opacity = isHighlighted || isTechHighlighted
                ? 0.9
                : isDimmed ? 0.08 : 0.35;

              const midX = (edge.x1 + edge.x2) / 2;
              const d = `M${edge.x1 + NODE_W / 2},${edge.y1} C${midX},${edge.y1} ${midX},${edge.y2} ${edge.x2 - NODE_W / 2},${edge.y2}`;

              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={isHighlighted ? 3 : 2}
                  strokeOpacity={opacity}
                  style={{ transition: "stroke-opacity 0.15s, stroke-width 0.15s" }}
                />
              );
            })}

            {/* Technique nodes */}
            {[...techniques.entries()].map(([key, tech]) => {
              const x = nodeX(tech.group);
              const y = nodeY(tech.order);
              const isHub = tech.events.size > 1;
              const isSelected = selectedTechnique === key;
              const isHovered = hoveredTechnique === key;
              const eventCount = tech.events.size;

              const baseColor = isHub ? theme.palette.cyan : theme.text.subtle;

              return (
                <g
                  key={key}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedTechnique(isSelected ? null : key)}
                  onMouseEnter={() => setHoveredTechnique(key)}
                  onMouseLeave={() => setHoveredTechnique(null)}
                >
                  <rect
                    x={x - NODE_W / 2} y={y - NODE_H / 2}
                    width={NODE_W} height={NODE_H}
                    rx={6}
                    fill={isSelected ? `${baseColor}22` : isHovered ? `${baseColor}15` : `${baseColor}08`}
                    stroke={isSelected ? baseColor : `${baseColor}${isHub ? "66" : "33"}`}
                    strokeWidth={isSelected ? 2 : 1}
                    style={{ transition: "fill 0.12s" }}
                  />

                  {isHub && (
                    <>
                      <circle
                        cx={x - NODE_W / 2 + 1} cy={y}
                        r={5} fill={theme.surface.base}
                      />
                      <circle
                        cx={x - NODE_W / 2 + 1} cy={y}
                        r={4} fill="none" stroke={baseColor}
                        strokeWidth={2}
                      />
                    </>
                  )}

                  <text
                    x={x - NODE_W / 2 + (isHub ? 14 : 8)}
                    y={y - 4}
                    fontSize={sz(8)}
                    fontFamily={theme.font.mono}
                    fontWeight={600}
                    fill={baseColor}
                  >
                    {tech.nodeId}
                  </text>
                  <text
                    x={x - NODE_W / 2 + (isHub ? 14 : 8)}
                    y={y + 9}
                    fontSize={sz(7)}
                    fontFamily={theme.font.sans}
                    fill={theme.text.muted}
                  >
                    {tech.name.length > 18 ? tech.name.slice(0, 17) + "\u2026" : tech.name}
                  </text>

                  {eventCount > 1 && (
                    <>
                      <circle
                        cx={x + NODE_W / 2 - 12} cy={y}
                        r={9} fill={`${theme.palette.cyan}30`}
                      />
                      <text
                        x={x + NODE_W / 2 - 12} y={y + 3.5}
                        textAnchor="middle"
                        fontSize={sz(8)}
                        fontFamily={theme.font.mono}
                        fontWeight={700}
                        fill={theme.palette.cyan}
                      >
                        {eventCount}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        {selectedTech && (
          <div style={{
            flex: "0 0 30%",
            borderLeft: `1px solid ${theme.border.default}`,
            overflow: "auto", padding: "12px 16px",
          }}>
            <div style={{
              fontSize: sz(10), fontFamily: theme.font.mono,
              color: theme.palette.cyan, fontWeight: 600, marginBottom: 2,
            }}>
              {selectedTech.nodeId}
            </div>
            <div style={{
              fontSize: sz(14), fontFamily: theme.font.sans,
              fontWeight: 600, color: theme.text.primary, marginBottom: 4,
            }}>
              {selectedTech.name}
            </div>
            <div style={{
              fontSize: sz(9), fontFamily: theme.font.mono,
              color: theme.text.hint, textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 16,
            }}>
              {selectedTech.group}
            </div>

            <div style={{
              fontSize: sz(9), fontFamily: theme.font.mono,
              color: theme.text.hint, textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Referenced in {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
            </div>

            {selectedEvents.map((ev) => {
              const sevColor = severityColors[ev.severity] || theme.text.subtle;
              return (
                <div key={ev.uri} style={{
                  padding: "8px 12px", marginBottom: 4, borderRadius: 6,
                  border: `1px solid ${theme.border.default}`,
                  background: theme.surface.card,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {ev.severity && (
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: sevColor, flexShrink: 0,
                    }} />
                  )}
                  <span style={{
                    fontSize: sz(11), fontFamily: theme.font.sans,
                    color: theme.text.primary, fontWeight: 500,
                  }}>
                    {ev.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
