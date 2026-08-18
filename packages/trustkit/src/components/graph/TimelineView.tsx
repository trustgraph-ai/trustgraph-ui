import { useMemo, useRef, useState, useEffect } from "react";
import { useTheme } from "../../theme/ThemeContext";
import type { NodeStyleFn } from "./FlowView";

export interface TimelineEvent {
  label: string;
  uri?: string;
  timestamp: string;
  amount?: number;
  currency?: string;
}

export interface TimelineGroup {
  id: string;
  name: string;
  color: string;
  events: TimelineEvent[];
}

interface TaggedEvent extends TimelineEvent {
  groupId: string;
  groupColor: string;
  groupName: string;
}

function parseDate(s: string): number {
  return new Date(s).getTime();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number, currency?: string): string {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

export interface TimelineViewProps {
  groups: TimelineGroup[];
  onNodeClick?: (uri: string) => void;
  nodeStyle?: NodeStyleFn;
  emptyMessage?: string;
}

export function TimelineView({
  groups,
  onNodeClick,
  nodeStyle,
  emptyMessage = "No timeline events to display",
}: TimelineViewProps) {
  const { theme, sz } = useTheme();
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

  const { lanes, timeMin, timeMax, ticks } = useMemo(() => {
    const allEvents: TaggedEvent[] = [];
    for (const group of groups) {
      for (const evt of group.events) {
        allEvents.push({
          ...evt,
          groupId: group.id,
          groupColor: group.color,
          groupName: group.name,
        });
      }
    }

    if (allEvents.length === 0)
      return { lanes: new Map<string, TaggedEvent[]>(), timeMin: 0, timeMax: 1, ticks: [] as number[] };

    const laneMap = new Map<string, TaggedEvent[]>();
    for (const evt of allEvents) {
      const key = evt.uri ?? evt.label;
      const arr = laneMap.get(key) ?? [];
      arr.push(evt);
      laneMap.set(key, arr);
    }

    for (const [, laneEvents] of laneMap) {
      laneEvents.sort((a, b) => parseDate(a.timestamp) - parseDate(b.timestamp));
    }

    const timestamps = allEvents.map((e) => parseDate(e.timestamp));
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const span = max - min || 86400000;
    const pad = span * 0.08;
    const tMin = min - pad;
    const tMax = max + pad;

    const tickCount = Math.min(8, Math.max(3, Math.floor((tMax - tMin) / 86400000 / 30)));
    const tickStep = (tMax - tMin) / (tickCount + 1);
    const tickArr: number[] = [];
    for (let i = 1; i <= tickCount; i++) {
      tickArr.push(tMin + tickStep * i);
    }

    return { lanes: laneMap, timeMin: tMin, timeMax: tMax, ticks: tickArr };
  }, [groups]);

  if (lanes.size === 0) {
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

  const LABEL_W = sz(140);
  const LANE_H = sz(36);
  const LANE_GAP = sz(4);
  const PAD_TOP = sz(32);
  const PAD_BOTTOM = sz(20);
  const PAD_RIGHT = sz(20);
  const MARKER_R = nodeStyle ? sz(12) : sz(6);

  const laneEntries = Array.from(lanes.entries());
  const svgH = PAD_TOP + laneEntries.length * (LANE_H + LANE_GAP) - LANE_GAP + PAD_BOTTOM;
  const chartW = Math.max((containerSize.width || 600) - LABEL_W, 200);
  const svgW = LABEL_W + chartW + PAD_RIGHT;
  const timeSpan = timeMax - timeMin || 1;

  function timeToX(ts: number): number {
    return LABEL_W + ((ts - timeMin) / timeSpan) * chartW;
  }

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
        style={{ display: "block" }}
      >
        {ticks.map((ts, i) => {
          const x = timeToX(ts);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={PAD_TOP - sz(4)}
                x2={x}
                y2={svgH - PAD_BOTTOM}
                stroke={theme.border.subtle}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
              <text
                x={x}
                y={PAD_TOP - sz(10)}
                textAnchor="middle"
                fill={theme.text.muted}
                fontSize={sz(9)}
                fontFamily={theme.font.mono}
              >
                {formatDate(ts)}
              </text>
            </g>
          );
        })}

        {laneEntries.map(([key, laneEvents], laneIdx) => {
          const y = PAD_TOP + laneIdx * (LANE_H + LANE_GAP);
          const label = laneEvents[0].label;
          const truncated = label.length > 20 ? label.slice(0, 18) + "\u2026" : label;

          return (
            <g key={key}>
              <rect
                x={LABEL_W}
                y={y}
                width={chartW}
                height={LANE_H}
                fill={theme.text.hint}
                opacity={0.03}
                rx={sz(3)}
              />

              <text
                x={LABEL_W - sz(8)}
                y={y + LANE_H / 2}
                textAnchor="end"
                dominantBaseline="central"
                fill={theme.text.secondary}
                fontSize={sz(10)}
                fontFamily={theme.font.sans}
                style={{
                  cursor: laneEvents[0].uri ? "pointer" : "default",
                }}
                onClick={() => {
                  if (laneEvents[0].uri && onNodeClick) {
                    onNodeClick(laneEvents[0].uri);
                  }
                }}
              >
                <title>{label}</title>
                {truncated}
              </text>

              {laneEvents.length > 1 && (() => {
                const x1 = timeToX(parseDate(laneEvents[0].timestamp));
                const x2 = timeToX(parseDate(laneEvents[laneEvents.length - 1].timestamp));
                return (
                  <line
                    x1={x1}
                    y1={y + LANE_H / 2}
                    x2={x2}
                    y2={y + LANE_H / 2}
                    stroke={theme.text.hint}
                    strokeWidth={1}
                    opacity={0.2}
                  />
                );
              })()}

              {laneEvents.map((evt, evtIdx) => {
                const ts = parseDate(evt.timestamp);
                const x = timeToX(ts);
                const cy = y + LANE_H / 2;
                const hasAmount = evt.amount !== undefined && !isNaN(evt.amount);
                const typeInfo = nodeStyle?.(evt.uri ?? "", evt.label);
                const color = evt.groupColor;

                return (
                  <g
                    key={evtIdx}
                    style={{ cursor: evt.uri ? "pointer" : "default" }}
                    onClick={() => {
                      if (evt.uri && onNodeClick) onNodeClick(evt.uri);
                    }}
                  >
                    <title>
                      {evt.label} [{evt.groupName}]
                      {"\n"}{new Date(evt.timestamp).toLocaleString()}
                      {hasAmount ? `\n${formatAmount(evt.amount!, evt.currency)}` : ""}
                    </title>
                    <circle
                      cx={x}
                      cy={cy}
                      r={MARKER_R}
                      fill={color}
                      opacity={0.2}
                    />
                    <circle
                      cx={x}
                      cy={cy}
                      r={MARKER_R}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      opacity={0.6}
                    />
                    {typeInfo && (
                      <text
                        x={x}
                        y={cy - sz(1)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={sz(10)}
                      >
                        {typeInfo.icon}
                      </text>
                    )}
                    {hasAmount && (
                      <text
                        x={x}
                        y={cy - MARKER_R - sz(4)}
                        textAnchor="middle"
                        fill={theme.text.hint}
                        fontSize={sz(8)}
                        fontFamily={theme.font.mono}
                      >
                        {formatAmount(evt.amount!, evt.currency)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
