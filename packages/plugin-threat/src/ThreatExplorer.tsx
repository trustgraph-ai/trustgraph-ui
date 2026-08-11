import { useState, useMemo, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";
import { useTheme } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import { useOcsfData } from "./useOcsfData";
import type { OcsfNode } from "./useOcsfData";

const OCSF_SPINNER_ID = "ocsf-spinner-keyframes";
function ensureSpinnerStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(OCSF_SPINNER_ID)) return;
  const style = document.createElement("style");
  style.id = OCSF_SPINNER_ID;
  style.textContent = `
    @keyframes ocsf-spin { to { transform: rotate(360deg); } }
    @keyframes ocsf-pulse { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
  `;
  document.head.appendChild(style);
}

export interface ThreatExplorerProps {}

/* ── constants ────────────────────────────────────────────────────── */

/* ── risk event subtypes ──────────────────────────────────────────── */

const RISK_EVENT_KINDS = new Set([
  "SensitiveOperation", "ExternalDnsLookup", "IdentityLifecycle",
  "PrivilegeChange", "CredentialSharing", "DataMovement",
  "EvidenceDestruction", "ComplianceAlert", "AfterHoursActivity",
  "AnomalousActivity", "SensitiveAuthentication", "LateralMovement",
]);

const EVENT_TYPE_DRILL: Record<string, string[]> = {
  SensitiveOperation:      ["actor_name", "service", "operation", "resource_name"],
  ExternalDnsLookup:       ["actor_name", "domain"],
  IdentityLifecycle:       ["actor_name", "entity_name"],
  PrivilegeChange:         ["actor_name", "entity_name"],
  CredentialSharing:       ["actor_name", "user_name", "dst_host"],
  DataMovement:            ["actor_name", "service", "operation"],
  EvidenceDestruction:     ["actor_name", "entity_name", "service"],
  ComplianceAlert:         ["actor_name", "finding_title"],
  AfterHoursActivity:      ["actor_name", "service", "operation"],
  AnomalousActivity:       ["actor_name", "class_name"],
  SensitiveAuthentication: ["actor_name", "dst_host"],
  LateralMovement:         ["actor_name", "dst_host"],
};

/* ── asset subtypes ───────────────────────────────────────────────── */

const ASSET_KINDS = new Set([
  "Service", "Resource", "Domain", "ExternalDomain",
  "ServiceAccount", "Account", "Policy", "Infrastructure",
]);

const ASSET_TYPE_FIELDS: Record<string, string[]> = {
  Service: ["service"],
  Resource: ["resource_name"],
  Domain: ["domain"],
  ExternalDomain: ["domain"],
  ServiceAccount: ["entity_name", "user_name"],
  Account: ["entity_name", "user_name"],
  Policy: ["entity_name"],
  Infrastructure: ["dst_host"],
};

/* ── display ──────────────────────────────────────────────────────── */

function kindColors(theme: Theme): Record<string, string> {
  return {
    // Risk event types
    SensitiveOperation: theme.palette.cyan,
    ExternalDnsLookup: theme.palette.purple,
    IdentityLifecycle: theme.palette.amber,
    PrivilegeChange: theme.palette.orange,
    CredentialSharing: theme.palette.rose,
    DataMovement: theme.palette.red,
    EvidenceDestruction: theme.palette.rose,
    ComplianceAlert: theme.palette.blue,
    AfterHoursActivity: theme.palette.amber,
    AnomalousActivity: theme.palette.cyan,
    SensitiveAuthentication: theme.palette.orange,
    LateralMovement: theme.palette.purple,
    // Non-event types
    Actor: theme.palette.amber,
    RiskCategory: theme.palette.rose,
    Service: theme.palette.blue,
    Resource: theme.palette.emerald,
    Domain: theme.palette.purple,
    ExternalDomain: theme.palette.purple,
    ServiceAccount: theme.palette.orange,
    Account: theme.palette.orange,
    Policy: theme.palette.pink,
    Infrastructure: theme.palette.blue,
  };
}

const KIND_ICONS: Record<string, string> = {
  SensitiveOperation: "\u26A0",
  ExternalDnsLookup: "\u25CB",
  IdentityLifecycle: "\u2611",
  PrivilegeChange: "\u2191",
  CredentialSharing: "\u21C4",
  DataMovement: "\u21E8",
  EvidenceDestruction: "\u2717",
  ComplianceAlert: "\u2636",
  AfterHoursActivity: "\u263E",
  AnomalousActivity: "\u2234",
  SensitiveAuthentication: "\u26BF",
  LateralMovement: "\u21F6",
  Actor: "\u{1F464}",
  RiskCategory: "\u2622",
  Service: "\u25C6",
  Resource: "\u25A0",
  Domain: "\u25CB",
  ExternalDomain: "\u25CB",
  ServiceAccount: "\u2611",
  Account: "\u2611",
  Policy: "\u2636",
  Infrastructure: "\u25A3",
};

const SEVERITY_ORDER: Record<string, number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3, Informational: 4,
};

function severityColors(theme: Theme): Record<string, string> {
  return {
    Critical: theme.palette.rose,
    High: theme.palette.orange,
    Medium: theme.palette.amber,
    Low: theme.palette.emerald,
    Informational: theme.palette.blue,
  };
}

type SortKey = "time" | "severity" | "category" | "actor" | "asset";

interface PivotStep {
  uri: string;
  label: string;
  kind: string;
}

interface Finding {
  id: string;
  text: string;
  timestamp: string;
  pivotTrail: PivotStep[];
  linkedEvents: string[];
  linkedActors: string[];
  linkedAssets: string[];
  linkedCategories: string[];
}

/* ── helpers ──────────────────────────────────────────────────────── */

function severityColor(sev: string, theme: Theme): string {
  return severityColors(theme)[sev] || theme.text.faint;
}

