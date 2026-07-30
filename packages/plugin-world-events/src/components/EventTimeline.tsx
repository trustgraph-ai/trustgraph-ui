import { useRef, useState, useMemo, useCallback } from "react";
import { useTheme } from "@trustgraph/trustkit";
import type { TimeBucket } from "../useWorldEvents";

export interface EventTimelineProps {
  buckets: TimeBucket[];
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
  height?: number;
}

export function EventTimeline({
  buckets,
  range,
  onRangeChange,
  height = 72,
}: EventTimelineProps) {
  const { theme, sz } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<"left" | "right" | "pan" | null>(null);
  const dragStart = useRef<{ x: number; range: [number, number] }>({ x: 0, range: [0, 0] });
  const dragEndTime = useRef(0);

  const minYear = useMemo(() => buckets.length > 0 ? buckets[0].year : 0, [buckets]);
  const maxYear = useMemo(() => buckets.length > 0 ? buckets[buckets.length - 1].year + 50 : 2025, [buckets]);
  const binSize = 50;

  const padding = { left: 48, right: 24 };
  const width = 960;
  const barArea = width - padding.left - padding.right;

  const maxCount = useMemo(() => Math.max(...buckets.map(b => b.count), 1), [buckets]);

  const yearToX = useCallback((year: number) => {
    return padding.left + ((year - minYear) / (maxYear - minYear)) * barArea;
  }, [minYear, maxYear, barArea]);

  const xToYear = useCallback((x: number) => {
    const ratio = (x - padding.left) / barArea;
    return Math.round(minYear + ratio * (maxYear - minYear));
  }, [minYear, maxYear, barArea]);

  const handleMouseDown = useCallback((type: "left" | "right" | "pan", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    setDragging(type);
    dragStart.current = { x: svgX, range: [...range] as [number, number] };

    const onMove = (me: MouseEvent) => {
      const mx = ((me.clientX - rect.left) / rect.width) * width;
      const year = xToYear(mx);
      const startYear = xToYear(dragStart.current.x);

      const anchor = dragStart.current.range;
      if (type === "left") {
        const newLeft = Math.min(year, anchor[1] - binSize);
        onRangeChange([Math.max(minYear, newLeft), anchor[1]]);
      } else if (type === "right") {
        const newRight = Math.max(year, anchor[0] + binSize);
        onRangeChange([anchor[0], Math.min(maxYear, newRight)]);
      } else {
        const delta = year - startYear;
        const span = dragStart.current.range[1] - dragStart.current.range[0];
        let newLeft = dragStart.current.range[0] + delta;
        let newRight = dragStart.current.range[1] + delta;
        if (newLeft < minYear) { newLeft = minYear; newRight = minYear + span; }
        if (newRight > maxYear) { newRight = maxYear; newLeft = maxYear - span; }
        onRangeChange([newLeft, newRight]);
      }
    };

    const onUp = () => {
      setDragging(null);
      dragEndTime.current = Date.now();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [range, onRangeChange, xToYear, minYear, maxYear, binSize]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragging || Date.now() - dragEndTime.current < 200) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const year = xToYear(svgX);
    const halfSpan = (range[1] - range[0]) / 2;
    let newLeft = year - halfSpan;
    let newRight = year + halfSpan;
    if (newLeft < minYear) { newLeft = minYear; newRight = minYear + halfSpan * 2; }
    if (newRight > maxYear) { newRight = maxYear; newLeft = maxYear - halfSpan * 2; }
    onRangeChange([Math.round(newLeft), Math.round(newRight)]);
  }, [range, onRangeChange, xToYear, minYear, maxYear, dragging]);

  const barH = height - 28;
  const barW = Math.max(barArea / (buckets.length || 1) - 1, 1);
  const rangeLeft = yearToX(range[0]);
  const rangeRight = yearToX(range[1]);

  const labelYears = useMemo(() => {
    const span = maxYear - minYear;
    let step = 100;
    if (span < 300) step = 50;
    if (span < 100) step = 10;
    const labels: number[] = [];
    const start = Math.ceil(minYear / step) * step;
    for (let y = start; y <= maxYear; y += step) labels.push(y);
    return labels;
  }, [minYear, maxYear]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, cursor: dragging ? "grabbing" : "default", userSelect: "none" }}
      onClick={handleClick}
    >
      <rect width={width} height={height} fill="rgba(10,10,15,0.8)" />
      <line x1={padding.left} x2={width - padding.right} y1={barH} y2={barH} stroke={theme.border.default} strokeWidth={0.5} />

      {buckets.map((bucket) => {
        const x = yearToX(bucket.year);
        const h = (bucket.count / maxCount) * (barH - 4);
        const isActive = bucket.year >= range[0] && bucket.year < range[1];
        return (
          <rect
            key={bucket.year}
            x={x}
            y={barH - h}
            width={barW}
            height={h}
            fill={isActive ? theme.palette.cyan + "44" : "rgba(255,255,255,0.06)"}
            rx={1}
          />
        );
      })}

      <rect
        x={rangeLeft}
        y={0}
        width={rangeRight - rangeLeft}
        height={barH}
        fill="rgba(103,232,249,0.06)"
        stroke={theme.palette.cyan + "33"}
        strokeWidth={0.5}
        style={{ cursor: "grab" }}
        onMouseDown={(e) => handleMouseDown("pan", e)}
      />

      {/* Left handle */}
      <g style={{ cursor: "ew-resize" }} onMouseDown={(e) => handleMouseDown("left", e)}>
        <line x1={rangeLeft} x2={rangeLeft} y1={0} y2={barH} stroke={theme.palette.cyan + "88"} strokeWidth={2} />
        <rect x={rangeLeft - 4} y={barH / 2 - 10} width={8} height={20} rx={3} fill={theme.palette.cyan + "44"} stroke={theme.palette.cyan + "88"} strokeWidth={1} />
        <line x1={rangeLeft - 1} x2={rangeLeft - 1} y1={barH / 2 - 4} y2={barH / 2 + 4} stroke={theme.palette.cyan + "88"} strokeWidth={0.5} />
        <line x1={rangeLeft + 1} x2={rangeLeft + 1} y1={barH / 2 - 4} y2={barH / 2 + 4} stroke={theme.palette.cyan + "88"} strokeWidth={0.5} />
      </g>

      {/* Right handle */}
      <g style={{ cursor: "ew-resize" }} onMouseDown={(e) => handleMouseDown("right", e)}>
        <line x1={rangeRight} x2={rangeRight} y1={0} y2={barH} stroke={theme.palette.cyan + "88"} strokeWidth={2} />
        <rect x={rangeRight - 4} y={barH / 2 - 10} width={8} height={20} rx={3} fill={theme.palette.cyan + "44"} stroke={theme.palette.cyan + "88"} strokeWidth={1} />
        <line x1={rangeRight - 1} x2={rangeRight - 1} y1={barH / 2 - 4} y2={barH / 2 + 4} stroke={theme.palette.cyan + "88"} strokeWidth={0.5} />
        <line x1={rangeRight + 1} x2={rangeRight + 1} y1={barH / 2 - 4} y2={barH / 2 + 4} stroke={theme.palette.cyan + "88"} strokeWidth={0.5} />
      </g>

      {labelYears.map(y => (
        <text
          key={y}
          x={yearToX(y)}
          y={height - 4}
          fill={theme.text.hint}
          fontSize={sz(8)}
          fontFamily="'IBM Plex Mono', monospace"
          textAnchor="middle"
        >
          {y < 0 ? `${Math.abs(y)} BC` : y}
        </text>
      ))}

      <text x={6} y={barH / 2 + 3} fill={theme.text.hint} fontSize={sz(7)} fontFamily="'IBM Plex Mono', monospace">
        {range[0] < 0 ? `${Math.abs(range[0])} BC` : range[0]}
      </text>
      <text x={6} y={barH / 2 + 13} fill={theme.text.hint} fontSize={sz(7)} fontFamily="'IBM Plex Mono', monospace">
        {range[1] < 0 ? `${Math.abs(range[1])} BC` : range[1]}
      </text>
    </svg>
  );
}
