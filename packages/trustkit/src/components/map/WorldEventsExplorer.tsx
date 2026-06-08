import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { geoNaturalEarth1, geoPath, geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { useWorldEvents } from "../../hooks/useWorldEvents";
import type { WorldEvent, EventSummary, GridCell, SearchFilters } from "../../hooks/useWorldEvents";
import { EventTimeline } from "./EventTimeline";
import { text, border, palette } from "../../theme";
import { LoadingState } from "../common";

import worldTopo from "world-atlas/countries-110m.json";

const MAP_W = 960;
const MAP_H = 500;
const LIST_LIMIT = 25;

const TYPE_COLORS: Record<string, string> = {
  War: palette.rose,
  MilitaryConflict: palette.rose,
  CivilWar: palette.rose,
  Military: palette.rose,
  Terrorism: palette.red,
  Revolution: palette.amber,
  Independence: palette.emerald,
  StateFormation: palette.emerald,
  Political: palette.blue,
  Legislative: palette.blue,
  Legislation: palette.blue,
  Legal: palette.blue,
  Economic: palette.cyan,
  EconomicPolicy: palette.cyan,
  InternationalFinance: palette.cyan,
  NaturalDisaster: palette.purple,
  DiplomaticAgreement: palette.emerald,
  InternationalRelations: palette.cyan,
  Civilization: palette.amber,
  Pandemic: palette.purple,
  Famine: palette.orange,
};

const DEFAULT_COLOR = palette.blue;

function colorForType(type: string): string {
  return TYPE_COLORS[type] || DEFAULT_COLOR;
}

const OUTCOME_COLORS: Record<string, string> = {
  Positive: palette.emerald,
  Negative: palette.rose,
  Mixed: palette.amber,
};

export interface WorldEventsExplorerProps {
  ontologyNs?: string;
}

export function WorldEventsExplorer({
  ontologyNs = "http://trustgraph.ai/ontology/world-events#",
}: WorldEventsExplorerProps) {
  const {
    gridCells, eventTypes, buckets, totalEvents,
    isLoading, error,
    getLocationUrisForPoints, getLocationUrisInBounds,
    searchEvents, loadEventDetail,
  } = useWorldEvents(ontologyNs);

  // Filters
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);

  // UI state
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WorldEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Search results
  const [listEvents, setListEvents] = useState<EventSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geo setup
  const worldGeo = useMemo(() =>
    feature(worldTopo as unknown as Topology, (worldTopo as any).objects.countries) as unknown as GeoJSON.FeatureCollection,
  []);

  const projection = useMemo(() => {
    const p = geoNaturalEarth1();
    p.fitSize([MAP_W - 20, MAP_H - 20], worldGeo);
    return p;
  }, [worldGeo]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const countryPaths = useMemo(() =>
    worldGeo.features.map((f, i) => ({
      key: (f.properties as any)?.name || `c-${i}`,
      d: pathGen(f as GeoPermissibleObjects) || "",
      name: (f.properties as any)?.name || "",
      feature: f,
    })),
  [worldGeo, pathGen]);

  const selectedFeature = useMemo(() => {
    if (!selectedCountry) return null;
    return countryPaths.find(c => c.name === selectedCountry)?.feature || null;
  }, [selectedCountry, countryPaths]);

  // Effective time range
  const effectiveRange = useMemo((): [number, number] => {
    if (timeRange) return timeRange;
    if (buckets.length === 0) return [1900, 2025];
    return [buckets[0].year, buckets[buckets.length - 1].year + 50];
  }, [timeRange, buckets]);

  // Filter grid cells (for map display)
  const filteredCells = useMemo(() => {
    let cells = gridCells;
    if (selectedFeature) {
      cells = cells.filter(c => geoContains(selectedFeature, [c.avgLon, c.avgLat]));
    }
    return cells;
  }, [gridCells, selectedFeature]);

  const maxCount = useMemo(
    () => Math.max(...filteredCells.map(c => c.count), 1),
    [filteredCells],
  );

  const projectedCells = useMemo(() =>
    filteredCells.map(c => {
      const pt = projection([c.avgLon, c.avgLat]);
      return { ...c, x: pt?.[0] || 0, y: pt?.[1] || 0 };
    }).filter(c => c.x > 0 && c.y > 0),
  [filteredCells, projection]);

  // Search events on filter change (debounced)
  useEffect(() => {
    if (isLoading) return;

    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      const filters: SearchFilters = {};

      // Location filter: cell bounds or country polygon
      if (selectedCell) {
        filters.locationUris = getLocationUrisInBounds(
          selectedCell.latCell, selectedCell.latCell + 5,
          selectedCell.lonCell, selectedCell.lonCell + 5,
        );
      } else if (selectedFeature) {
        filters.locationUris = getLocationUrisForPoints(
          (lat, lng) => geoContains(selectedFeature!, [lng, lat]),
        );
      }

      // Type filter
      if (activeTypes.size > 0) {
        filters.typeUris = eventTypes
          .filter(et => activeTypes.has(et.type))
          .map(et => et.typeUri);
      }

      // Year range filter (only when user has adjusted it)
      if (timeRange) {
        filters.yearRange = timeRange;
      }

      setListLoading(true);
      try {
        const results = await searchEvents(filters, LIST_LIMIT);
        setListEvents(results);
      } catch {
        setListEvents([]);
      }
      setListLoading(false);
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [isLoading, selectedCell, selectedFeature, activeTypes, timeRange, eventTypes, searchEvents, getLocationUrisInBounds, getLocationUrisForPoints]);

  // Handlers
  const toggleType = useCallback((type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleCountryClick = useCallback((name: string) => {
    setSelectedCountry(prev => prev === name ? null : name);
    setSelectedCell(null);
    setSelectedEvent(null);
  }, []);

  const handleCellClick = useCallback((cell: GridCell) => {
    setSelectedCell(prev =>
      prev?.latCell === cell.latCell && prev?.lonCell === cell.lonCell ? null : cell,
    );
    setSelectedEvent(null);
  }, []);

  const handleEventSelect = useCallback(async (summary: EventSummary) => {
    setDetailLoading(true);
    try {
      const detail = await loadEventDetail(summary.id);
      setSelectedEvent(detail);
    } catch {
      setSelectedEvent(null);
    }
    setDetailLoading(false);
  }, [loadEventDetail]);

  const clearFilters = useCallback(() => {
    setActiveTypes(new Set());
    setSelectedCountry(null);
    setSelectedCell(null);
    setTimeRange(null);
    setSelectedEvent(null);
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: "var(--page-height)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingState message="Loading events from knowledge graph..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "var(--page-height)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ color: palette.rose, fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>
          Failed to load events
        </div>
        <div style={{ color: text.muted, fontSize: 11 }}>{error.message}</div>
      </div>
    );
  }

  if (gridCells.length === 0) {
    return (
      <div style={{ height: "var(--page-height)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ color: text.muted, fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>
          No geo-temporal events found
        </div>
        <div style={{ color: text.hint, fontSize: 11 }}>
          Load a dataset with location and year predicates.
        </div>
      </div>
    );
  }

  const hasFilters = activeTypes.size > 0 || selectedCountry !== null || selectedCell !== null || timeRange !== null;
  const cellKey = (c: GridCell) => `${c.latCell},${c.lonCell}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden" }}>
      {/* Filter bar */}
      <div style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        minHeight: 40,
      }}>
        <span style={{ fontSize: 10, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", marginRight: 4 }}>
          TYPE
        </span>
        {eventTypes.slice(0, 14).map(et => {
          const c = colorForType(et.type);
          const isActive = activeTypes.size === 0 || activeTypes.has(et.type);
          return (
            <button
              key={et.type}
              onClick={() => toggleType(et.type)}
              style={{
                padding: "2px 8px",
                borderRadius: 10,
                border: `1px solid ${isActive ? c + "66" : border.default}`,
                background: isActive ? c + "15" : "transparent",
                color: isActive ? c : text.disabled,
                fontSize: 9,
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: isActive ? 1 : 0.5,
                whiteSpace: "nowrap",
              }}
            >
              {et.label}
              <span style={{ marginLeft: 4, opacity: 0.5 }}>{et.count}</span>
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {selectedCell && (
          <button
            onClick={() => setSelectedCell(null)}
            style={{
              padding: "2px 8px", borderRadius: 10,
              border: `1px solid ${palette.cyan}44`, background: palette.cyan + "15",
              color: palette.cyan, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
            }}
          >
            Region {selectedCell.avgLat.toFixed(0)},{selectedCell.avgLon.toFixed(0)} x
          </button>
        )}

        {selectedCountry && (
          <button
            onClick={() => { setSelectedCountry(null); setSelectedCell(null); }}
            style={{
              padding: "2px 8px", borderRadius: 10,
              border: `1px solid ${palette.amber}44`, background: palette.amber + "15",
              color: palette.amber, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
            }}
          >
            {selectedCountry} x
          </button>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: "2px 8px", borderRadius: 10,
              border: `1px solid ${border.default}`, background: "transparent",
              color: text.faint, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
            }}
          >
            Clear all
          </button>
        )}

        <span style={{ fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace" }}>
          {listLoading ? "Searching..." : `${listEvents.length} of ${totalEvents}`}
        </span>
      </div>

      {/* Map + event list */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Map */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            <defs>
              <pattern id="evt-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              </pattern>
              <filter id="cell-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width={MAP_W} height={MAP_H} fill="url(#evt-grid)" />

            {/* Country polygons */}
            {countryPaths.map(cp => {
              const isSelected = selectedCountry === cp.name;
              const isHovered = hoveredCountry === cp.name;
              const isDimmed = selectedCountry && !isSelected;
              return (
                <path
                  key={cp.key}
                  d={cp.d}
                  fill={
                    isSelected ? "rgba(255,255,255,0.12)" :
                    isHovered ? "rgba(255,255,255,0.09)" :
                    "rgba(255,255,255,0.06)"
                  }
                  stroke={
                    isSelected ? palette.amber + "66" :
                    isHovered ? "rgba(255,255,255,0.35)" :
                    "rgba(255,255,255,0.22)"
                  }
                  strokeWidth={isSelected ? 1.2 : isHovered ? 0.8 : 0.5}
                  opacity={isDimmed ? 0.3 : 1}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                  onClick={(e) => { e.stopPropagation(); handleCountryClick(cp.name); }}
                  onMouseEnter={() => setHoveredCountry(cp.name)}
                  onMouseLeave={() => setHoveredCountry(null)}
                >
                  <title>{cp.name}</title>
                </path>
              );
            })}

            {/* Grid cell clusters */}
            {projectedCells.map(c => {
              const key = cellKey(c);
              const isSelected = selectedCell && cellKey(selectedCell) === key;
              const isHovered = hoveredCell === key;
              const t = Math.sqrt(c.count / maxCount);
              const r = 3 + t * 14;
              const glowR = r + 4 + t * 8;
              return (
                <g
                  key={key}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); handleCellClick(c); }}
                  onMouseEnter={() => setHoveredCell(key)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <circle
                    cx={c.x} cy={c.y}
                    r={isSelected ? glowR + 4 : isHovered ? glowR + 2 : glowR}
                    fill={palette.cyan}
                    opacity={isSelected ? 0.15 : isHovered ? 0.1 : 0.04}
                    style={{ transition: "all 0.2s" }}
                  />
                  <circle
                    cx={c.x} cy={c.y}
                    r={isSelected ? r + 1 : isHovered ? r + 0.5 : r}
                    fill={palette.cyan}
                    opacity={0.15 + t * 0.45}
                    stroke={palette.cyan}
                    strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.5}
                    strokeOpacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.3}
                    style={{ transition: "all 0.2s" }}
                    filter={isSelected ? "url(#cell-glow)" : undefined}
                  />
                  {(c.count >= 3 || isHovered || isSelected) && (
                    <text
                      x={c.x} y={c.y + 3}
                      fill="#fff"
                      fontSize={r > 8 ? 8 : 6}
                      fontFamily="'IBM Plex Mono', monospace"
                      textAnchor="middle"
                      opacity={isSelected ? 1 : isHovered ? 0.9 : 0.7}
                      style={{ pointerEvents: "none" }}
                    >
                      {c.count}
                    </text>
                  )}
                  <title>{`${c.count} events near ${c.avgLat.toFixed(1)}, ${c.avgLon.toFixed(1)}`}</title>
                </g>
              );
            })}

            {/* Hovered country name */}
            {hoveredCountry && !selectedCountry && (
              <text
                x={MAP_W - 8} y={MAP_H - 8}
                fill={text.subtle} fontSize={10}
                fontFamily="'IBM Plex Mono', monospace"
                textAnchor="end"
              >
                {hoveredCountry}
              </text>
            )}
          </svg>
        </div>

        {/* Event list panel */}
        <div style={{
          width: 320,
          borderLeft: `1px solid ${border.default}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {selectedEvent ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <EventDetail
                event={selectedEvent}
                typeColor={colorForType(selectedEvent.type)}
                onBack={() => setSelectedEvent(null)}
              />
            </div>
          ) : (
            <>
              <div style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${border.default}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 10, color: text.hint, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {listLoading ? "Searching..." : `${listEvents.length} events`}
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {listLoading ? (
                  <div style={{ padding: 20, textAlign: "center" }}>
                    <div style={{ color: text.hint, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Searching...
                    </div>
                  </div>
                ) : listEvents.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center" }}>
                    <div style={{ color: text.hint, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                      No events match filters
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, opacity: detailLoading ? 0.5 : 1, transition: "opacity 0.15s" }}>
                    {listEvents.map(e => {
                      const c = colorForType(e.type);
                      return (
                        <button
                          key={e.id}
                          onClick={() => handleEventSelect(e)}
                          disabled={detailLoading}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            padding: "8px 14px",
                            border: "none",
                            borderBottom: `1px solid ${border.default}`,
                            background: "transparent",
                            cursor: detailLoading ? "wait" : "pointer",
                            textAlign: "left",
                            width: "100%",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(ev) => { (ev.target as HTMLElement).closest("button")!.style.background = "rgba(255,255,255,0.03)"; }}
                          onMouseLeave={(ev) => { (ev.target as HTMLElement).closest("button")!.style.background = "transparent"; }}
                        >
                          <div style={{
                            width: 6, height: 6, borderRadius: 3,
                            background: c, marginTop: 5, flexShrink: 0,
                          }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: 11, color: "#fff", fontWeight: 600,
                              fontFamily: "'IBM Plex Sans', sans-serif",
                              lineHeight: 1.3,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {e.name}
                            </div>
                            <div style={{
                              fontSize: 9, color: text.hint,
                              fontFamily: "'IBM Plex Mono', monospace",
                              marginTop: 2,
                            }}>
                              <span style={{ color: c + "aa" }}>{e.typeLabel}</span>
                              <span style={{ margin: "0 4px", opacity: 0.3 }}>|</span>
                              {e.yearLabel}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ borderTop: `1px solid ${border.default}`, flexShrink: 0 }}>
        <EventTimeline
          buckets={buckets}
          range={effectiveRange}
          onRangeChange={setTimeRange}
        />
      </div>
    </div>
  );
}

function EventDetail({ event, typeColor, onBack }: {
  event: WorldEvent;
  typeColor: string;
  onBack: () => void;
}) {
  const outcomeColor = OUTCOME_COLORS[event.outcome || ""] || text.muted;

  return (
    <div style={{ padding: 20 }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", color: text.hint,
          fontSize: 10, cursor: "pointer", padding: "2px 0", marginBottom: 16,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        &larr; Back to list
      </button>

      <div style={{
        fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
        color: typeColor, textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: 8,
      }}>
        {event.typeLabel}
      </div>

      <div style={{
        fontSize: 18, fontWeight: 700, color: "#fff",
        lineHeight: 1.3, marginBottom: 12,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>
        {event.name}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", color: text.subtle }}>
          {event.date || event.yearLabel}
        </span>
        {event.outcome && (
          <span style={{
            fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
            padding: "2px 8px", borderRadius: 10,
            background: outcomeColor + "18",
            border: `1px solid ${outcomeColor}44`,
            color: outcomeColor,
          }}>
            {event.outcome}
          </span>
        )}
      </div>

      {event.impact && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
          }}>
            Impact
          </div>
          <div style={{
            fontSize: 12, color: text.subtle, lineHeight: 1.6,
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${border.default}`,
          }}>
            {event.impact}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {event.responsible && <MetaField label="Responsible" value={event.responsible} />}
        {event.affectedPopulation && <MetaField label="Affected" value={event.affectedPopulation} />}
        <MetaField
          label="Location"
          value={`${event.lat.toFixed(2)}\u00b0${event.lat >= 0 ? "N" : "S"}, ${Math.abs(event.lng).toFixed(2)}\u00b0${event.lng >= 0 ? "E" : "W"}`}
        />
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: text.muted, fontFamily: "'IBM Plex Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}