function riskColor(score: number, theme: Theme): string {
  if (score >= 0.8) return theme.palette.rose;
  if (score >= 0.6) return theme.palette.amber;
  return theme.palette.emerald;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

/* ── sub-components ───────────────────────────────────────────────── */

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const { sz } = useTheme();
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

function PivotLink({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  const { sz } = useTheme();
  return (
    <span
      onClick={onClick}
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

export function ThreatExplorer(_props: ThreatExplorerProps) {
  const { theme, sz } = useTheme();
  const data = useOcsfData();
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);

  const KIND_COLORS = useMemo(() => kindColors(theme), [theme]);

  const [pivotTrail, setPivotTrail] = useState<PivotStep[]>([]);
  const [selectedEventUri, setSelectedEventUri] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("time");
  const [searchTerm, setSearchTerm] = useState("");

  const [rawPanelOpen, setRawPanelOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [rawResults, setRawResults] = useState<Record<string, unknown>[] | null>(null);
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingDraft, setFindingDraft] = useState("");
  const [showFindings, setShowFindings] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiExploreNext, setAiExploreNext] = useState<string[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamText, setAiStreamText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const aiBufferRef = useRef("");

  const [docResult, setDocResult] = useState<Record<string, any> | null>(null);
  const [docStreaming, setDocStreaming] = useState(false);
  const [docStreamText, setDocStreamText] = useState("");
  const [docError, setDocError] = useState<string | null>(null);
  const docBufferRef = useRef("");
  const [docMode, setDocMode] = useState<"document" | "response-plan" | null>(null);

  const currentPivot = pivotTrail.length > 0 ? pivotTrail[pivotTrail.length - 1] : null;

  /* ── partition nodes ────────────────────────────────────────────── */

  const { riskEvents, actors, assets, categories } = useMemo(() => {
    const re: OcsfNode[] = [];
    const ac: OcsfNode[] = [];
    const as_: OcsfNode[] = [];
    const cat: OcsfNode[] = [];
    for (const n of data.nodes.values()) {
      if (RISK_EVENT_KINDS.has(n.kind)) re.push(n);
      else if (n.kind === "Actor") ac.push(n);
      else if (n.kind === "RiskCategory") cat.push(n);
      else if (ASSET_KINDS.has(n.kind)) as_.push(n);
    }
    return { riskEvents: re, actors: ac, assets: as_, categories: cat };
  }, [data.nodes]);

  /* ── events connected to current pivot ──────────────────────────── */

  const pivotedEvents = useMemo(() => {
    if (!currentPivot) return riskEvents;
    const node = data.nodes.get(currentPivot.uri);
    if (!node) return riskEvents;

    let eventUris: string[] = [];
    if (node.kind === "Actor") eventUris = data.actorEvents.get(node.uri) || [];
    else if (ASSET_KINDS.has(node.kind)) eventUris = data.assetEvents.get(node.uri) || [];
    else if (node.kind === "RiskCategory") eventUris = data.riskEvents.get(node.uri) || [];
    else return riskEvents;

    const uriSet = new Set(eventUris);
    return riskEvents.filter(e => uriSet.has(e.uri));
  }, [currentPivot, riskEvents, data.nodes, data.actorEvents, data.assetEvents, data.riskEvents]);

  /* ── sorting & filtering ────────────────────────────────────────── */

  const getTimestamp = useCallback((uri: string): string => {
    return data.timestamps.get(uri) || data.eventDates.get(uri) || "";
  }, [data.timestamps, data.eventDates]);

  const sortedFilteredEvents = useMemo(() => {
    let list = pivotedEvents;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(e => {
        const desc = data.descriptions.get(e.uri)?.toLowerCase() || "";
        const actorUris = data.eventActors.get(e.uri) || [];
        const actorMatch = actorUris.some(u => (data.nodes.get(u)?.label || "").toLowerCase().includes(term));
        return e.label.toLowerCase().includes(term) || desc.includes(term) || actorMatch;
      });
    }

    const sorted = [...list];
    switch (sortBy) {
      case "time":
        sorted.sort((a, b) => {
          const ta = getTimestamp(a.uri);
          const tb = getTimestamp(b.uri);
          return tb.localeCompare(ta);
        });
        break;
      case "severity":
        sorted.sort((a, b) => {
          const sa = SEVERITY_ORDER[data.severities.get(a.uri) || ""] ?? 99;
          const sb = SEVERITY_ORDER[data.severities.get(b.uri) || ""] ?? 99;
          return sa - sb;
        });
        break;
      case "category":
        sorted.sort((a, b) => {
          const ca = (data.eventRisks.get(a.uri) || []).map(u => data.nodes.get(u)?.label || "").join(",");
          const cb = (data.eventRisks.get(b.uri) || []).map(u => data.nodes.get(u)?.label || "").join(",");
          return ca.localeCompare(cb);
        });
        break;
      case "actor":
        sorted.sort((a, b) => {
          const aa = (data.eventActors.get(a.uri) || []).map(u => data.nodes.get(u)?.label || "").join(",");
          const ab = (data.eventActors.get(b.uri) || []).map(u => data.nodes.get(u)?.label || "").join(",");
          return aa.localeCompare(ab);
        });
        break;
      case "asset":
        sorted.sort((a, b) => {
          const aa = (data.eventAssets.get(a.uri) || []).map(u => data.nodes.get(u)?.label || "").join(",");
          const ab = (data.eventAssets.get(b.uri) || []).map(u => data.nodes.get(u)?.label || "").join(",");
          return aa.localeCompare(ab);
        });
        break;
    }
    return sorted;
  }, [pivotedEvents, sortBy, searchTerm, data.descriptions, data.severities,
      data.eventRisks, data.eventActors, data.eventAssets, data.nodes, getTimestamp]);

  /* ── connected entities for current pivot ───────────────────────── */

  const pivotConnections = useMemo(() => {
    if (!currentPivot) return null;
    const node = data.nodes.get(currentPivot.uri);
    if (!node) return null;

    const connActors = new Map<string, number>();
    const connAssets = new Map<string, number>();
    const connCategories = new Map<string, number>();

    const eventUris =
      node.kind === "Actor" ? (data.actorEvents.get(node.uri) || []) :
      ASSET_KINDS.has(node.kind) ? (data.assetEvents.get(node.uri) || []) :
      node.kind === "RiskCategory" ? (data.riskEvents.get(node.uri) || []) : [];

    for (const e of eventUris) {
      for (const a of (data.eventActors.get(e) || []))
        connActors.set(a, (connActors.get(a) || 0) + 1);
      for (const a of (data.eventAssets.get(e) || []))
        connAssets.set(a, (connAssets.get(a) || 0) + 1);
      for (const r of (data.eventRisks.get(e) || []))
        connCategories.set(r, (connCategories.get(r) || 0) + 1);
    }

    connActors.delete(node.uri);
    connAssets.delete(node.uri);
    connCategories.delete(node.uri);

    return { connActors, connAssets, connCategories, eventCount: eventUris.length };
  }, [currentPivot, data.nodes, data.actorEvents, data.assetEvents, data.riskEvents,
      data.eventActors, data.eventAssets, data.eventRisks]);

  /* ── pivot actions ──────────────────────────────────────────────── */

  const clearAi = useCallback(() => {
    setAiAnalysis(null);
    setAiExploreNext([]);
    setAiStreamText("");
    setAiError(null);
    aiBufferRef.current = "";
  }, []);

  const pivot = useCallback((uri: string) => {
    const node = data.nodes.get(uri);
    if (!node) return;
    setPivotTrail(trail => [...trail, { uri: node.uri, label: node.label, kind: node.kind }]);
    setSelectedEventUri(null);
    clearAi();
  }, [data.nodes, clearAi]);

  const pivotTo = useCallback((index: number) => {
    setPivotTrail(trail => trail.slice(0, index + 1));
    setSelectedEventUri(null);
    clearAi();
  }, [clearAi]);

  const clearPivot = useCallback(() => {
    setPivotTrail([]);
    setSelectedEventUri(null);
    clearAi();
  }, [clearAi]);

  const selectEvent = useCallback((uri: string) => {
    setSelectedEventUri(uri);
    clearAi();
  }, [clearAi]);

  /* ── raw event drill-down ───────────────────────────────────────── */

  const buildDrillQuery = useCallback((filters: { field: string; value: string }[], drillFields: string[]): string => {
    const parts = filters.map(f => `${f.field}: { eq: "${f.value}" }`);
    const where = parts.length > 0 ? `(where: { ${parts.join(", ")} })` : "(limit: 50)";
    const fields = drillFields.join("\n    ");
    return `{\n  securityevents${where} {\n    time\n    ${fields}\n    severity\n    status\n  }\n}`;
  }, []);

  const executeDrill = useCallback(async (query: string) => {
    setRawPanelOpen(true);
    setRawQuery(query);
    setRawLoading(true);
    setRawError(null);
    setRawResults(null);
    setRawColumns([]);

    try {
      const api = socket.flow(flowId);
      const result = await api.rowsQuery(query) as { data?: Record<string, unknown[]> };

      if (result.data) {
        const firstKey = Object.keys(result.data)[0];
        const rows = (firstKey ? result.data[firstKey] : []) as Record<string, unknown>[];
        if (rows.length > 0) {
          setRawColumns(Object.keys(rows[0]));
          setRawResults(rows);
        } else {
          setRawResults([]);
          setRawColumns([]);
        }
      } else {
        setRawResults([]);
        setRawColumns([]);
      }
    } catch (err) {
      setRawError(err instanceof Error ? err.message : String(err));
    } finally {
      setRawLoading(false);
    }
  }, [socket, flowId]);

  const drillFromEvent = useCallback((eventUri: string) => {
    const eventNode = data.nodes.get(eventUri);
    if (!eventNode) return;

    const drillFields = EVENT_TYPE_DRILL[eventNode.kind] || ["actor_name"];
    const drillFieldSet = new Set(drillFields);
    const filters: { field: string; value: string }[] = [];

    if (drillFieldSet.has("actor_name")) {
      const actorUris = data.eventActors.get(eventUri) || [];
      if (actorUris.length > 0) {
        const actorName = data.nodes.get(actorUris[0])?.label;
        if (actorName) filters.push({ field: "actor_name", value: actorName });
      }
    }

    const assetUris = data.eventAssets.get(eventUri) || [];
    for (const assetUri of assetUris) {
      const assetNode = data.nodes.get(assetUri);
      if (!assetNode) continue;
      const candidates = ASSET_TYPE_FIELDS[assetNode.kind] || [];
      const field = candidates.find(f => drillFieldSet.has(f));
      if (field) {
        filters.push({ field, value: assetNode.label });
      }
    }

    executeDrill(buildDrillQuery(filters, drillFields));
  }, [data.nodes, data.eventActors, data.eventAssets, executeDrill, buildDrillQuery]);

  const drillFromPivot = useCallback((uri: string) => {
    const node = data.nodes.get(uri);
    if (!node) return;

    const filters: { field: string; value: string }[] = [];
    let drillFields: string[];

    if (node.kind === "Actor") {
      filters.push({ field: "actor_name", value: node.label });
      drillFields = ["actor_name", "class_name", "activity_name", "operation", "service", "resource_name"];
    } else if (ASSET_KINDS.has(node.kind)) {
      const field = (ASSET_TYPE_FIELDS[node.kind] || [])[0];
      if (field) filters.push({ field, value: node.label });
      drillFields = ["actor_name", "class_name", "activity_name", field || "service"];
    } else {
      drillFields = ["actor_name", "class_name", "activity_name"];
    }

    executeDrill(buildDrillQuery(filters, drillFields));
  }, [data.nodes, executeDrill, buildDrillQuery]);

  /* ── findings ───────────────────────────────────────────────────── */

  const recordFinding = useCallback(() => {
    if (!findingDraft.trim()) return;

    const linkedEvents: string[] = [];
    const linkedActors: string[] = [];
    const linkedAssets: string[] = [];
    const linkedCategories: string[] = [];

    if (selectedEventUri) {
      linkedEvents.push(selectedEventUri);
      for (const a of (data.eventActors.get(selectedEventUri) || [])) linkedActors.push(a);
      for (const a of (data.eventAssets.get(selectedEventUri) || [])) linkedAssets.push(a);
      for (const r of (data.eventRisks.get(selectedEventUri) || [])) linkedCategories.push(r);
    }

    if (currentPivot) {
      const node = data.nodes.get(currentPivot.uri);
      if (node) {
        if (node.kind === "Actor") linkedActors.push(node.uri);
        else if (ASSET_KINDS.has(node.kind)) linkedAssets.push(node.uri);
        else if (node.kind === "RiskCategory") linkedCategories.push(node.uri);
      }
    }

    const finding: Finding = {
      id: `f-${Date.now()}`,
      text: findingDraft.trim(),
      timestamp: new Date().toISOString(),
      pivotTrail: [...pivotTrail],
      linkedEvents: [...new Set(linkedEvents)],
      linkedActors: [...new Set(linkedActors)],
      linkedAssets: [...new Set(linkedAssets)],
      linkedCategories: [...new Set(linkedCategories)],
    };

    setFindings(prev => [...prev, finding]);
    setFindingDraft("");
  }, [findingDraft, selectedEventUri, currentPivot, pivotTrail,
      data.eventActors, data.eventAssets, data.eventRisks, data.nodes]);

  /* ── AI analysis ─────────────────────────────────────────────────── */

  const analyzeContext = useCallback(() => {
    const targetUri = selectedEventUri || currentPivot?.uri;
    if (!targetUri) return;
    const node = data.nodes.get(targetUri);
    if (!node) return;

    setAiAnalysis(null);
    setAiExploreNext([]);
    setAiStreaming(true);
    setAiStreamText("");
    setAiError(null);
    aiBufferRef.current = "";

    const terms: Record<string, unknown> = {
      entity_type: node.kind,
      entity_label: node.label,
      entity_description: data.descriptions.get(node.uri) || "",
      pivot_trail: pivotTrail.map(s => ({ kind: s.kind, label: s.label })),
    };

    if (RISK_EVENT_KINDS.has(node.kind)) {
      terms.severity = data.severities.get(node.uri) || "";
      const catUris = data.eventRisks.get(node.uri) || [];
      terms.connected_categories = catUris.map(u => {
        const score = data.riskScores.get(u);
        return { name: data.nodes.get(u)?.label || u, score: score != null ? (score * 100).toFixed(0) : "?", count: 1 };
      });
      const actUris = data.eventActors.get(node.uri) || [];
      terms.connected_actors = actUris.map(u => ({ name: data.nodes.get(u)?.label || u, count: 1 }));
      const assUris = data.eventAssets.get(node.uri) || [];
      terms.connected_assets = assUris.map(u => {
        const n = data.nodes.get(u);
        return { name: n?.label || u, type: n?.kind || "Asset", count: 1 };
      });
    } else if (pivotConnections) {
      terms.connected_actors = [...pivotConnections.connActors.entries()].map(([u, c]) => ({
        name: data.nodes.get(u)?.label || u, count: c,
      }));
      terms.connected_assets = [...pivotConnections.connAssets.entries()].map(([u, c]) => {
        const n = data.nodes.get(u);
        return { name: n?.label || u, type: n?.kind || "Asset", count: c };
      });
      terms.connected_categories = [...pivotConnections.connCategories.entries()].map(([u, c]) => {
        const score = data.riskScores.get(u);
        return { name: data.nodes.get(u)?.label || u, score: score != null ? (score * 100).toFixed(0) : "?", count: c };
      });
      if (node.kind === "RiskCategory") {
        terms.risk_score = ((data.riskScores.get(node.uri) || 0) * 100).toFixed(0);
      }
    }

    const connEvents = pivotConnections
      ? pivotedEvents.slice(0, 20)
      : RISK_EVENT_KINDS.has(node.kind) ? [node] : [];
    terms.risk_events = connEvents.map(e => ({
      label: e.label,
      type: e.kind,
      severity: data.severities.get(e.uri) || "",
      timestamp: data.timestamps.get(e.uri) || data.eventDates.get(e.uri) || "",
    }));

    const api = socket.flow(flowId);
    api.promptStreaming(
      "threat-analyst",
      terms,
      (chunk: string, complete: boolean) => {
        aiBufferRef.current += chunk;
        setAiStreamText(aiBufferRef.current);

        if (complete) {
          setAiStreaming(false);
          try {
            const cleaned = aiBufferRef.current.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
            const parsed = JSON.parse(cleaned);
            setAiAnalysis(parsed.analysis || aiBufferRef.current);
            setAiExploreNext(parsed.explore_next || []);
          } catch {
            setAiAnalysis(aiBufferRef.current);
          }
        }
      },
      (err: string) => {
        setAiStreaming(false);
        setAiError(err);
      },
    );
  }, [selectedEventUri, currentPivot, data.nodes, data.descriptions, data.severities,
      data.riskScores, data.eventRisks, data.eventActors, data.eventAssets,
      data.timestamps, data.eventDates, pivotTrail, pivotConnections, pivotedEvents,
      socket, flowId]);

  /* ── investigation AI ────────────────────────────────────────────── */

  const buildInvestigationTerms = useCallback(() => {
    const allActorUris = new Set<string>();
    const allAssetUris = new Set<string>();
    const allCatUris = new Set<string>();

    const findingTerms = findings.map(f => {
      f.linkedActors.forEach(u => allActorUris.add(u));
      f.linkedAssets.forEach(u => allAssetUris.add(u));
      f.linkedCategories.forEach(u => allCatUris.add(u));
      return {
        text: f.text,
        timestamp: f.timestamp,
        actors: f.linkedActors.map(u => data.nodes.get(u)?.label || u).join(", "),
        assets: f.linkedAssets.map(u => data.nodes.get(u)?.label || u).join(", "),
        categories: f.linkedCategories.map(u => data.nodes.get(u)?.label || u).join(", "),
        pivot_path: f.pivotTrail.map(s => `${s.kind}: ${s.label}`).join(" > "),
      };
    });

    return {
      findings: findingTerms,
      all_actors: [...allActorUris].map(u => data.nodes.get(u)?.label || u).join(", "),
      all_assets: [...allAssetUris].map(u => data.nodes.get(u)?.label || u).join(", "),
      all_categories: [...allCatUris].map(u => data.nodes.get(u)?.label || u).join(", "),
    };
  }, [findings, data.nodes]);

  const generateDoc = useCallback((mode: "document" | "response-plan") => {
    if (findings.length === 0) return;

    setDocMode(mode);
    setDocResult(null);
    setDocStreaming(true);
    setDocStreamText("");
    setDocError(null);
    docBufferRef.current = "";

    const templateId = mode === "document" ? "threat-document" : "threat-response-plan";
    const terms = buildInvestigationTerms();
    const api = socket.flow(flowId);

    api.promptStreaming(
      templateId,
      terms,
      (chunk: string, complete: boolean) => {
        docBufferRef.current += chunk;
        setDocStreamText(docBufferRef.current);

        if (complete) {
          setDocStreaming(false);
          try {
            const cleaned = docBufferRef.current.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
            setDocResult(JSON.parse(cleaned));
          } catch {
            setDocResult({ raw: docBufferRef.current });
          }
        }
      },
      (err: string) => {
        setDocStreaming(false);
        setDocError(err);
      },
    );
  }, [findings, buildInvestigationTerms, socket, flowId]);

  /* ── helpers ────────────────────────────────────────────────────── */

  const nodeLabel = useCallback((uri: string): string => {
    const n = data.nodes.get(uri);
    return n ? n.label : uri.split("/").pop() || uri;
  }, [data.nodes]);

  /* ── loading / error ────────────────────────────────────────────── */

  if (data.isLoading) {
    ensureSpinnerStyles();
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "var(--page-height)", gap: 16,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: `2.5px solid ${theme.palette.rose}15`,
          borderTopColor: theme.palette.rose,
          animation: "ocsf-spin 0.8s linear infinite",
        }} />
        <div style={{
          fontSize: sz(12), color: theme.text.subtle,
          animation: "ocsf-pulse 1.5s ease-in-out infinite",
        }}>
          Loading threat intelligence data...
        </div>
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

  const selectedEvent = selectedEventUri ? data.nodes.get(selectedEventUri) : null;

  /* ── render: breadcrumb trail ───────────────────────────────────── */

  function renderBreadcrumb() {
    if (pivotTrail.length === 0 && !showFindings) return null;

    return (
      <div style={{
        padding: "6px 16px",
        borderBottom: `1px solid ${theme.border.subtle}`,
        display: "flex", alignItems: "center", gap: 4,
        fontSize: sz(11), fontFamily: theme.font.mono,
      }}>
        <span
          onClick={() => { clearPivot(); setShowFindings(false); }}
          style={{ color: theme.palette.cyan, cursor: "pointer", opacity: 0.7 }}
          onMouseEnter={e => { (e.target as HTMLElement).style.opacity = "1"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "0.7"; }}
        >
          Events
        </span>
        {pivotTrail.map((step, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: theme.text.faint }}>{"\u203A"}</span>
            <span
              onClick={() => pivotTo(i)}
              style={{
                color: i === pivotTrail.length - 1 ? theme.text.primary : KIND_COLORS[step.kind] || theme.text.secondary,
                cursor: i === pivotTrail.length - 1 ? "default" : "pointer",
                fontWeight: i === pivotTrail.length - 1 ? 600 : 400,
              }}
              onMouseEnter={e => { if (i < pivotTrail.length - 1) (e.target as HTMLElement).style.opacity = "0.7"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "1"; }}
            >
              {KIND_ICONS[step.kind] || "\u25CF"} {step.label}
            </span>
          </span>
        ))}
        {showFindings && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: theme.text.faint }}>{"\u203A"}</span>
            <span style={{ color: theme.palette.purple, fontWeight: 600 }}>Investigation</span>
          </span>
        )}
      </div>
    );
  }

  /* ── render: sort controls ──────────────────────────────────────── */

  function renderSortBar() {
    const sortOptions: { key: SortKey; label: string }[] = [
      { key: "time", label: "Time" },
      { key: "severity", label: "Severity" },
      { key: "category", label: "Category" },
      { key: "actor", label: "Actor" },
      { key: "asset", label: "Asset" },
    ];

    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 2,
        padding: "6px 12px",
        borderBottom: `1px solid ${theme.border.subtle}`,
      }}>
        <span style={{ fontSize: sz(8), color: theme.text.faint, fontFamily: theme.font.mono, marginRight: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Sort
        </span>
        {sortOptions.map(opt => (
          <span
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            style={{
              fontSize: sz(9), padding: "2px 6px", borderRadius: 3, cursor: "pointer",
              fontFamily: theme.font.mono,
              background: sortBy === opt.key ? `${theme.palette.cyan}22` : "transparent",
              color: sortBy === opt.key ? theme.palette.cyan : theme.text.faint,
              border: sortBy === opt.key ? `1px solid ${theme.palette.cyan}33` : "1px solid transparent",
              transition: "all 0.12s",
            }}
          >
            {opt.label}
          </span>
        ))}
      </div>
    );
  }

  /* ── render: event list item ────────────────────────────────────── */

  function renderEventRow(event: OcsfNode) {
    const sev = data.severities.get(event.uri) || "";
    const ts = getTimestamp(event.uri);
    const actorUris = data.eventActors.get(event.uri) || [];
    const categoryUris = data.eventRisks.get(event.uri) || [];
    const isSelected = selectedEventUri === event.uri;

    return (
      <div
        key={event.uri}
        onClick={() => selectEvent(event.uri)}
        style={{
          padding: "8px 12px", cursor: "pointer",
          background: isSelected ? `${theme.palette.cyan}10` : "transparent",
          borderLeft: isSelected ? `2px solid ${theme.palette.cyan}` : "2px solid transparent",
          borderBottom: `1px solid ${theme.border.subtle}`,
          transition: "all 0.12s",
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{
            fontSize: sz(8), fontFamily: theme.font.mono, padding: "1px 5px",
            borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.04em",
            background: `${severityColor(sev, theme)}18`, color: severityColor(sev, theme),
            border: `1px solid ${severityColor(sev, theme)}33`,
          }}>
            {sev || "?"}
          </span>
          {categoryUris.slice(0, 1).map(u => (
            <span key={u} style={{
              fontSize: sz(9), color: theme.palette.rose, fontFamily: theme.font.mono,
            }}>
              {nodeLabel(u)}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.faint }}>
            {ts ? formatDateTime(ts) : ""}
          </span>
        </div>
        <div style={{
          fontSize: sz(11), color: theme.text.secondary, lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>
          {event.label}
        </div>
        {actorUris.length > 0 && (
          <div style={{ marginTop: 3, fontSize: sz(9), color: theme.palette.amber, fontFamily: theme.font.mono }}>
            {actorUris.map(u => nodeLabel(u)).join(", ")}
          </div>
        )}
      </div>
    );
  }

  /* ── render: event detail panel ─────────────────────────────────── */

  function renderEventDetail(event: OcsfNode) {
    const sev = data.severities.get(event.uri) || "";
    const ts = getTimestamp(event.uri);
    const desc = data.descriptions.get(event.uri);
    const actorUris = data.eventActors.get(event.uri) || [];
    const assetUris = data.eventAssets.get(event.uri) || [];
    const categoryUris = data.eventRisks.get(event.uri) || [];

    return (
      <div>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: sz(8), fontFamily: theme.font.mono, padding: "2px 8px",
              borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em",
              background: `${severityColor(sev, theme)}18`, color: severityColor(sev, theme),
              border: `1px solid ${severityColor(sev, theme)}33`,
            }}>
              {sev}
            </span>
            {ts && (
              <span style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.faint }}>
                {formatDate(ts)}
              </span>
            )}
          </div>
          <div style={{ fontSize: sz(16), fontWeight: 600, color: theme.text.primary, lineHeight: 1.4, marginBottom: 8 }}>
            {event.label}
          </div>
          {desc && (
            <div style={{
              fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6,
              padding: "12px 14px", borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${theme.border.subtle}`,
            }}>
              {desc}
            </div>
          )}
        </div>

        {/* Pivot targets */}
        <Section title="Actor \u2014 click to pivot" color={theme.palette.amber}>
          {actorUris.length === 0
            ? <span style={{ fontSize: sz(11), color: theme.text.faint }}>None</span>
            : actorUris.map(u => (
                <PivotLink key={u} label={nodeLabel(u)} color={theme.palette.amber} onClick={() => pivot(u)} />
              ))}
        </Section>

        <Section title="Impacted Assets \u2014 click to pivot" color={theme.palette.blue}>
          {assetUris.length === 0
            ? <span style={{ fontSize: sz(11), color: theme.text.faint }}>None</span>
            : assetUris.map(u => (
                <PivotLink key={u} label={nodeLabel(u)} color={theme.palette.blue} onClick={() => pivot(u)} />
              ))}
        </Section>

        <Section title="Risk Category \u2014 click to pivot" color={theme.palette.rose}>
          {categoryUris.length === 0
            ? <span style={{ fontSize: sz(11), color: theme.text.faint }}>None</span>
            : categoryUris.map(u => {
                const score = data.riskScores.get(u);
                const scoreStr = score != null ? ` (${(score * 100).toFixed(0)}%)` : "";
                return (
                  <PivotLink key={u} label={`${nodeLabel(u)}${scoreStr}`} color={theme.palette.rose} onClick={() => pivot(u)} />
                );
              })}
        </Section>

        {/* Drill-down action */}
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button
            onClick={() => drillFromEvent(event.uri)}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: sz(11),
              fontFamily: theme.font.mono,
              background: `${theme.palette.cyan}15`, border: `1px solid ${theme.palette.cyan}33`,
              color: theme.palette.cyan, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${theme.palette.cyan}25`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${theme.palette.cyan}15`; }}
          >
            Drill Down to Raw Events
          </button>
        </div>
      </div>
    );
  }

  /* ── render: pivoted entity detail ──────────────────────────────── */

  function renderPivotDetail() {
    if (!currentPivot || !pivotConnections) return null;
    const node = data.nodes.get(currentPivot.uri);
    if (!node) return null;

    const color = KIND_COLORS[node.kind] || theme.text.muted;
    const desc = data.descriptions.get(node.uri);

    return (
      <div>
        {/* Entity header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: sz(20) }}>{KIND_ICONS[node.kind] || "\u25CF"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>{node.label}</div>
              <div style={{
                fontSize: sz(10), color, fontFamily: theme.font.mono,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {node.kind.replace(/([A-Z])/g, " $1").trim()} \u2022 {pivotConnections.eventCount} risk events
              </div>
            </div>
            {node.kind === "RiskCategory" && (() => {
              const score = data.riskScores.get(node.uri);
              if (score == null) return null;
              return (
                <div style={{
                  padding: "6px 14px", borderRadius: 6,
                  background: `${riskColor(score, theme)}22`, border: `1px solid ${riskColor(score, theme)}44`,
                  color: riskColor(score, theme), fontSize: sz(16), fontWeight: 700,
                  fontFamily: theme.font.mono,
                }}>
                  {(score * 100).toFixed(0)}%
                </div>
              );
            })()}
          </div>
          {desc && (
            <div style={{
              fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6,
              padding: "12px 14px", borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${theme.border.subtle}`,
            }}>
              {desc}
            </div>
          )}
        </div>

        {/* Connected entities (pivot targets) */}
        {node.kind !== "Actor" && pivotConnections.connActors.size > 0 && (
          <Section title="Connected Actors" color={theme.palette.amber}>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...pivotConnections.connActors.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => (
                  <PivotLink key={uri} label={`${nodeLabel(uri)} (${count})`} color={theme.palette.amber} onClick={() => pivot(uri)} />
                ))}
            </div>
          </Section>
        )}

        {!ASSET_KINDS.has(node.kind) && pivotConnections.connAssets.size > 0 && (
          <Section title="Connected Assets" color={theme.palette.blue}>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...pivotConnections.connAssets.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => (
                  <PivotLink key={uri} label={`${nodeLabel(uri)} (${count})`} color={theme.palette.blue} onClick={() => pivot(uri)} />
                ))}
            </div>
          </Section>
        )}

        {node.kind !== "RiskCategory" && pivotConnections.connCategories.size > 0 && (
          <Section title="Risk Categories" color={theme.palette.rose}>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {[...pivotConnections.connCategories.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([uri, count]) => {
                  const score = data.riskScores.get(uri);
                  const scoreStr = score != null ? ` ${(score * 100).toFixed(0)}%` : "";
                  return (
                    <PivotLink key={uri} label={`${nodeLabel(uri)}${scoreStr} (${count})`} color={theme.palette.rose} onClick={() => pivot(uri)} />
                  );
                })}
            </div>
          </Section>
        )}

        {/* Drill-down — only for actors and assets, not categories */}
        {node.kind !== "RiskCategory" && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => drillFromPivot(node.uri)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: sz(11),
                fontFamily: theme.font.mono,
                background: `${theme.palette.cyan}15`, border: `1px solid ${theme.palette.cyan}33`,
                color: theme.palette.cyan, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${theme.palette.cyan}25`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${theme.palette.cyan}15`; }}
            >
              Drill Down to Raw Events
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── render: landing overview ────────────────────────────────────── */

  function renderOverview() {
    const sevCounts = new Map<string, number>();
    for (const e of riskEvents) {
      const s = data.severities.get(e.uri) || "Unknown";
      sevCounts.set(s, (sevCounts.get(s) || 0) + 1);
    }
    const sortedSev = [...sevCounts.entries()].sort((a, b) =>
      (SEVERITY_ORDER[a[0]] ?? 99) - (SEVERITY_ORDER[b[0]] ?? 99));

    const actorCounts = new Map<string, number>();
    for (const e of riskEvents) {
      for (const a of (data.eventActors.get(e.uri) || [])) {
        actorCounts.set(a, (actorCounts.get(a) || 0) + 1);
      }
    }
    const sortedActors = [...actorCounts.entries()].sort((a, b) => b[1] - a[1]);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: sz(24), opacity: 0.6 }}>{"\u26A0"}</span>
          <div>
            <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>Threat Overview</div>
            <div style={{
              fontSize: sz(10), color: theme.text.faint, fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {riskEvents.length} risk events \u2022 {actors.length} actors \u2022 {assets.length} assets \u2022 {categories.length} categories
            </div>
          </div>
        </div>

        <Section title="Severity Breakdown" color={theme.palette.rose}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sortedSev.map(([sev, count]) => (
              <div key={sev} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                <span style={{
                  fontSize: sz(8), fontFamily: theme.font.mono, padding: "1px 5px",
                  borderRadius: 3, textTransform: "uppercase",
                  background: `${severityColor(sev, theme)}18`, color: severityColor(sev, theme),
                  minWidth: 60, textAlign: "center",
                }}>
                  {sev}
                </span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <div style={{
                    width: `${(count / riskEvents.length) * 100}%`,
                    height: "100%", borderRadius: 3, background: severityColor(sev, theme), opacity: 0.6,
                  }} />
                </div>
                <span style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: severityColor(sev, theme), minWidth: 20, textAlign: "right" }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Risk Categories" color={theme.palette.rose}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {categories
              .sort((a, b) => (data.riskScores.get(b.uri) || 0) - (data.riskScores.get(a.uri) || 0))
              .map(cat => {
                const score = data.riskScores.get(cat.uri) || 0;
                const color = riskColor(score, theme);
                const eventCount = data.riskEvents.get(cat.uri)?.length || 0;
                return (
                  <div
                    key={cat.uri}
                    onClick={() => pivot(cat.uri)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "4px 6px", borderRadius: 4, cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: sz(11), color: theme.text.secondary, flex: 1 }}>{cat.label}</span>
                    <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.faint }}>{eventCount}</span>
                    <div style={{ width: 32, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ width: `${score * 100}%`, height: "100%", borderRadius: 2, background: color, opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color, minWidth: 22, textAlign: "right" }}>
                      {(score * 100).toFixed(0)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Section>

        <Section title="Actors by Event Count" color={theme.palette.amber}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {sortedActors.map(([uri, count]) => {
              const maxCount = sortedActors[0][1];
              return (
                <div
                  key={uri}
                  onClick={() => pivot(uri)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "3px 6px", borderRadius: 4, cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: sz(11), color: theme.text.secondary, minWidth: 120 }}>{nodeLabel(uri)}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{ width: `${(count / maxCount) * 100}%`, height: "100%", borderRadius: 3, background: theme.palette.amber, opacity: 0.5 }} />
                  </div>
                  <span style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.palette.amber, minWidth: 20, textAlign: "right" }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    );
  }

  /* ── render: raw events panel ───────────────────────────────────── */

  function renderRawPanel() {
    if (!rawPanelOpen) return null;

    return (
      <div style={{
        height: 280, borderTop: `1px solid ${theme.border.default}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "6px 12px", display: "flex", alignItems: "center", gap: 8,
          borderBottom: `1px solid ${theme.border.subtle}`,
          background: "rgba(255,255,255,0.01)",
        }}>
          <span style={{ fontSize: sz(8), fontFamily: theme.font.mono, color: theme.palette.cyan, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Raw OCSF Events
          </span>
          <span style={{ flex: 1 }} />
          {rawResults && (
            <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.faint }}>
              {rawResults.length} rows
            </span>
          )}
          <span
            onClick={() => setRawPanelOpen(false)}
            style={{ fontSize: sz(12), color: theme.text.faint, cursor: "pointer", padding: "0 4px" }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = theme.text.primary; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = theme.text.faint; }}
          >
            {"\u2715"}
          </span>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Query editor */}
          <div style={{ width: 280, borderRight: `1px solid ${theme.border.subtle}`, display: "flex", flexDirection: "column" }}>
            <textarea
              value={rawQuery}
              onChange={e => setRawQuery(e.target.value)}
              style={{
                flex: 1, padding: 8, fontSize: sz(10), fontFamily: theme.font.mono,
                background: "transparent", border: "none", color: theme.text.secondary,
                resize: "none", outline: "none",
              }}
            />
            <div style={{ padding: "4px 8px", borderTop: `1px solid ${theme.border.subtle}` }}>
              <button
                onClick={() => executeDrill(rawQuery)}
                style={{
                  padding: "4px 12px", borderRadius: 4, fontSize: sz(10),
                  fontFamily: theme.font.mono,
                  background: `${theme.palette.cyan}20`, border: `1px solid ${theme.palette.cyan}33`,
                  color: theme.palette.cyan, cursor: "pointer",
                }}
              >
                Execute
              </button>
            </div>
          </div>

          {/* Results table */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {rawLoading && (
              <div style={{ padding: 20, textAlign: "center", fontSize: sz(11), color: theme.text.faint }}>Loading...</div>
            )}
            {rawError && (
              <div style={{ padding: 12, fontSize: sz(11), color: theme.palette.rose }}>{rawError}</div>
            )}
            {rawResults && rawResults.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", fontSize: sz(11), color: theme.text.faint }}>No results</div>
            )}
            {rawResults && rawResults.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sz(10), fontFamily: theme.font.mono }}>
                <thead>
                  <tr>
                    {rawColumns.map(col => (
                      <th key={col} style={{
                        padding: "4px 8px", textAlign: "left", color: theme.text.faint,
                        borderBottom: `1px solid ${theme.border.default}`,
                        background: "rgba(255,255,255,0.02)",
                        whiteSpace: "nowrap", fontSize: sz(9),
                        position: "sticky", top: 0,
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawResults.slice(0, 200).map((row, i) => (
                    <tr key={i}>
                      {rawColumns.map(col => (
                        <td key={col} style={{
                          padding: "3px 8px", color: theme.text.secondary,
                          borderBottom: `1px solid ${theme.border.subtle}`,
                          whiteSpace: "nowrap", maxWidth: 200,
                          overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {row[col] == null ? "\u2014" : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── render: AI analysis ─────────────────────────────────────────── */

  function renderAnalysis() {
    return (
      <div style={{ marginTop: 20 }}>
        {/* Analyze button */}
        {!aiStreaming && !aiAnalysis && (
          <button
            onClick={analyzeContext}
            style={{
              padding: "6px 14px", borderRadius: 6, fontSize: sz(11),
              fontFamily: theme.font.mono,
              background: `${theme.palette.emerald}15`, border: `1px solid ${theme.palette.emerald}33`,
              color: theme.palette.emerald, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${theme.palette.emerald}25`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${theme.palette.emerald}15`; }}
          >
            Analyze This
          </button>
        )}

        {/* Streaming indicator */}
        {aiStreaming && (
          <div style={{
            padding: "12px 14px", borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${theme.palette.emerald}22`,
          }}>
            <div style={{
              fontSize: sz(8), color: theme.palette.emerald, fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Analyzing...
            </div>
            <div style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {aiStreamText}
            </div>
          </div>
        )}

        {/* Error */}
        {aiError && (
          <div style={{ fontSize: sz(11), color: theme.palette.rose, padding: "8px 0" }}>
            Analysis failed: {aiError}
          </div>
        )}

        {/* Completed analysis */}
        {aiAnalysis && !aiStreaming && (
          <div style={{
            padding: "12px 14px", borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${theme.palette.emerald}22`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: sz(8), color: theme.palette.emerald, fontFamily: theme.font.mono,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Analysis
              </span>
              <span
                onClick={() => { setAiAnalysis(null); setAiExploreNext([]); setAiStreamText(""); }}
                style={{ fontSize: sz(10), color: theme.text.faint, cursor: "pointer" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = theme.text.primary; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = theme.text.faint; }}
              >
                {"\u2715"}
              </span>
            </div>
            <div style={{ fontSize: sz(12), color: theme.text.primary, lineHeight: 1.6, marginBottom: 12 }}>
              {aiAnalysis}
            </div>

            {aiExploreNext.length > 0 && (
              <div>
                <div style={{
                  fontSize: sz(8), color: theme.palette.emerald, fontFamily: theme.font.mono,
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
                }}>
                  Explore Next
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {aiExploreNext.map((suggestion, i) => (
                    <div key={i} style={{
                      fontSize: sz(11), color: theme.text.secondary, lineHeight: 1.4,
                      padding: "6px 10px", borderRadius: 4,
                      background: `${theme.palette.emerald}08`,
                      border: `1px solid ${theme.palette.emerald}15`,
                    }}>
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Re-analyze button */}
            <div style={{ marginTop: 10 }}>
              <button
                onClick={analyzeContext}
                style={{
                  padding: "4px 10px", borderRadius: 4, fontSize: sz(9),
                  fontFamily: theme.font.mono,
                  background: "transparent", border: `1px solid ${theme.border.default}`,
                  color: theme.text.faint, cursor: "pointer",
                }}
              >
                Re-analyze
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── render: findings input ─────────────────────────────────────── */

  function renderFindingInput() {
    return (
      <div style={{
        marginTop: 24, padding: "12px 14px", borderRadius: 6,
        background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border.subtle}`,
      }}>
        <div style={{
          fontSize: sz(8), color: theme.palette.purple, fontFamily: theme.font.mono,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
        }}>
          Record Finding
        </div>
        <textarea
          value={findingDraft}
          onChange={e => setFindingDraft(e.target.value)}
          placeholder="What did you observe? What's the significance?"
          style={{
            width: "100%", minHeight: 60, padding: 8, fontSize: sz(11),
            fontFamily: theme.font.sans, lineHeight: 1.5,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border.default}`,
            borderRadius: 4, color: theme.text.primary, resize: "vertical", outline: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: sz(9), color: theme.text.faint, fontFamily: theme.font.mono }}>
            {findings.length > 0 ? `Follows finding #${findings.length}` : "First finding in chain"}
          </span>
          <button
            onClick={recordFinding}
            disabled={!findingDraft.trim()}
            style={{
              padding: "4px 12px", borderRadius: 4, fontSize: sz(10),
              fontFamily: theme.font.mono,
              background: findingDraft.trim() ? `${theme.palette.purple}20` : "rgba(255,255,255,0.03)",
              border: `1px solid ${findingDraft.trim() ? `${theme.palette.purple}33` : theme.border.default}`,
              color: findingDraft.trim() ? theme.palette.purple : theme.text.disabled,
              cursor: findingDraft.trim() ? "pointer" : "default",
            }}
          >
            Record
          </button>
        </div>
      </div>
    );
  }

  /* ── render: investigation view ─────────────────────────────────── */

  function renderInvestigation() {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: sz(24), opacity: 0.6 }}>{"\uD83D\uDD0D"}</span>
          <div>
            <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>Investigation</div>
            <div style={{
              fontSize: sz(10), color: theme.text.faint, fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {findings.length} finding{findings.length !== 1 ? "s" : ""} recorded
            </div>
          </div>
        </div>

        {findings.length === 0 ? (
          <div style={{
            padding: 24, textAlign: "center",
            fontSize: sz(12), color: theme.text.faint, lineHeight: 1.6,
          }}>
            No findings recorded yet. Browse risk events, pivot through connections,
            and record findings as you investigate.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {findings.map((f, i) => (
              <div key={f.id}>
                {/* Chain connector */}
                {i > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 0 4px 18px",
                  }}>
                    <div style={{ width: 1, height: 16, background: `${theme.palette.purple}33` }} />
                    <span style={{ fontSize: sz(8), fontFamily: theme.font.mono, color: theme.text.faint }}>
                      follows from
                    </span>
                  </div>
                )}

                {/* Finding card */}
                <div style={{
                  padding: "12px 14px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${theme.palette.purple}22`,
                  borderLeft: `3px solid ${theme.palette.purple}66`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{
                      fontSize: sz(9), fontFamily: theme.font.mono,
                      color: theme.palette.purple, fontWeight: 600,
                    }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.faint }}>
                      {formatDateTime(f.timestamp)}
                    </span>
                  </div>
                  <div style={{ fontSize: sz(12), color: theme.text.primary, lineHeight: 1.5, marginBottom: 8 }}>
                    {f.text}
                  </div>

                  {/* Linked entities */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {f.linkedActors.map(u => (
                      <span key={u} style={{
                        fontSize: sz(9), padding: "1px 6px", borderRadius: 3,
                        background: `${theme.palette.amber}11`, color: theme.palette.amber,
                      }}>
                        {nodeLabel(u)}
                      </span>
                    ))}
                    {f.linkedAssets.map(u => (
                      <span key={u} style={{
                        fontSize: sz(9), padding: "1px 6px", borderRadius: 3,
                        background: `${theme.palette.blue}11`, color: theme.palette.blue,
                      }}>
                        {nodeLabel(u)}
                      </span>
                    ))}
                    {f.linkedCategories.map(u => (
                      <span key={u} style={{
                        fontSize: sz(9), padding: "1px 6px", borderRadius: 3,
                        background: `${theme.palette.rose}11`, color: theme.palette.rose,
                      }}>
                        {nodeLabel(u)}
                      </span>
                    ))}
                  </div>

                  {/* Pivot trail at time of finding */}
                  {f.pivotTrail.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.faint }}>
                      path: {f.pivotTrail.map(s => s.label).join(" \u203A ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {findings.length > 0 && !docStreaming && (
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              onClick={() => generateDoc("document")}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: sz(11),
                fontFamily: theme.font.mono,
                background: `${theme.palette.purple}15`, border: `1px solid ${theme.palette.purple}33`,
                color: theme.palette.purple, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${theme.palette.purple}25`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${theme.palette.purple}15`; }}
            >
              Document Investigation
            </button>
            <button
              onClick={() => generateDoc("response-plan")}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: sz(11),
                fontFamily: theme.font.mono,
                background: `${theme.palette.emerald}15`, border: `1px solid ${theme.palette.emerald}33`,
                color: theme.palette.emerald, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${theme.palette.emerald}25`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${theme.palette.emerald}15`; }}
            >
              Write Incident Response Plan
            </button>
          </div>
        )}

        {/* Streaming indicator */}
        {docStreaming && (
          <div style={{
            marginTop: 20, padding: "12px 14px", borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${docMode === "document" ? theme.palette.purple : theme.palette.emerald}22`,
          }}>
            <div style={{
              fontSize: sz(8), color: docMode === "document" ? theme.palette.purple : theme.palette.emerald,
              fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              {docMode === "document" ? "Documenting investigation..." : "Writing response plan..."}
            </div>
            <div style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {docStreamText}
            </div>
          </div>
        )}

        {/* Error */}
        {docError && (
          <div style={{ marginTop: 12, fontSize: sz(11), color: theme.palette.rose, padding: "8px 0" }}>
            Generation failed: {docError}
          </div>
        )}

        {/* Generated document */}
        {docResult && !docStreaming && docMode === "document" && (
          <div style={{
            marginTop: 20, padding: "16px 18px", borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${theme.palette.purple}22`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: sz(8), color: theme.palette.purple, fontFamily: theme.font.mono,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Investigation Report
              </span>
              <span
                onClick={() => { setDocResult(null); setDocMode(null); }}
                style={{ fontSize: sz(10), color: theme.text.faint, cursor: "pointer" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = theme.text.primary; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = theme.text.faint; }}
              >
                {"\u2715"}
              </span>
            </div>

            {docResult.title && (
              <div style={{ fontSize: sz(16), fontWeight: 600, color: theme.text.primary, marginBottom: 8 }}>
                {String(docResult.title)}
              </div>
            )}
            {docResult.summary && (
              <div style={{
                fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6,
                padding: "10px 12px", borderRadius: 4,
                background: "rgba(255,255,255,0.02)", marginBottom: 12,
              }}>
                {String(docResult.summary)}
              </div>
            )}

            {Array.isArray(docResult.timeline) && docResult.timeline.length > 0 && (
              <Section title="Timeline" color={theme.palette.cyan}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(docResult.timeline as string[]).map((item, i) => (
                    <div key={i} style={{
                      fontSize: sz(11), color: theme.text.secondary, lineHeight: 1.4,
                      paddingLeft: 12, borderLeft: `2px solid ${theme.palette.cyan}33`,
                      padding: "4px 0 4px 12px",
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {Array.isArray(docResult.actors_involved) && docResult.actors_involved.length > 0 && (
              <Section title="Actors Involved" color={theme.palette.amber}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(docResult.actors_involved as { name: string; role: string }[]).map((actor, i) => (
                    <div key={i} style={{ fontSize: sz(11), color: theme.text.secondary }}>
                      <span style={{ color: theme.palette.amber, fontWeight: 600 }}>{actor.name}</span>
                      {" \u2014 "}{actor.role}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {Array.isArray(docResult.assets_affected) && docResult.assets_affected.length > 0 && (
              <Section title="Assets Affected" color={theme.palette.blue}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(docResult.assets_affected as string[]).map((asset, i) => (
                    <span key={i} style={{
                      fontSize: sz(10), padding: "2px 8px", borderRadius: 3,
                      background: `${theme.palette.blue}11`, color: theme.palette.blue,
                    }}>
                      {asset}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {docResult.conclusion && (
              <Section title="Conclusion" color={theme.palette.emerald}>
                <div style={{ fontSize: sz(12), color: theme.text.primary, lineHeight: 1.6 }}>
                  {String(docResult.conclusion)}
                </div>
              </Section>
            )}

            {docResult.raw && (
              <div style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {String(docResult.raw)}
              </div>
            )}
          </div>
        )}

        {/* Generated response plan */}
        {docResult && !docStreaming && docMode === "response-plan" && (
          <div style={{
            marginTop: 20, padding: "16px 18px", borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${theme.palette.emerald}22`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: sz(8), color: theme.palette.emerald, fontFamily: theme.font.mono,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Incident Response Plan
              </span>
              <span
                onClick={() => { setDocResult(null); setDocMode(null); }}
                style={{ fontSize: sz(10), color: theme.text.faint, cursor: "pointer" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = theme.text.primary; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = theme.text.faint; }}
              >
                {"\u2715"}
              </span>
            </div>

            {docResult.severity && (
              <div style={{
                display: "inline-block", fontSize: sz(9), fontFamily: theme.font.mono,
                padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
                background: `${severityColor(String(docResult.severity), theme)}18`,
                color: severityColor(String(docResult.severity), theme),
                border: `1px solid ${severityColor(String(docResult.severity), theme)}33`,
                marginBottom: 12,
              }}>
                Severity: {String(docResult.severity)}
              </div>
            )}

            {[
              { key: "immediate_actions", title: "Immediate Actions", color: theme.palette.rose },
              { key: "containment", title: "Containment", color: theme.palette.orange },
              { key: "evidence_preservation", title: "Evidence Preservation", color: theme.palette.amber },
              { key: "remediation", title: "Remediation", color: theme.palette.blue },
              { key: "monitoring", title: "Ongoing Monitoring", color: theme.palette.emerald },
            ].map(({ key, title, color }) => {
              const items = docResult[key];
              if (!Array.isArray(items) || items.length === 0) return null;
              return (
                <Section key={key} title={title} color={color}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(items as string[]).map((item, i) => (
                      <div key={i} style={{
                        fontSize: sz(11), color: theme.text.secondary, lineHeight: 1.4,
                        padding: "4px 10px", borderRadius: 4,
                        background: `${color}08`,
                        borderLeft: `2px solid ${color}33`,
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </Section>
              );
            })}

            {docResult.raw && (
              <div style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {String(docResult.raw)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── render: right panel dispatch ───────────────────────────────── */

  function renderRightPanel() {
    if (showFindings) return renderInvestigation();
    if (selectedEvent) return (
      <div>
        {renderEventDetail(selectedEvent)}
        {renderAnalysis()}
        {renderFindingInput()}
      </div>
    );
    if (currentPivot && pivotConnections) return (
      <div>
        {renderPivotDetail()}
        {renderAnalysis()}
        {renderFindingInput()}
      </div>
    );
    return renderOverview();
  }

  /* ── main layout ────────────────────────────────────────────────── */

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden",
      borderTop: `1px solid ${theme.border.default}`,
    }}>
      {/* Top bar: breadcrumb + stats */}
      <div style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${theme.border.subtle}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          {renderBreadcrumb() || (
            <span style={{
              fontSize: sz(10), fontFamily: theme.font.mono,
              color: theme.text.faint, textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              Risk Event Browser
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {findings.length > 0 && (
            <button
              onClick={() => { setShowFindings(!showFindings); if (!showFindings) setSelectedEventUri(null); }}
              style={{
                padding: "4px 10px", borderRadius: 4, fontSize: sz(9),
                fontFamily: theme.font.mono,
                background: showFindings ? `${theme.palette.purple}20` : "transparent",
                border: `1px solid ${showFindings ? `${theme.palette.purple}33` : theme.border.default}`,
                color: showFindings ? theme.palette.purple : theme.text.faint,
                cursor: "pointer",
              }}
            >
              Investigation ({findings.length})
            </button>
          )}
          <div style={{
            display: "flex", gap: 10, fontSize: sz(10), color: theme.text.faint,
            fontFamily: theme.font.mono,
            paddingLeft: 8, borderLeft: `1px solid ${theme.border.subtle}`,
          }}>
            <span><span style={{ color: theme.palette.cyan }}>{riskEvents.length}</span> events</span>
            <span><span style={{ color: theme.palette.amber }}>{actors.length}</span> actors</span>
            <span><span style={{ color: theme.palette.blue }}>{assets.length}</span> assets</span>
          </div>
        </div>
      </div>

      {/* Body: left list + right detail */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: event list */}
        <div style={{
          width: 380, minWidth: 380, borderRight: `1px solid ${theme.border.default}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border.subtle}` }}>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search events, actors, descriptions..."
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: sz(12),
                background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border.default}`,
                color: theme.text.primary, outline: "none",
                fontFamily: theme.font.sans,
              }}
            />
          </div>

          {renderSortBar()}

          {/* Event count for current context */}
          <div style={{
            padding: "4px 12px", fontSize: sz(9), fontFamily: theme.font.mono,
            color: theme.text.faint, borderBottom: `1px solid ${theme.border.subtle}`,
          }}>
            {sortedFilteredEvents.length} event{sortedFilteredEvents.length !== 1 ? "s" : ""}
            {currentPivot ? ` connected to ${currentPivot.label}` : ""}
          </div>

          {/* Scrollable event list */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {sortedFilteredEvents.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", fontSize: sz(11), color: theme.text.faint }}>
                No matching events
              </div>
            ) : (
              sortedFilteredEvents.map(e => renderEventRow(e))
            )}
          </div>
        </div>

        {/* Right: detail / pivot / overview / investigation */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            {renderRightPanel()}
          </div>

          {/* Raw events panel (bottom) */}
          {renderRawPanel()}
        </div>
      </div>
    </div>
  );
}
