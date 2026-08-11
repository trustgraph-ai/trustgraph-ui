import { useState, useMemo, useCallback } from "react";
import { useTheme, LoadingState, Input, PageGuidance, GuidanceSlot } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import { useRiskData } from "./useRiskData";
import type { RiskNode } from "./useRiskData";

export interface RiskExplorerProps {}

/* ── category colours ─────────────────────────────────────────────── */

function kindColors(theme: Theme): Record<string, string> {
  return {
    Risk: theme.palette.rose,
    Actor: theme.palette.amber,
    Asset: theme.palette.blue,
    Event: theme.palette.cyan,
    Process: theme.palette.emerald,
    ProcessStep: theme.palette.purple,
  };
}

const KIND_ICONS: Record<string, string> = {
  Risk: "⚠",
  Actor: "👤",
  Asset: "◆",
  Event: "⚡",
  Process: "⟳",
  ProcessStep: "▸",
};

type EntityKind = "Actor" | "Risk" | "Asset" | "Event";

/* ── helpers ──────────────────────────────────────────────────────── */

function riskColor(score: number, theme: Theme): string {
  if (score >= 0.8) return theme.palette.rose;
  if (score >= 0.6) return theme.palette.amber;
  return theme.palette.emerald;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function kindLabel(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").trim();
}

/* ── shared sub-components ────────────────────────────────────────── */

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: sz(8), color, fontFamily: theme.font.mono,
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: 6, paddingBottom: 4,
        borderBottom: `1px solid ${color}22`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function RelLink({ uri, label, color, onClick, sz }: { uri: string; label: string; color: string; onClick: (uri: string) => void; sz: (n: number) => number }) {
  return (
    <span
      onClick={() => onClick(uri)}
      style={{
        display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: sz(11),
        background: `${color}11`, border: `1px solid ${color}33`, color,
        cursor: "pointer", marginRight: 4, marginBottom: 4,
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = `${color}22`; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = `${color}11`; }}
    >
      {label}
    </span>
  );
}

/* ── main component ───────────────────────────────────────────────── */

export function RiskExplorer(_props: RiskExplorerProps) {
  const { theme, sz } = useTheme();
  const data = useRiskData();

  const KIND_COLORS = useMemo(() => kindColors(theme), [theme]);

  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selectNode = useCallback((uri: string) => {
    setSelectedUri(uri);
  }, []);

  /* ── partition nodes by kind ────────────────────────────────────── */

  const { actors, risks, assets, events } = useMemo(() => {
    const a: RiskNode[] = [];
    const r: RiskNode[] = [];
    const as: RiskNode[] = [];
    const ev: RiskNode[] = [];
    for (const n of data.nodes.values()) {
      if (n.kind === "Actor") a.push(n);
      else if (n.kind === "Risk") r.push(n);
      else if (n.kind === "Asset") as.push(n);
      else if (n.kind === "Event") ev.push(n);
    }
    a.sort((x, y) => x.label.localeCompare(y.label));
    r.sort((x, y) => x.label.localeCompare(y.label));
    as.sort((x, y) => x.label.localeCompare(y.label));
    ev.sort((x, y) => x.label.localeCompare(y.label));
    return { actors: a, risks: r, assets: as, events: ev };
  }, [data.nodes]);

  /* ── time range calculation ─────────────────────────────────────── */

  const { minDate, dateSpan } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const ev of events) {
      const dateStr = data.eventDates.get(ev.uri) || data.timestamps.get(ev.uri);
      if (!dateStr) continue;
      const t = new Date(dateStr).getTime();
      if (!isNaN(t)) {
        if (t < min) min = t;
        if (t > max) max = t;
      }
    }
    if (min === Infinity) { min = Date.now(); max = Date.now(); }
    return { minDate: min, maxDate: max, dateSpan: max - min || 1 };
  }, [events, data.eventDates, data.timestamps]);

  const rangeStartDate = minDate + (timeRange[0] / 100) * dateSpan;
  const rangeEndDate = minDate + (timeRange[1] / 100) * dateSpan;

  /* ── filtered events within the time window ─────────────────────── */

  const filteredEvents = useMemo(() => {
    const result: RiskNode[] = [];
    for (const ev of events) {
      const dateStr = data.eventDates.get(ev.uri) || data.timestamps.get(ev.uri);
      if (!dateStr) { result.push(ev); continue; }
      const t = new Date(dateStr).getTime();
      if (isNaN(t) || (t >= rangeStartDate && t <= rangeEndDate)) {
        result.push(ev);
      }
    }
    return result;
  }, [events, data.eventDates, data.timestamps, rangeStartDate, rangeEndDate]);

  const filteredEventUris = useMemo(() => new Set(filteredEvents.map(e => e.uri)), [filteredEvents]);

  /* ── connection lookups through filtered events ─────────────────── */

  const connectedToSelected = useMemo(() => {
    if (!selectedUri) return null;
    const selectedNode = data.nodes.get(selectedUri);
    if (!selectedNode) return null;

    const connActors = new Map<string, number>();
    const connRisks = new Map<string, number>();
    const connAssets = new Map<string, number>();
    const connEvents: string[] = [];

    const relevantEvents: string[] = [];

    if (selectedNode.kind === "Actor") {
      const evts = data.actorEvents.get(selectedUri) || [];
      for (const e of evts) {
        if (!filteredEventUris.has(e)) continue;
        relevantEvents.push(e);
      }
    } else if (selectedNode.kind === "Risk") {
      const evts = data.riskEvents.get(selectedUri) || [];
      for (const e of evts) {
        if (!filteredEventUris.has(e)) continue;
        relevantEvents.push(e);
      }
    } else if (selectedNode.kind === "Asset") {
      const evts = data.assetEvents.get(selectedUri) || [];
      for (const e of evts) {
        if (!filteredEventUris.has(e)) continue;
        relevantEvents.push(e);
      }
    } else if (selectedNode.kind === "Event") {
      if (filteredEventUris.has(selectedUri)) {
        relevantEvents.push(selectedUri);
      }
    }

    for (const e of relevantEvents) {
      connEvents.push(e);
      for (const a of (data.eventActors.get(e) || [])) {
        connActors.set(a, (connActors.get(a) || 0) + 1);
      }
      for (const r of (data.eventRisks.get(e) || [])) {
        connRisks.set(r, (connRisks.get(r) || 0) + 1);
      }
      for (const a of (data.eventAssets.get(e) || [])) {
        connAssets.set(a, (connAssets.get(a) || 0) + 1);
      }
    }

    return { connActors, connRisks, connAssets, connEvents };
  }, [selectedUri, data.nodes, data.actorEvents, data.riskEvents, data.assetEvents,
      data.eventActors, data.eventRisks, data.eventAssets, filteredEventUris]);

  /* ── left panel filtering ───────────────────────────────────────── */

  const filterBySearch = useCallback((nodes: RiskNode[]) => {
    if (!searchTerm) return nodes;
    const term = searchTerm.toLowerCase();
    return nodes.filter(n => {
      const desc = data.descriptions.get(n.uri)?.toLowerCase() || "";
      return n.label.toLowerCase().includes(term) || desc.includes(term);
    });
  }, [searchTerm, data.descriptions]);

  const filterByConnection = useCallback((nodes: RiskNode[], kind: EntityKind) => {
    if (!selectedUri || !connectedToSelected) return nodes;
    const selectedNode = data.nodes.get(selectedUri);
    if (!selectedNode) return nodes;
    // Don't filter the same category as the selected node
    if (selectedNode.kind === kind) return nodes;

    if (kind === "Event") {
      const connSet = new Set(connectedToSelected.connEvents);
      return nodes.filter(n => connSet.has(n.uri));
    }

    const connMap =
      kind === "Actor" ? connectedToSelected.connActors :
      kind === "Risk" ? connectedToSelected.connRisks :
      kind === "Asset" ? connectedToSelected.connAssets : null;

    if (!connMap) return nodes;
    return nodes.filter(n => connMap.has(n.uri));
  }, [selectedUri, connectedToSelected, data.nodes]);

  const displayActors = useMemo(
    () => filterByConnection(filterBySearch(actors), "Actor"),
    [actors, filterBySearch, filterByConnection],
  );
  const displayRisks = useMemo(
    () => filterByConnection(filterBySearch(risks), "Risk"),
    [risks, filterBySearch, filterByConnection],
  );
  const displayAssets = useMemo(
    () => filterByConnection(filterBySearch(assets), "Asset"),
    [assets, filterBySearch, filterByConnection],
  );

  const displayEvents = useMemo(() => {
    const filtered = filterByConnection(filterBySearch(filteredEvents), "Event");
    return [...filtered].sort((a, b) => {
      const da = data.eventDates.get(a.uri) || data.timestamps.get(a.uri) || "";
      const db = data.eventDates.get(b.uri) || data.timestamps.get(b.uri) || "";
      return db.localeCompare(da);
    });
  }, [filteredEvents, filterBySearch, filterByConnection, data.eventDates, data.timestamps]);

  /* ── stats within the time window ───────────────────────────────── */

  const stats = useMemo(() => {
    const actorSet = new Set<string>();
    const riskSet = new Set<string>();
    const assetSet = new Set<string>();
    for (const e of filteredEvents) {
      for (const a of (data.eventActors.get(e.uri) || [])) actorSet.add(a);
      for (const r of (data.eventRisks.get(e.uri) || [])) riskSet.add(r);
      for (const a of (data.eventAssets.get(e.uri) || [])) assetSet.add(a);
    }
    return {
      events: filteredEvents.length,
      actors: actorSet.size,
      risks: riskSet.size,
      assets: assetSet.size,
    };
  }, [filteredEvents, data.eventActors, data.eventRisks, data.eventAssets]);

  /* ── overview data (for when nothing selected) ──────────────────── */

  const sortedRisksByScore = useMemo(() => {
    return [...risks].sort((a, b) => (data.riskScores.get(b.uri) || 0) - (data.riskScores.get(a.uri) || 0));
  }, [risks, data.riskScores]);

  const topActorsByEventCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of filteredEvents) {
      for (const a of (data.eventActors.get(ev.uri) || [])) {
        counts.set(a, (counts.get(a) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredEvents, data.eventActors]);

  const topAssetsByEventCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of filteredEvents) {
      for (const a of (data.eventAssets.get(ev.uri) || [])) {
        counts.set(a, (counts.get(a) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [filteredEvents, data.eventAssets]);

  /* ── helpers ────────────────────────────────────────────────────── */

  const nodeLabel = useCallback((uri: string): string => {
    const n = data.nodes.get(uri);
    return n ? n.label : uri.split("/").pop() || uri;
  }, [data.nodes]);


  const eventDate = useCallback((uri: string): string => {
    return data.eventDates.get(uri) || data.timestamps.get(uri) || "";
  }, [data.eventDates, data.timestamps]);

  const sortedEventsByDate = useCallback((eventUris: string[]) => {
    return [...eventUris]
      .filter(u => filteredEventUris.has(u))
      .sort((a, b) => {
        const da = eventDate(a);
        const db = eventDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return new Date(db).getTime() - new Date(da).getTime();
      });
  }, [filteredEventUris, eventDate]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(c => ({ ...c, [key]: !c[key] }));
  }, []);

  /* ── loading / error states ─────────────────────────────────────── */

  if (data.isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <LoadingState message="Loading risk management data..." />
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: theme.palette.rose }}>
        <div style={{ fontSize: sz(14), marginBottom: 8 }}>Failed to load data</div>
        <div style={{ fontSize: sz(11), color: theme.text.muted }}>{data.error.message}</div>
      </div>
    );
  }

  const selected = selectedUri ? data.nodes.get(selectedUri) : null;

  /* ── render: detail panels ──────────────────────────────────────── */

  function renderOverview() {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: sz(24), opacity: 0.6 }}>🛡</span>
          <div>
            <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>Risk Overview</div>
            <div style={{
              fontSize: sz(10), color: theme.text.faint, fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {stats.events} events in time window
            </div>
          </div>
          <GuidanceSlot id="welcome" buttonOffset={{ top: -12, left: 8 }} />
        </div>

        {/* Risk heat grid */}
        <Section title="Risk Scores" color={theme.palette.rose}>
          {sortedRisksByScore.length === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No risks loaded</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sortedRisksByScore.map(r => {
                const score = data.riskScores.get(r.uri) || 0;
                const color = riskColor(score, theme);
                return (
                  <div
                    key={r.uri}
                    onClick={() => selectNode(r.uri)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "4px 6px", borderRadius: 4, cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.surface.card; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      fontSize: sz(11), color: theme.text.secondary, minWidth: 120,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {r.label}
                    </span>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${Math.max(score * 100, 2)}%`,
                        height: "100%", borderRadius: 3,
                        background: color,
                        opacity: 0.7,
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{
                      fontSize: sz(10), fontFamily: theme.font.mono,
                      color, minWidth: 28, textAlign: "right",
                    }}>
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Top actors */}
        <Section title="Top Actors by Event Count" color={theme.palette.amber}>
          {topActorsByEventCount.length === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No actors in time window</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {topActorsByEventCount.map(([uri, count]) => {
                const maxCount = topActorsByEventCount[0][1];
                return (
                  <div
                    key={uri}
                    onClick={() => selectNode(uri)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "3px 6px", borderRadius: 4, cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.surface.card; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      fontSize: sz(11), color: theme.text.secondary, minWidth: 120,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {nodeLabel(uri)}
                    </span>
                    <div style={{
                      flex: 1, height: 5, borderRadius: 3,
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${(count / maxCount) * 100}%`,
                        height: "100%", borderRadius: 3,
                        background: theme.palette.amber,
                        opacity: 0.5,
                      }} />
                    </div>
                    <span style={{
                      fontSize: sz(10), fontFamily: theme.font.mono,
                      color: theme.palette.amber, minWidth: 20, textAlign: "right",
                    }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Most impacted assets */}
        <Section title="Most Impacted Assets" color={theme.palette.blue}>
          {topAssetsByEventCount.length === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No assets in time window</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {topAssetsByEventCount.map(([uri, count]) => {
                const maxCount = topAssetsByEventCount[0][1];
                return (
                  <div
                    key={uri}
                    onClick={() => selectNode(uri)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "3px 6px", borderRadius: 4, cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.surface.card; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      fontSize: sz(11), color: theme.text.secondary, minWidth: 120,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {nodeLabel(uri)}
                    </span>
                    <div style={{
                      flex: 1, height: 5, borderRadius: 3,
                      background: "rgba(255,255,255,0.04)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${(count / maxCount) * 100}%`,
                        height: "100%", borderRadius: 3,
                        background: theme.palette.blue,
                        opacity: 0.5,
                      }} />
                    </div>
                    <span style={{
                      fontSize: sz(10), fontFamily: theme.font.mono,
                      color: theme.palette.blue, minWidth: 20, textAlign: "right",
                    }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    );
  }

  function renderActorDetail(node: RiskNode) {
    const conn = connectedToSelected!;
    const sortedEvents = sortedEventsByDate(conn.connEvents);

    return (
      <div>
        {renderDetailHeader(node)}

        <Section title="Connected Risks" color={theme.palette.rose}>
          {conn.connRisks.size === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No risks in time window</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...conn.connRisks.entries()]
                .filter(([uri]) => uri !== selectedUri)
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => {
                  const score = data.riskScores.get(uri) || 0;
                  return (
                    <div
                      key={uri}
                      onClick={() => selectNode(uri)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = theme.surface.card; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: sz(11), color: theme.text.secondary, flex: 1 }}>
                        {nodeLabel(uri)}
                      </span>
                      <span style={{
                        fontSize: sz(9), fontFamily: theme.font.mono,
                        color: theme.text.faint, marginRight: 6,
                      }}>
                        {count} event{count !== 1 ? "s" : ""}
                      </span>
                      <span style={{
                        fontSize: sz(9), fontFamily: theme.font.mono,
                        padding: "1px 6px", borderRadius: 3,
                        background: `${riskColor(score, theme)}22`,
                        color: riskColor(score, theme),
                      }}>
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Section>

        <Section title="Impacted Assets" color={theme.palette.blue}>
          {conn.connAssets.size === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No assets in time window</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...conn.connAssets.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => (
                  <div key={uri} style={{ marginRight: 4, marginBottom: 4 }}>
                    <RelLink uri={uri} label={`${nodeLabel(uri)} (${count})`} color={theme.palette.blue} onClick={selectNode} sz={sz} />
                  </div>
                ))}
            </div>
          )}
        </Section>

        {renderEventList("Recent Events", sortedEvents)}
      </div>
    );
  }

  function renderRiskDetail(node: RiskNode) {
    const conn = connectedToSelected!;
    const score = data.riskScores.get(node.uri) || 0;
    const sortedEvents = sortedEventsByDate(conn.connEvents);

    return (
      <div>
        {/* Custom header with risk score badge */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: sz(20) }}>⚠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>
                {node.label}
              </div>
              <div style={{
                fontSize: sz(10), color: KIND_COLORS[node.kind] || theme.text.muted,
                fontFamily: theme.font.mono, textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {kindLabel(node.kind)}
              </div>
            </div>
            <div style={{
              padding: "6px 14px", borderRadius: 6,
              background: `${riskColor(score, theme)}22`,
              border: `1px solid ${riskColor(score, theme)}44`,
              color: riskColor(score, theme),
              fontSize: sz(16), fontWeight: 700,
              fontFamily: theme.font.mono,
            }}>
              {(score * 100).toFixed(0)}%
            </div>
          </div>
          {renderDescription(node.uri)}
        </div>

        <Section title="Threat Actors" color={theme.palette.amber}>
          {conn.connActors.size === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No actors in time window</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...conn.connActors.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => (
                  <RelLink
                    key={uri} uri={uri}
                    label={`${nodeLabel(uri)} (${count})`}
                    color={theme.palette.amber} onClick={selectNode} sz={sz}
                  />
                ))}
            </div>
          )}
        </Section>

        <Section title="Impacted Assets" color={theme.palette.blue}>
          {conn.connAssets.size === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No assets in time window</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...conn.connAssets.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => (
                  <RelLink
                    key={uri} uri={uri}
                    label={`${nodeLabel(uri)} (${count})`}
                    color={theme.palette.blue} onClick={selectNode} sz={sz}
                  />
                ))}
            </div>
          )}
        </Section>

        {renderEventList("Events", sortedEvents)}
      </div>
    );
  }

  function renderAssetDetail(node: RiskNode) {
    const conn = connectedToSelected!;
    const sortedEvents = sortedEventsByDate(conn.connEvents);

    return (
      <div>
        {renderDetailHeader(node)}

        <Section title="Threat Actors" color={theme.palette.amber}>
          {conn.connActors.size === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No actors in time window</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...conn.connActors.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => (
                  <RelLink
                    key={uri} uri={uri}
                    label={`${nodeLabel(uri)} (${count})`}
                    color={theme.palette.amber} onClick={selectNode} sz={sz}
                  />
                ))}
            </div>
          )}
        </Section>

        <Section title="Associated Risks" color={theme.palette.rose}>
          {conn.connRisks.size === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.faint }}>No risks in time window</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...conn.connRisks.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => {
                  const score = data.riskScores.get(uri) || 0;
                  return (
                    <div
                      key={uri}
                      onClick={() => selectNode(uri)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = theme.surface.card; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: sz(11), color: theme.text.secondary, flex: 1 }}>
                        {nodeLabel(uri)}
                      </span>
                      <span style={{
                        fontSize: sz(9), fontFamily: theme.font.mono,
                        color: theme.text.faint, marginRight: 6,
                      }}>
                        {count} event{count !== 1 ? "s" : ""}
                      </span>
                      <span style={{
                        fontSize: sz(9), fontFamily: theme.font.mono,
                        padding: "1px 6px", borderRadius: 3,
                        background: `${riskColor(score, theme)}22`,
                        color: riskColor(score, theme),
                      }}>
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Section>

        {renderEventList("Events", sortedEvents)}
      </div>
    );
  }

  function renderEventDetail(node: RiskNode) {
    const date = eventDate(node.uri);
    const eventActors = data.eventActors.get(node.uri) || [];
    const eventRisks = data.eventRisks.get(node.uri) || [];
    const eventAssets = data.eventAssets.get(node.uri) || [];
    const processes = data.eventProcesses.get(node.uri) || [];

    return (
      <div>
        {/* Event header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: sz(20) }}>⚡</span>
            <div>
              <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>
                {node.label}
              </div>
              <div style={{
                fontSize: sz(10), color: KIND_COLORS.Event,
                fontFamily: theme.font.mono, textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {date ? formatDate(date) : "No date"}
              </div>
            </div>
          </div>
          {renderDescription(node.uri)}
        </div>

        {/* Actor / Risk / Asset badges */}
        <Section title="Actor" color={theme.palette.amber}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {eventActors.length === 0
              ? <span style={{ fontSize: sz(11), color: theme.text.faint }}>None</span>
              : eventActors.map(uri => (
                  <RelLink key={uri} uri={uri} label={nodeLabel(uri)} color={theme.palette.amber} onClick={selectNode} sz={sz} />
                ))}
          </div>
        </Section>

        <Section title="Risk" color={theme.palette.rose}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {eventRisks.length === 0
              ? <span style={{ fontSize: sz(11), color: theme.text.faint }}>None</span>
              : eventRisks.map(uri => {
                  const score = data.riskScores.get(uri);
                  const scoreStr = score != null ? ` (${(score * 100).toFixed(0)}%)` : "";
                  return (
                    <RelLink key={uri} uri={uri} label={`${nodeLabel(uri)}${scoreStr}`} color={theme.palette.rose} onClick={selectNode} sz={sz} />
                  );
                })}
          </div>
        </Section>

        <Section title="Asset" color={theme.palette.blue}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {eventAssets.length === 0
              ? <span style={{ fontSize: sz(11), color: theme.text.faint }}>None</span>
              : eventAssets.map(uri => (
                  <RelLink key={uri} uri={uri} label={nodeLabel(uri)} color={theme.palette.blue} onClick={selectNode} sz={sz} />
                ))}
          </div>
        </Section>

        {/* Incident Response */}
        {processes.length > 0 && (
          <Section title="Incident Response" color={theme.palette.emerald}>
            {processes.map(procUri => renderProcessDetail(procUri))}
          </Section>
        )}
      </div>
    );
  }

  function renderProcessDetail(procUri: string) {
    const procNode = data.nodes.get(procUri);
    const status = data.processStatus.get(procUri) || "open";
    const invBy = data.invokedBy.get(procUri);
    const assignee = data.assignedTo.get(procUri);
    const steps = (data.processSteps.get(procUri) || [])
      .map(stepUri => ({
        uri: stepUri,
        label: nodeLabel(stepUri),
        number: data.stepNumbers.get(stepUri) ?? 999,
        complete: data.stepComplete.get(stepUri) ?? false,
        assignedTo: data.assignedTo.get(stepUri),
      }))
      .sort((a, b) => a.number - b.number);

    const completedSteps = steps.filter(s => s.complete).length;
    const progress = steps.length > 0 ? completedSteps / steps.length : 0;

    const statusColor =
      status === "resolved" ? theme.palette.emerald :
      status === "in-progress" ? theme.palette.amber :
      theme.palette.rose;

    return (
      <div key={procUri} style={{
        padding: "10px 12px", borderRadius: 6,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${theme.border.subtle}`,
        marginBottom: 10,
      }}>
        {/* Process header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: sz(12) }}>⟳</span>
          <span style={{ fontSize: sz(12), color: theme.text.primary, fontWeight: 600, flex: 1 }}>
            {procNode?.label || procUri.split("/").pop()}
          </span>
          <span style={{
            fontSize: sz(9), fontFamily: theme.font.mono,
            padding: "2px 8px", borderRadius: 4,
            background: `${statusColor}22`,
            border: `1px solid ${statusColor}33`,
            color: statusColor,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {status}
          </span>
        </div>

        {/* Meta */}
        <div style={{
          display: "flex", gap: 16, fontSize: sz(10), color: theme.text.faint,
          fontFamily: theme.font.mono, marginBottom: 10,
        }}>
          {invBy && <span>invoked by: <span style={{ color: theme.text.secondary }}>{invBy}</span></span>}
          {assignee && <span>assigned to: <span style={{ color: theme.text.secondary }}>{assignee}</span></span>}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, borderRadius: 2, background: theme.surface.cardHover,
          marginBottom: 10, overflow: "hidden",
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: "100%", borderRadius: 2,
            background: statusColor,
            opacity: 0.6,
            transition: "width 0.3s",
          }} />
        </div>
        <div style={{
          fontSize: sz(9), color: theme.text.faint, fontFamily: theme.font.mono,
          marginBottom: 8, textAlign: "right",
        }}>
          {completedSteps}/{steps.length} steps ({(progress * 100).toFixed(0)}%)
        </div>

        {/* Steps */}
        {steps.map(step => (
          <div key={step.uri} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "3px 0", fontSize: sz(11),
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: sz(9), flexShrink: 0,
              background: step.complete ? `${theme.palette.emerald}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${step.complete ? `${theme.palette.emerald}44` : "rgba(255,255,255,0.1)"}`,
              color: step.complete ? theme.palette.emerald : theme.text.faint,
            }}>
              {step.complete ? "✓" : ""}
            </span>
            <span style={{
              fontSize: sz(9), color: theme.text.faint, fontFamily: theme.font.mono,
              minWidth: 16,
            }}>
              {step.number}.
            </span>
            <span style={{
              flex: 1, color: step.complete ? theme.text.secondary : theme.text.muted,
              fontSize: sz(11),
            }}>
              {step.label}
            </span>
            {step.assignedTo && (
              <span style={{
                fontSize: sz(9), color: theme.text.faint, fontFamily: theme.font.mono,
              }}>
                {step.assignedTo}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  /* ── shared detail sub-renderers ────────────────────────────────── */

  function renderDetailHeader(node: RiskNode) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: sz(20) }}>{KIND_ICONS[node.kind] || "●"}</span>
          <div>
            <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>
              {node.label}
            </div>
            <div style={{
              fontSize: sz(10), color: KIND_COLORS[node.kind] || theme.text.muted,
              fontFamily: theme.font.mono, textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {kindLabel(node.kind)}
            </div>
          </div>
        </div>
        {renderDescription(node.uri)}
      </div>
    );
  }

  function renderDescription(uri: string) {
    const desc = data.descriptions.get(uri);
    if (!desc) return null;
    return (
      <div style={{
        fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6,
        padding: "12px 14px", borderRadius: 6,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${theme.border.subtle}`,
      }}>
        {desc}
      </div>
    );
  }

  function renderEventList(title: string, eventUris: string[]) {
    return (
      <Section title={title} color={theme.palette.cyan}>
        {eventUris.length === 0 ? (
          <div style={{ fontSize: sz(11), color: theme.text.faint }}>No events in time window</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {eventUris.slice(0, 50).map(uri => {
              const date = eventDate(uri);
              const evRisks = data.eventRisks.get(uri) || [];
              const evAssets = data.eventAssets.get(uri) || [];
              return (
                <div
                  key={uri}
                  onClick={() => selectNode(uri)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = theme.surface.card; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    fontSize: sz(9), fontFamily: theme.font.mono,
                    color: theme.text.faint, minWidth: 72,
                  }}>
                    {date ? formatDate(date) : "--"}
                  </span>
                  <span style={{ fontSize: sz(11), color: theme.text.secondary, flex: 1 }}>
                    {nodeLabel(uri)}
                  </span>
                  {evRisks.length > 0 && (
                    <span style={{
                      fontSize: sz(9), padding: "1px 5px", borderRadius: 3,
                      background: `${theme.palette.rose}11`, color: theme.palette.rose,
                    }}>
                      {nodeLabel(evRisks[0])}
                    </span>
                  )}
                  {evAssets.length > 0 && (
                    <span style={{
                      fontSize: sz(9), padding: "1px 5px", borderRadius: 3,
                      background: `${theme.palette.blue}11`, color: theme.palette.blue,
                    }}>
                      {nodeLabel(evAssets[0])}
                    </span>
                  )}
                </div>
              );
            })}
            {eventUris.length > 50 && (
              <div style={{ fontSize: sz(10), color: theme.text.faint, padding: "4px 8px" }}>
                ... and {eventUris.length - 50} more
              </div>
            )}
          </div>
        )}
      </Section>
    );
  }

  function renderDetail() {
    if (!selected || !connectedToSelected) return renderOverview();

    switch (selected.kind) {
      case "Actor": return renderActorDetail(selected);
      case "Risk": return renderRiskDetail(selected);
      case "Asset": return renderAssetDetail(selected);
      case "Event": return renderEventDetail(selected);
      default: return renderOverview();
    }
  }

  /* ── render: left panel category section ────────────────────────── */

  function renderCategorySection(
    label: string,
    icon: string,
    color: string,
    items: RiskNode[],
    sectionKey: string,
    renderExtra?: (node: RiskNode) => React.ReactNode,
  ) {
    const isCollapsed = collapsed[sectionKey] ?? false;

    return (
      <div style={{ marginBottom: 2 }}>
        {/* Section header */}
        <div
          onClick={() => toggleCollapse(sectionKey)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", cursor: "pointer",
            borderBottom: `1px solid ${color}15`,
            transition: "all 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize: sz(10) }}>{icon}</span>
          <span style={{
            fontSize: sz(9), color, fontFamily: theme.font.mono,
            textTransform: "uppercase", letterSpacing: "0.06em", flex: 1,
          }}>
            {label}
          </span>
          <span style={{
            fontSize: sz(9), fontFamily: theme.font.mono,
            color: theme.text.faint,
          }}>
            {items.length}
          </span>
          <span style={{
            fontSize: sz(8), color: theme.text.faint,
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}>
            ▼
          </span>
        </div>

        {/* Items */}
        {!isCollapsed && (
          <div style={{ padding: "4px 0" }}>
            {items.length === 0 ? (
              <div style={{ fontSize: sz(10), color: theme.text.faint, padding: "6px 16px" }}>
                No matches
              </div>
            ) : (
              items.map(node => {
                const isSelected = selectedUri === node.uri;
                return (
                  <div
                    key={node.uri}
                    onClick={() => selectNode(node.uri)}
                    style={{
                      padding: "5px 8px", paddingLeft: 16, borderRadius: 4, cursor: "pointer",
                      fontSize: sz(12), lineHeight: 1.3,
                      background: isSelected ? `${color}15` : "transparent",
                      color: isSelected ? color : theme.text.secondary,
                      borderLeft: isSelected ? `2px solid ${color}` : "2px solid transparent",
                      transition: "all 0.12s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = theme.surface.card;
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                    }}>
                      {node.label}
                    </span>
                    {renderExtra?.(node)}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── slider CSS ─────────────────────────────────────────────────── */

  const sliderTrackStyle: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: "none",
  };

  const sliderInputStyle: React.CSSProperties = {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    margin: 0, padding: 0,
    WebkitAppearance: "none", appearance: "none" as "none",
    background: "transparent",
    cursor: "pointer",
    pointerEvents: "none",
  };

  /* ── main render ────────────────────────────────────────────────── */

  return (
    <PageGuidance pageKey="risk-management">
    <div style={{
      display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden",
      borderTop: `1px solid ${theme.border.default}`,
    }}>
      {/* ── TOP BAR: time range slider + stats ── */}
      <div style={{
        padding: "10px 16px",
        borderBottom: `1px solid ${theme.border.subtle}`,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        {/* Date labels & slider */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: sz(10), fontFamily: theme.font.mono,
            color: theme.text.faint, minWidth: 80, whiteSpace: "nowrap",
          }}>
            {formatDate(new Date(rangeStartDate).toISOString())}
          </span>

          {/* Dual-handle slider container */}
          <div style={{
            flex: 1, position: "relative", height: 20, minWidth: 120,
          }}>
            {/* Track background */}
            <div style={{
              ...sliderTrackStyle,
              top: 8, height: 4, borderRadius: 2,
              background: theme.surface.cardHover,
              border: `1px solid ${theme.border.subtle}`,
            }} />
            {/* Active range highlight */}
            <div style={{
              ...sliderTrackStyle,
              top: 8, height: 4, borderRadius: 2,
              left: `${timeRange[0]}%`,
              right: `${100 - timeRange[1]}%`,
              background: `${theme.palette.cyan}33`,
              pointerEvents: "none",
            }} />
            {/* Min slider */}
            <input
              type="range"
              className="risk-explorer-slider"
              min={0} max={100} value={timeRange[0]}
              onChange={e => {
                const v = Number(e.target.value);
                setTimeRange(([, hi]) => [Math.min(v, hi - 1), hi]);
              }}
              style={sliderInputStyle}
            />
            {/* Max slider */}
            <input
              type="range"
              className="risk-explorer-slider"
              min={0} max={100} value={timeRange[1]}
              onChange={e => {
                const v = Number(e.target.value);
                setTimeRange(([lo]) => [lo, Math.max(v, lo + 1)]);
              }}
              style={sliderInputStyle}
            />
            {/* Slider thumb styling via inline <style> */}
            <style>{`
              .risk-explorer-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px; height: 12px; border-radius: 50%;
                background: #0A0A0F;
                border: 2px solid ${theme.palette.cyan};
                cursor: pointer;
                position: relative;
                z-index: 2;
                pointer-events: auto;
              }
              .risk-explorer-slider::-moz-range-thumb {
                width: 12px; height: 12px; border-radius: 50%;
                background: #0A0A0F;
                border: 2px solid ${theme.palette.cyan};
                cursor: pointer;
                pointer-events: auto;
              }
              .risk-explorer-slider::-webkit-slider-runnable-track {
                height: 4px; background: transparent;
              }
              .risk-explorer-slider::-moz-range-track {
                height: 4px; background: transparent; border: none;
              }
            `}</style>
          </div>

          <span style={{
            fontSize: sz(10), fontFamily: theme.font.mono,
            color: theme.text.faint, minWidth: 80, whiteSpace: "nowrap", textAlign: "right",
          }}>
            {formatDate(new Date(rangeEndDate).toISOString())}
          </span>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: 12, fontSize: sz(10), color: theme.text.faint,
          fontFamily: theme.font.mono,
          borderLeft: `1px solid ${theme.border.subtle}`, paddingLeft: 16,
        }}>
          <span><span style={{ color: theme.palette.cyan }}>{stats.events}</span> events</span>
          <span><span style={{ color: theme.palette.amber }}>{stats.actors}</span> actors</span>
          <span><span style={{ color: theme.palette.rose }}>{stats.risks}</span> risks</span>
          <span><span style={{ color: theme.palette.blue }}>{stats.assets}</span> assets</span>
        </div>
      </div>

      {/* ── BODY: left panel + right panel ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT PANEL: Three-Category Entity Browser ── */}
        <div style={{
          width: 340, minWidth: 340, borderRight: `1px solid ${theme.border.default}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${theme.border.subtle}` }}>
            <Input
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search actors, risks, assets..."
            />
          </div>

          {/* Scrollable category list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {renderCategorySection("Actors", "👤", theme.palette.amber, displayActors, "actors")}
            {renderCategorySection("Risks", "⚠", theme.palette.rose, displayRisks, "risks", (node) => {
              const score = data.riskScores.get(node.uri);
              if (score == null) return null;
              const color = riskColor(score, theme);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 4, borderRadius: 2,
                    background: theme.surface.cardHover, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${score * 100}%`, height: "100%",
                      borderRadius: 2, background: color, opacity: 0.7,
                    }} />
                  </div>
                  <span style={{
                    fontSize: sz(9), fontFamily: theme.font.mono,
                    color, minWidth: 22, textAlign: "right",
                  }}>
                    {(score * 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
            {renderCategorySection("Assets", "◆", theme.palette.blue, displayAssets, "assets")}
            {renderCategorySection("Events", "⚡", theme.palette.cyan, displayEvents, "events", (node) => {
              const date = data.eventDates.get(node.uri) || data.timestamps.get(node.uri);
              if (!date) return null;
              return (
                <span style={{
                  fontSize: sz(9), fontFamily: theme.font.mono,
                  color: theme.text.faint, flexShrink: 0, whiteSpace: "nowrap",
                }}>
                  {formatDate(date)}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL: Detail View ── */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {renderDetail()}
        </div>
      </div>
    </div>
    </PageGuidance>
  );
}
