import { useState, useMemo, useCallback, useEffect } from "react";
import { useLawData } from "../../hooks/useLawData";
import type {
  LawNode, LawEntityDetail, LawEntityRelationships,
  OverviewData, InstitutionsOverviewData, RightsOverviewData,
  ComplianceOverviewData, StructureData,
} from "../../hooks/useLawData";
import { useTheme } from "../../theme/ThemeContext";
import type { Theme } from "../../theme/types";

export interface LawExplorerProps {}

type Mode = "overview" | "institutions" | "rights" | "compliance" | "structure";

const MODE_META: { key: Mode; en: string; lt: string; icon: string; paletteKey: keyof Theme["palette"] }[] = [
  { key: "overview", en: "Overview", lt: "Apzvalga", icon: "\u2696", paletteKey: "amber" },
  { key: "institutions", en: "Institutions", lt: "Institucijos", icon: "\u25C8", paletteKey: "blue" },
  { key: "rights", en: "Rights & Powers", lt: "Teises ir galios", icon: "\u25C9", paletteKey: "emerald" },
  { key: "compliance", en: "Compliance", lt: "Atitiktis", icon: "\u25CE", paletteKey: "rose" },
  { key: "structure", en: "Law Structure", lt: "Struktura", icon: "\u25B3", paletteKey: "purple" },
];

function kindColors(theme: Theme): Record<string, string> {
  return {
    Statute: theme.palette.amber,
    LegislativeDraft: theme.palette.cyan,
    Chapter: theme.palette.purple,
    Article: theme.palette.blue,
    Ministry: "#4A9EFF",
    JurisdictionAuthority: "#6B8AFF",
    RegulatedEntity: theme.palette.rose,
    CriticalInfrastructureOperator: theme.palette.rose,
    ElectronicCommunicationsProvider: theme.palette.rose,
    HostingServiceProvider: theme.palette.rose,
    IncidentTrigger: theme.palette.orange,
    ResilienceMandate: theme.palette.cyan,
    ContinuityProtocol: theme.palette.cyan,
    InformationPipeline: theme.palette.purple,
    CivicRight: theme.palette.emerald,
    ExecutiveLiability: "#FF4A6B",
    LegalConcept: "#9CA3AF",
  };
}

const LAW_KINDS = ["Statute", "LegislativeDraft"];
const ORG_KINDS = ["Ministry", "JurisdictionAuthority"];
const ENTITY_KINDS = ["RegulatedEntity", "CriticalInfrastructureOperator", "ElectronicCommunicationsProvider", "HostingServiceProvider"];
const TRIGGER_KINDS = ["IncidentTrigger"];
const MANDATE_KINDS = ["ResilienceMandate", "ContinuityProtocol"];

function formatDuration(d: string): string {
  if (!d) return d;
  const match = d.match(/PT(\d+)H/);
  if (match) return `${match[1]} hours`;
  const mMatch = d.match(/PT(\d+)M/);
  if (mMatch) return `${mMatch[1]} minutes`;
  return d;
}

function domainBadgeColor(domain: string, theme: Theme): string {
  if (domain === "Military") return theme.palette.rose;
  if (domain === "Civilian") return theme.palette.blue;
  if (domain === "Independent Regulatory") return theme.palette.emerald;
  return theme.text.muted;
}



const SPINNER_ID = "law-spinner-keyframes";
function ensureSpinnerStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SPINNER_ID)) return;
  const style = document.createElement("style");
  style.id = SPINNER_ID;
  style.textContent = `
    @keyframes law-spin { to { transform: rotate(360deg); } }
    @keyframes law-pulse { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
  `;
  document.head.appendChild(style);
}

function ModeLoading({ color, message }: { color: string; message: string }) {
  const { theme, sz } = useTheme();
  ensureSpinnerStyles();
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", gap: 16, padding: 40,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `2.5px solid ${color}15`,
        borderTopColor: color,
        animation: "law-spin 0.8s linear infinite",
      }} />
      <div style={{
        fontSize: sz(12), color: theme.text.subtle,
        animation: "law-pulse 1.5s ease-in-out infinite",
      }}>
        {message}
      </div>
    </div>
  );
}

export function LawExplorer(_props: LawExplorerProps) {
  const { theme, sz } = useTheme();

  const KIND_COLORS = useMemo(() => kindColors(theme), [theme]);

  const cardBase: React.CSSProperties = useMemo(() => ({
    padding: "12px 14px",
    borderRadius: 8,
    background: theme.surface.card,
    border: `1px solid ${theme.surface.cardHover}`,
    cursor: "pointer",
    transition: "all 0.15s ease",
  }), [theme]);

  const sectionTitle: React.CSSProperties = useMemo(() => ({
    fontSize: sz(10),
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: theme.text.subtle,
    marginBottom: 8,
    marginTop: 16,
  }), [theme, sz]);

  const loadingDot: React.CSSProperties = useMemo(() => ({
    fontSize: sz(11),
    color: theme.text.hint,
    fontStyle: "italic",
    padding: "8px 0",
  }), [theme, sz]);

  const [lang, setLang] = useState<"en" | "lt">("en");
  const [mode, setMode] = useState<Mode>("overview");
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const data = useLawData(lang);

  // Async state for detail panel
  const [detail, setDetail] = useState<LawEntityDetail | null>(null);
  const [rels, setRels] = useState<LawEntityRelationships | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Async state for mode views
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [instData, setInstData] = useState<InstitutionsOverviewData | null>(null);
  const [instLoading, setInstLoading] = useState(false);
  const [rightsData, setRightsData] = useState<RightsOverviewData | null>(null);
  const [rightsLoading, setRightsLoading] = useState(false);
  const [compData, setCompData] = useState<ComplianceOverviewData | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [structData, setStructData] = useState<StructureData | null>(null);
  const [structLoading, setStructLoading] = useState(false);

  // Node helpers
  const nodeLabel = useCallback((uri: string | undefined) => {
    if (!uri) return "";
    return data.nodes.get(uri)?.label || uri.split("#").pop() || uri;
  }, [data.nodes]);

  const nodesByKind = useCallback((...kinds: string[]) => {
    return [...data.nodes.values()]
      .filter(n => kinds.includes(n.kind))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data.nodes]);

  const orgs = useMemo(() => nodesByKind(...ORG_KINDS), [nodesByKind]);
  const entities = useMemo(() => nodesByKind(...ENTITY_KINDS), [nodesByKind]);
  const triggers = useMemo(() => nodesByKind(...TRIGGER_KINDS), [nodesByKind]);
  const mandates = useMemo(() => nodesByKind(...MANDATE_KINDS), [nodesByKind]);
  const rights = useMemo(() => nodesByKind("CivicRight"), [nodesByKind]);
  const articles = useMemo(() => nodesByKind("Article"), [nodesByKind]);
  const statutes = useMemo(() => nodesByKind("Statute"), [nodesByKind]);
  const drafts = useMemo(() => nodesByKind("LegislativeDraft"), [nodesByKind]);
  const allLaws = useMemo(() => [...statutes, ...drafts], [statutes, drafts]);
  const liabilities = useMemo(() => nodesByKind("ExecutiveLiability"), [nodesByKind]);
  const pipelines = useMemo(() => nodesByKind("InformationPipeline"), [nodesByKind]);

  const selected = selectedUri ? data.nodes.get(selectedUri) : null;

  // Fetch detail + relationships when selection changes
  useEffect(() => {
    if (!selectedUri || !data.isSocketReady) {
      setDetail(null);
      setRels(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    Promise.all([
      data.fetchDetail(selectedUri),
      data.fetchRelationships(selectedUri),
    ]).then(([d, r]) => {
      if (!cancelled) {
        setDetail(d);
        setRels(r);
        setDetailLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setDetailLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedUri, data.isSocketReady, data.fetchDetail, data.fetchRelationships]);

  // Fetch entities + mode data on mode entry (incremental: each mode fetches only what it needs)
  useEffect(() => {
    if (mode !== "overview" || !data.isSocketReady) return;
    let cancelled = false;
    setOverviewLoading(true);
    (async () => {
      const fetchedLaws = await data.fetchEntitiesByKind(...LAW_KINDS);
      const fetchedPipelines = await data.fetchEntitiesByKind("InformationPipeline");
      if (cancelled) return;
      const ov = await data.fetchOverview(
        fetchedLaws.map(l => l.uri),
        fetchedPipelines.map(p => p.uri),
      );
      if (cancelled) return;
      setOverviewData(ov);
      setOverviewLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, lang, data.isSocketReady, data.fetchEntitiesByKind, data.fetchOverview]);

  useEffect(() => {
    if (mode !== "institutions" || !data.isSocketReady) return;
    let cancelled = false;
    setInstLoading(true);
    (async () => {
      const fetchedOrgs = await data.fetchEntitiesByKind(...ORG_KINDS);
      if (cancelled) return;
      const inst = await data.fetchInstitutionsOverview(fetchedOrgs.map(o => o.uri));
      if (cancelled) return;
      setInstData(inst);
      setInstLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, lang, data.isSocketReady, data.fetchEntitiesByKind, data.fetchInstitutionsOverview]);

  useEffect(() => {
    if (mode !== "rights" || !data.isSocketReady) return;
    let cancelled = false;
    setRightsLoading(true);
    (async () => {
      const fetchedRights = await data.fetchEntitiesByKind("CivicRight");
      const fetchedTriggers = await data.fetchEntitiesByKind(...TRIGGER_KINDS);
      if (cancelled) return;
      const rd = await data.fetchRightsOverview(
        fetchedRights.map(r => r.uri),
        fetchedTriggers.map(t => t.uri),
      );
      if (cancelled) return;
      setRightsData(rd);
      setRightsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, lang, data.isSocketReady, data.fetchEntitiesByKind, data.fetchRightsOverview]);

  useEffect(() => {
    if (mode !== "compliance" || !data.isSocketReady) return;
    let cancelled = false;
    setCompLoading(true);
    (async () => {
      const fetchedEntities = await data.fetchEntitiesByKind(...ENTITY_KINDS);
      const fetchedMandates = await data.fetchEntitiesByKind(...MANDATE_KINDS);
      await data.fetchEntitiesByKind("ExecutiveLiability");
      if (cancelled) return;
      const cd = await data.fetchComplianceOverview(
        fetchedEntities.map(e => e.uri),
        fetchedMandates.map(m => m.uri),
      );
      if (cancelled) return;
      setCompData(cd);
      setCompLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, lang, data.isSocketReady, data.fetchEntitiesByKind, data.fetchComplianceOverview]);

  useEffect(() => {
    if (mode !== "structure" || !data.isSocketReady) return;
    let cancelled = false;
    setStructLoading(true);
    (async () => {
      await data.fetchEntitiesByKind(...LAW_KINDS);
      await data.fetchEntitiesByKind("Chapter", "Article", "LegalConcept");
      if (cancelled) return;
      const sd = await data.fetchStructure();
      if (cancelled) return;
      setStructData(sd);
      setStructLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode, lang, data.isSocketReady, data.fetchEntitiesByKind, data.fetchStructure]);

  // Clear mode caches on language change
  useEffect(() => {
    setOverviewData(null);
    setInstData(null);
    setRightsData(null);
    setCompData(null);
    setStructData(null);
    setDetail(null);
    setRels(null);
  }, [lang]);

  if (data.error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "var(--page-height)", color: theme.palette.rose, fontSize: sz(14) }}>
        Error: {data.error.message}
      </div>
    );
  }

  function renderChip(label: string, color: string, onClick?: () => void) {
    return (
      <span
        key={label}
        onClick={onClick}
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: sz(11),
          background: color + "18",
          color,
          border: `1px solid ${color}33`,
          marginRight: 4,
          marginBottom: 4,
          cursor: onClick ? "pointer" : "default",
        }}
      >
        {label}
      </span>
    );
  }

  function renderRefChip(uri: string, color?: string) {
    const node = data.nodes.get(uri);
    if (!node) return null;
    const c = color || KIND_COLORS[node.kind] || theme.text.muted;
    return renderChip(node.label, c, () => setSelectedUri(uri));
  }

  function renderConnectionSection(title: string, uris: string[] | undefined, color?: string) {
    if (!uris || uris.length === 0) return null;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={sectionTitle}>{title}</div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {uris.map(u => <span key={u}>{renderRefChip(u, color)}</span>)}
        </div>
      </div>
    );
  }

  // ─── Detail panel ──────────────────────────────────────────────────

  function renderDetailPanel(node: LawNode) {
    const color = KIND_COLORS[node.kind] || theme.text.muted;

    if (detailLoading) {
      return (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {renderChip(node.kind.replace(/([A-Z])/g, " $1").trim(), color)}
          </div>
          <h2 style={{ fontSize: sz(18), fontWeight: 700, color: theme.text.primary, margin: "8px 0 4px", lineHeight: 1.3 }}>
            {node.label}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: `2px solid ${color}15`,
              borderTopColor: color,
              animation: "law-spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: sz(11), color: theme.text.hint }}>{lang === "lt" ? "Kraunama..." : "Loading details..."}</span>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {renderChip(node.kind.replace(/([A-Z])/g, " $1").trim(), color)}
          {detail?.governanceDomain && renderChip(detail.governanceDomain, domainBadgeColor(detail.governanceDomain, theme))}
        </div>

        <h2 style={{ fontSize: sz(18), fontWeight: 700, color: theme.text.primary, margin: "8px 0 4px", lineHeight: 1.3 }}>
          {node.label}
        </h2>

        {detail?.description && (
          <p style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, margin: "8px 0 16px" }}>
            {detail.description}
          </p>
        )}

        {detail?.legalBasis && (
          <div style={{ fontSize: sz(11), color: theme.text.subtle, marginBottom: 16 }}>
            Legal basis: <span style={{ color: theme.text.secondary }}>{detail.legalBasis}</span>
          </div>
        )}

        {LAW_KINDS.includes(node.kind) && renderLawDetail()}
        {ORG_KINDS.includes(node.kind) && renderOrgConnections()}
        {ENTITY_KINDS.includes(node.kind) && renderEntityConnections()}
        {TRIGGER_KINDS.includes(node.kind) && renderTriggerDetail()}
        {node.kind === "CivicRight" && renderRightDetail()}
        {MANDATE_KINDS.includes(node.kind) && renderMandateDetail()}
        {(node.kind === "Article" || node.kind === "Chapter") && renderArticleDetail()}
        {node.kind === "ExecutiveLiability" && renderLiabilityDetail()}
        {node.kind === "InformationPipeline" && renderPipelineDetail()}
      </div>
    );
  }

  function renderLawDetail() {
    if (!detail || !rels) return null;
    return (
      <>
        {detail.docId && (
          <div style={{ fontSize: sz(12), color: theme.text.secondary, marginBottom: 4 }}>
            <span style={{ color: theme.text.subtle }}>{lang === "lt" ? "Dokumentas: " : "Document ID: "}</span>
            <span style={{ fontWeight: 600 }}>{detail.docId}</span>
          </div>
        )}
        {detail.dateEnacted && (
          <div style={{ fontSize: sz(12), color: theme.text.secondary, marginBottom: 12 }}>
            <span style={{ color: theme.text.subtle }}>{lang === "lt" ? "Priimtas: " : "Enacted: "}</span>
            <span style={{ fontWeight: 600 }}>{detail.dateEnacted}</span>
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Keicia" : "Amends", rels.amendsStatutes, theme.palette.amber)}
        {renderConnectionSection(lang === "lt" ? "Keiciamas" : "Amended by", rels.amendedBy, theme.palette.cyan)}
        {renderConnectionSection(lang === "lt" ? "Pakeicia" : "Supersedes", rels.supersedesVersions, theme.text.muted)}
        {renderConnectionSection(lang === "lt" ? "Pakeiciamas" : "Superseded by", rels.supersededBy, theme.text.muted)}
        {renderConnectionSection(lang === "lt" ? "Garantuojamos teises" : "Guarantees rights", rels.guaranteesRights, theme.palette.emerald)}
        {renderConnectionSection(lang === "lt" ? "Skyriai" : "Chapters", rels.components, theme.palette.purple)}
      </>
    );
  }

  function renderOrgConnections() {
    if (!rels) return null;
    return (
      <>
        {renderConnectionSection(lang === "lt" ? "Pavaldi" : "Sub-agencies", rels.subAgencies, theme.palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Pavaldi organizacijai" : "Reports to", rels.subAgencyOf, theme.palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Priiueri subjektus" : "Governs", rels.governsEntities, theme.palette.rose)}
        {renderConnectionSection(lang === "lt" ? "Keiciasi duomenimis su" : "Exchanges data with", rels.exchangesDataWith, theme.palette.cyan)}
      </>
    );
  }

  function renderEntityConnections() {
    if (!detail || !rels) return null;
    return (
      <>
        {detail.isPublicAdministration !== undefined && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              detail.isPublicAdministration ? (lang === "lt" ? "Viesojo administravimo" : "Public administration") : (lang === "lt" ? "Privatus sektorius" : "Private sector"),
              detail.isPublicAdministration ? theme.palette.blue : theme.palette.amber,
            )}
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Praneiti" : "Must report to", rels.reportsTo, theme.palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Pareigos" : "Obligations", rels.mandatedBy, theme.palette.cyan)}
        {renderConnectionSection(lang === "lt" ? "Baudos" : "Subject to penalties", rels.penalizedBy, "#FF4A6B")}
      </>
    );
  }

  function renderTriggerDetail() {
    if (!detail || !rels) return null;
    return (
      <>
        {detail.isExtraordinaryPower !== undefined && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              detail.isExtraordinaryPower ? (lang === "lt" ? "Ypatingasis igaliojimas" : "Extraordinary power") : (lang === "lt" ? "Standartinis" : "Standard power"),
              detail.isExtraordinaryPower ? theme.palette.orange : theme.palette.emerald,
            )}
          </div>
        )}
        {detail.emergencyLimit && (
          <div style={{ fontSize: sz(12), color: theme.text.secondary, marginBottom: 8 }}>
            <span style={{ color: theme.text.subtle }}>{lang === "lt" ? "Laiko riba: " : "Time limit: "}</span>
            <span style={{ color: theme.palette.amber, fontWeight: 600 }}>{formatDuration(detail.emergencyLimit)}</span>
          </div>
        )}
        {detail.responseWindow && (
          <div style={{ fontSize: sz(12), color: theme.text.secondary, marginBottom: 8 }}>
            <span style={{ color: theme.text.subtle }}>{lang === "lt" ? "Reagavimo langas: " : "Response window: "}</span>
            <span style={{ color: theme.palette.amber, fontWeight: 600 }}>{formatDuration(detail.responseWindow)}</span>
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Vykdoma" : "Executed by", rels.executedBy, theme.palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Riboja teises" : "Limits rights", rels.limitsRights, theme.palette.emerald)}
      </>
    );
  }

  function renderRightDetail() {
    if (!rels) return null;
    return renderConnectionSection(
      lang === "lt" ? "Gali buti ribojama" : "Can be limited by",
      rels.limitedByTriggers,
      theme.palette.orange,
    );
  }

  function renderMandateDetail() {
    if (!detail || !rels) return null;
    return (
      <>
        {detail.isAtExpenseOfEntity !== undefined && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              detail.isAtExpenseOfEntity ? (lang === "lt" ? "Savo lesomis" : "At entity's own expense") : (lang === "lt" ? "Valstybes lesomis" : "State funded"),
              detail.isAtExpenseOfEntity ? theme.palette.amber : theme.palette.emerald,
            )}
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Taikoma" : "Applies to", rels.bearsCostOf, theme.palette.rose)}
      </>
    );
  }

  function renderArticleDetail() {
    if (!rels) return null;
    return renderConnectionSection(lang === "lt" ? "Kodifikuoja" : "Codifies", rels.codifiesConcepts, "#9CA3AF");
  }

  function renderLiabilityDetail() {
    if (!detail || !rels) return null;
    return (
      <>
        {detail.isPersonalHazard && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              lang === "lt" ? "Asmenine atsakomybe" : "Personal liability (targets executives individually)",
              "#FF4A6B",
            )}
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Taikoma subjektams" : "Penalizes", rels.penalizesEntities, theme.palette.rose)}
      </>
    );
  }

  function renderPipelineDetail() {
    if (!rels) return null;
    return renderConnectionSection(lang === "lt" ? "Perduoda duomenis" : "Relays data to", rels.relaysDataTo, theme.palette.blue);
  }

  // ─── Overview mode ──────────────────────────────────────────────────

  function renderOverview() {
    if (allLaws.length === 0 && overviewLoading) {
      const m = MODE_META[0];
      return <ModeLoading color={theme.palette[m.paletteKey]} message={lang === "lt" ? "Kraunami teises aktai..." : "Loading legal documents..."} />;
    }

    const stats = [
      { label: lang === "lt" ? "Teises aktai" : "Legal documents", value: allLaws.length, color: theme.palette.amber },
      { label: lang === "lt" ? "Institucijos" : "Institutions", value: orgs.length, color: theme.palette.blue },
      { label: lang === "lt" ? "Reguliuojami" : "Regulated entities", value: entities.length, color: theme.palette.rose },
      { label: lang === "lt" ? "Galios" : "Emergency powers", value: triggers.length, color: theme.palette.orange },
      { label: lang === "lt" ? "Teises" : "Civic rights", value: rights.length, color: theme.palette.emerald },
      { label: lang === "lt" ? "Straipsniai" : "Articles", value: articles.length, color: theme.palette.purple },
    ];

    return (
      <div style={{ padding: 24, maxWidth: 800, overflowY: "auto", height: "100%" }}>
        <div style={sectionTitle}>
          {lang === "lt" ? "Teises aktai" : "Legal documents"}
        </div>
        {allLaws.map(law => {
          const ld = overviewData?.lawDetails.get(law.uri);
          const isStatute = law.kind === "Statute";
          const accentColor = isStatute ? theme.palette.amber : theme.palette.cyan;

          return (
            <div
              key={law.uri}
              onClick={() => setSelectedUri(law.uri)}
              style={{
                padding: "20px 24px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}03)`,
                border: `1px solid ${accentColor}22`,
                marginBottom: 12,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = accentColor + "55"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = accentColor + "22"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {ld?.docId && (
                  <span style={{ fontSize: sz(11), color: accentColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {ld.docId}
                  </span>
                )}
                {renderChip(isStatute ? (lang === "lt" ? "Istatymas" : "Statute") : (lang === "lt" ? "Projektas" : "Draft/Amendment"), accentColor)}
              </div>
              <h2 style={{ fontSize: sz(18), fontWeight: 700, color: theme.text.primary, margin: "0 0 4px", lineHeight: 1.3 }}>
                {law.label}
              </h2>
              {ld?.dateEnacted && (
                <div style={{ fontSize: sz(12), color: theme.text.muted, marginBottom: 6 }}>
                  {lang === "lt" ? "Priimtas: " : "Enacted: "}{ld.dateEnacted}
                </div>
              )}
              {ld?.amends && ld.amends.length > 0 && (
                <div style={{ fontSize: sz(11), color: theme.palette.cyan, marginBottom: 4 }}>
                  {lang === "lt" ? "Keicia: " : "Amends: "}{ld.amends.map(u => nodeLabel(u)).join(", ")}
                </div>
              )}
              {ld?.description && (
                <p style={{ fontSize: sz(12), color: theme.text.subtle, lineHeight: 1.5, margin: "4px 0 0" }}>
                  {ld.description.length > 200 ? ld.description.slice(0, 200) + "..." : ld.description}
                </p>
              )}
              {!ld && overviewLoading && (
                <div style={loadingDot}>Loading...</div>
              )}
            </div>
          );
        })}

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.filter(s => s.value > 0).length || 1}, 1fr)`, gap: 10, marginBottom: 24 }}>
          {stats.filter(s => s.value > 0).map(s => (
            <div
              key={s.label}
              style={{
                ...cardBase,
                cursor: "default",
                textAlign: "center",
                borderColor: s.color + "22",
              }}
            >
              <div style={{ fontSize: sz(28), fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: sz(10), color: theme.text.subtle, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>
          {lang === "lt" ? "Greita navigacija" : "Quick navigation"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {MODE_META.filter(m => m.key !== "overview").map(m => (
            <div
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                ...cardBase,
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderColor: theme.palette[m.paletteKey] + "22",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = theme.palette[m.paletteKey] + "55"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = theme.palette[m.paletteKey] + "22"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: theme.palette[m.paletteKey] + "15", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: sz(16), color: theme.palette[m.paletteKey],
              }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontSize: sz(13), fontWeight: 600, color: theme.palette[m.paletteKey] }}>{lang === "lt" ? m.lt : m.en}</div>
              </div>
            </div>
          ))}
        </div>

        {pipelines.length > 0 && (
          <>
            <div style={{ ...sectionTitle, marginTop: 24 }}>
              {lang === "lt" ? "Informacijos kanalai" : "Information networks"}
            </div>
            {pipelines.map(p => (
              <div
                key={p.uri}
                onClick={() => setSelectedUri(p.uri)}
                style={{ ...cardBase, marginBottom: 8, borderColor: theme.palette.purple + "22" }}
              >
                <div style={{ fontSize: sz(13), fontWeight: 600, color: theme.palette.purple }}>{p.label}</div>
                {overviewData?.pipelineDescriptions.get(p.uri) && (
                  <div style={{ fontSize: sz(11), color: theme.text.subtle, marginTop: 4 }}>
                    {overviewData.pipelineDescriptions.get(p.uri)!.slice(0, 120)}...
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // ─── Institutions mode ──────────────────────────────────────────────

  function renderInstitutions() {
    if (orgs.length === 0 && instLoading) {
      const m = MODE_META[1];
      return <ModeLoading color={theme.palette[m.paletteKey]} message={lang === "lt" ? "Kraunamos institucijos..." : "Loading institutions..."} />;
    }

    const ministries = orgs.filter(o => o.kind === "Ministry");
    const authorities = orgs.filter(o => o.kind === "JurisdictionAuthority");

    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 280, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>{lang === "lt" ? "Ministerijos" : "Ministries"}</div>
          {ministries.map(o => renderOrgCard(o))}

          <div style={sectionTitle}>{lang === "lt" ? "Institucijos" : "Authorities"}</div>
          {authorities.map(o => renderOrgCard(o))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selected && ORG_KINDS.includes(selected.kind)
            ? renderDetailPanel(selected)
            : renderInstitutionalOverview()
          }
        </div>
      </div>
    );
  }

  function renderOrgCard(node: LawNode) {
    const isSelected = selectedUri === node.uri;
    const color = KIND_COLORS[node.kind] || theme.text.muted;
    const domain = instData?.governanceDomains.get(node.uri);

    return (
      <div
        key={node.uri}
        onClick={() => setSelectedUri(node.uri)}
        style={{
          ...cardBase,
          marginBottom: 6,
          borderLeft: isSelected ? `3px solid ${color}` : `3px solid transparent`,
          background: isSelected ? color + "0A" : cardBase.background,
        }}
      >
        <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? color : theme.text.primary }}>
          {node.label}
        </div>
        {domain && (
          <div style={{ fontSize: sz(10), color: domainBadgeColor(domain, theme), marginTop: 2 }}>
            {domain}
          </div>
        )}
      </div>
    );
  }

  function renderInstitutionalOverview() {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ fontSize: sz(16), fontWeight: 700, color: theme.palette.blue, marginBottom: 8 }}>
          {lang === "lt" ? "Institucine struktura" : "Institutional framework"}
        </h2>
        <p style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, marginBottom: 16 }}>
          {lang === "lt"
            ? "Pasirinkite institucija kaireje, kad pamatysite jos igaliojimus, priiurimus subjektus ir duomenu mainu rysius."
            : "Select an institution on the left to see its powers, governed entities, and data exchange relationships."
          }
        </p>

        <div style={sectionTitle}>{lang === "lt" ? "Duomenu mainu tinklas" : "Data exchange network"}</div>
        {instLoading && <div style={loadingDot}>Loading exchanges...</div>}
        {instData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {instData.dataExchanges.map(([from, to]) => (
              <div key={`${from}-${to}`} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.02)",
                fontSize: sz(11), color: theme.text.secondary,
              }}>
                <span
                  onClick={() => setSelectedUri(from)}
                  style={{ color: theme.palette.cyan, cursor: "pointer", fontWeight: 600 }}
                >
                  {nodeLabel(from)}
                </span>
                <span style={{ color: theme.text.hint }}>{"\u2194"}</span>
                <span
                  onClick={() => setSelectedUri(to)}
                  style={{ color: theme.palette.cyan, cursor: "pointer", fontWeight: 600 }}
                >
                  {nodeLabel(to)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Rights & Powers mode ───────────────────────────────────────────

  function renderRightsAndPowers() {
    if (rights.length === 0 && triggers.length === 0 && rightsLoading) {
      const m = MODE_META[2];
      return <ModeLoading color={theme.palette[m.paletteKey]} message={lang === "lt" ? "Kraunamos teises ir galios..." : "Loading rights & powers..."} />;
    }

    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 320, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>
            {lang === "lt" ? "Garantuojamos teises" : "Guaranteed rights"}
            <span style={{ color: theme.palette.emerald, marginLeft: 6 }}>({rights.length})</span>
          </div>
          {rights.map(r => {
            const isSelected = selectedUri === r.uri;
            const limitedBy = rightsData?.rightTriggers.get(r.uri);
            return (
              <div
                key={r.uri}
                onClick={() => setSelectedUri(r.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${theme.palette.emerald}` : `3px solid transparent`,
                  background: isSelected ? theme.palette.emerald + "0A" : cardBase.background,
                  borderColor: theme.palette.emerald + "15",
                }}
              >
                <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? theme.palette.emerald : theme.text.primary }}>
                  {r.label}
                </div>
                {limitedBy && limitedBy.length > 0 && (
                  <div style={{ fontSize: sz(10), color: theme.palette.orange, marginTop: 4 }}>
                    {lang === "lt" ? "Ribojama " : "Limited by "}{limitedBy.length} {lang === "lt" ? "galiomis" : "power(s)"}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ ...sectionTitle, marginTop: 20 }}>
            {lang === "lt" ? "Ypatingosios galios" : "Emergency powers"}
            <span style={{ color: theme.palette.orange, marginLeft: 6 }}>({triggers.length})</span>
          </div>
          {triggers.map(t => {
            const isSelected = selectedUri === t.uri;
            const flags = rightsData?.triggerFlags.get(t.uri);
            return (
              <div
                key={t.uri}
                onClick={() => setSelectedUri(t.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${theme.palette.orange}` : `3px solid transparent`,
                  background: isSelected ? theme.palette.orange + "0A" : cardBase.background,
                  borderColor: theme.palette.orange + "15",
                }}
              >
                <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? theme.palette.orange : theme.text.primary }}>
                  {t.label}
                </div>
                {flags && (
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {flags.extraordinary && renderChip(lang === "lt" ? "Ypatingasis" : "Extraordinary", theme.palette.orange)}
                    {(flags.limit || flags.window) && renderChip(formatDuration(flags.limit || flags.window || ""), theme.palette.amber)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selected && (selected.kind === "CivicRight" || selected.kind === "IncidentTrigger")
            ? renderDetailPanel(selected)
            : renderRightsOverview()
          }
        </div>
      </div>
    );
  }

  function renderRightsOverview() {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ fontSize: sz(16), fontWeight: 700, color: theme.palette.emerald, marginBottom: 8 }}>
          {lang === "lt" ? "Teisiu ir galiu balansas" : "Balance of rights and powers"}
        </h2>
        <p style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, marginBottom: 20 }}>
          {lang === "lt"
            ? "Istatymas garantuoja pagrindines pilietines teises kibernetineje erdveje, taciau leidzia jas laikinai apriboti ypatinguju incidentu metu. Visos apribojimu priemones turi buti proporcingos ir laiko atzivilgiu ribotos."
            : "The law guarantees fundamental civic rights in cyberspace while allowing temporary limitations during emergency incidents. All restrictive measures must be proportionate and time-limited."
          }
        </p>

        {rightsLoading && <div style={loadingDot}>Loading connections...</div>}

        {rightsData && (
          <>
            <div style={sectionTitle}>{lang === "lt" ? "Teisiu ir galiu rysiai" : "Rights-powers connections"}</div>
            {rights.map(r => {
              const limitedBy = rightsData.rightTriggers.get(r.uri);
              if (!limitedBy || limitedBy.length === 0) return (
                <div key={r.uri} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  marginBottom: 4, fontSize: sz(12),
                }}>
                  <span style={{ color: theme.palette.emerald, fontWeight: 600, flex: 1, cursor: "pointer" }}
                    onClick={() => setSelectedUri(r.uri)}>
                    {r.label}
                  </span>
                  <span style={{ color: theme.text.hint, fontSize: sz(11) }}>
                    {lang === "lt" ? "Neribojama" : "Not limited"}
                  </span>
                </div>
              );
              return (
                <div key={r.uri} style={{
                  padding: "8px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  marginBottom: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: sz(12), color: theme.palette.emerald, fontWeight: 600, flex: 1, cursor: "pointer" }}
                      onClick={() => setSelectedUri(r.uri)}>
                      {r.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                    {limitedBy.map(t => (
                      <span key={t}>{renderRefChip(t, theme.palette.orange)}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  // ─── Compliance mode ────────────────────────────────────────────────

  function renderCompliance() {
    if (entities.length === 0 && mandates.length === 0 && compLoading) {
      const m = MODE_META[3];
      return <ModeLoading color={theme.palette[m.paletteKey]} message={lang === "lt" ? "Kraunama atitiktis..." : "Loading compliance data..."} />;
    }

    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 280, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>
            {lang === "lt" ? "Reguliuojami subjektai" : "Regulated entities"}
            <span style={{ color: theme.palette.rose, marginLeft: 6 }}>({entities.length})</span>
          </div>
          {entities.map(e => {
            const isSelected = selectedUri === e.uri;
            return (
              <div
                key={e.uri}
                onClick={() => setSelectedUri(e.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${theme.palette.rose}` : `3px solid transparent`,
                  background: isSelected ? theme.palette.rose + "0A" : cardBase.background,
                  borderColor: theme.palette.rose + "15",
                }}
              >
                <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? theme.palette.rose : theme.text.primary }}>
                  {e.label}
                </div>
                <div style={{ fontSize: sz(10), color: theme.text.subtle, marginTop: 2 }}>
                  {e.kind.replace(/([A-Z])/g, " $1").trim()}
                </div>
              </div>
            );
          })}

          <div style={{ ...sectionTitle, marginTop: 16 }}>
            {lang === "lt" ? "Atsparumo reikalavimai" : "Resilience mandates"}
            <span style={{ color: theme.palette.cyan, marginLeft: 6 }}>({mandates.length})</span>
          </div>
          {mandates.map(m => {
            const isSelected = selectedUri === m.uri;
            const isSelf = compData?.selfFunded.get(m.uri);
            return (
              <div
                key={m.uri}
                onClick={() => setSelectedUri(m.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${theme.palette.cyan}` : `3px solid transparent`,
                  background: isSelected ? theme.palette.cyan + "0A" : cardBase.background,
                  borderColor: theme.palette.cyan + "15",
                }}
              >
                <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? theme.palette.cyan : theme.text.primary }}>
                  {m.label}
                </div>
                {isSelf && (
                  <div style={{ fontSize: sz(10), color: theme.palette.amber, marginTop: 2 }}>
                    {lang === "lt" ? "Savo lesomis" : "Self-funded"}
                  </div>
                )}
              </div>
            );
          })}

          {liabilities.length > 0 && (
            <>
              <div style={{ ...sectionTitle, marginTop: 16 }}>
                {lang === "lt" ? "Atsakomybe" : "Liability"}
                <span style={{ color: "#FF4A6B", marginLeft: 6 }}>({liabilities.length})</span>
              </div>
              {liabilities.map(l => {
                const isSelected = selectedUri === l.uri;
                return (
                  <div
                    key={l.uri}
                    onClick={() => setSelectedUri(l.uri)}
                    style={{
                      ...cardBase,
                      marginBottom: 6,
                      borderLeft: isSelected ? `3px solid #FF4A6B` : `3px solid transparent`,
                      background: isSelected ? "#FF4A6B0A" : cardBase.background,
                      borderColor: "#FF4A6B15",
                    }}
                  >
                    <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? "#FF4A6B" : theme.text.primary }}>
                      {l.label}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selected && (ENTITY_KINDS.includes(selected.kind) || MANDATE_KINDS.includes(selected.kind) || selected.kind === "ExecutiveLiability")
            ? renderDetailPanel(selected)
            : renderComplianceOverview()
          }
        </div>
      </div>
    );
  }

  function renderComplianceOverview() {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ fontSize: sz(16), fontWeight: 700, color: theme.palette.rose, marginBottom: 8 }}>
          {lang === "lt" ? "Atitikties pareigos" : "Compliance obligations"}
        </h2>
        <p style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6, marginBottom: 20 }}>
          {lang === "lt"
            ? "Istatymas nustato pareigas keturioms reguliuojamu subjektu kategorijoms. Kiekviena kategorija turi specifines praneisimu ir saugumo uztikrinimo pareigas."
            : "The law establishes obligations for four categories of regulated entities. Each category has specific reporting and security requirements."
          }
        </p>

        {compLoading && <div style={loadingDot}>Loading reporting chains...</div>}

        {compData && (
          <>
            <div style={sectionTitle}>{lang === "lt" ? "Praneisimu grandine" : "Reporting chains"}</div>
            {entities.map(e => {
              const reportsTo = compData.entityReportsTo.get(e.uri);
              return (
                <div key={e.uri} style={{
                  padding: "8px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  marginBottom: 4,
                }}>
                  <div style={{
                    fontSize: sz(12), fontWeight: 600, color: theme.palette.rose,
                    cursor: "pointer", marginBottom: 4,
                  }} onClick={() => setSelectedUri(e.uri)}>
                    {e.label}
                  </div>
                  {reportsTo && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: sz(10), color: theme.text.hint }}>{lang === "lt" ? "praneisa" : "reports to"} {"\u2192"}</span>
                      {reportsTo.map(a => <span key={a}>{renderRefChip(a, theme.palette.blue)}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  // ─── Structure mode ─────────────────────────────────────────────────

  function renderArticleRow(art: LawNode, indent: number) {
    const isArtExpanded = expandedArticles.has(art.uri);
    const concepts = structData?.articleConcepts.get(art.uri) || [];
    return (
      <div key={art.uri} style={{ marginLeft: indent, marginTop: 2 }}>
        <div
          onClick={() => {
            setSelectedUri(art.uri);
            if (concepts.length > 0) {
              const next = new Set(expandedArticles);
              isArtExpanded ? next.delete(art.uri) : next.add(art.uri);
              setExpandedArticles(next);
            }
          }}
          style={{
            ...cardBase,
            borderLeft: selectedUri === art.uri ? `3px solid ${theme.palette.blue}` : `3px solid transparent`,
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: 2, padding: "8px 12px",
          }}
        >
          {concepts.length > 0 && (
            <span style={{ fontSize: sz(9), color: theme.text.hint, transition: "transform 0.15s", transform: isArtExpanded ? "rotate(90deg)" : "none" }}>
              {"\u25B6"}
            </span>
          )}
          <span style={{ fontSize: sz(11), color: selectedUri === art.uri ? theme.palette.blue : theme.text.secondary }}>
            {art.label}
          </span>
        </div>
        {isArtExpanded && concepts.map(cUri => {
          const concept = data.nodes.get(cUri);
          if (!concept) return null;
          return (
            <div
              key={cUri}
              onClick={() => setSelectedUri(cUri)}
              style={{
                marginLeft: 24, marginTop: 2,
                padding: "6px 10px", borderRadius: 6,
                background: selectedUri === cUri ? "#9CA3AF0A" : "transparent",
                borderLeft: selectedUri === cUri ? `2px solid #9CA3AF` : `2px solid transparent`,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: sz(11), color: selectedUri === cUri ? "#9CA3AF" : theme.text.subtle }}>
                {concept.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderLawChildren(lawUri: string) {
    if (!structData) return null;

    const children = (structData.parentChildren.get(lawUri) || [])
      .map(u => data.nodes.get(u))
      .filter((n): n is LawNode => !!n)
      .sort((a, b) => (structData.indexNumbers.get(a.uri) ?? 0) - (structData.indexNumbers.get(b.uri) ?? 0));

    const chapterChildren = children.filter(n => n.kind === "Chapter");
    const articleChildren = children.filter(n => n.kind === "Article");

    return (
      <>
        {chapterChildren.map(ch => {
          const isExpanded = expandedChapters.has(ch.uri);
          const chapterArticles = (structData.parentChildren.get(ch.uri) || [])
            .map(u => data.nodes.get(u))
            .filter((n): n is LawNode => n?.kind === "Article")
            .sort((a, b) => (structData.indexNumbers.get(a.uri) ?? 0) - (structData.indexNumbers.get(b.uri) ?? 0));

          return (
            <div key={ch.uri} style={{ marginLeft: 16, marginTop: 4 }}>
              <div
                onClick={() => {
                  const next = new Set(expandedChapters);
                  isExpanded ? next.delete(ch.uri) : next.add(ch.uri);
                  setExpandedChapters(next);
                }}
                style={{
                  ...cardBase,
                  borderLeft: selectedUri === ch.uri ? `3px solid ${theme.palette.purple}` : `3px solid transparent`,
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: sz(10), color: theme.text.hint, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                  {"\u25B6"}
                </span>
                <span
                  style={{ fontSize: sz(12), fontWeight: 600, color: theme.palette.purple, flex: 1, cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); setSelectedUri(ch.uri); }}
                >
                  {ch.label}
                </span>
                <span style={{ fontSize: sz(10), color: theme.text.hint }}>{chapterArticles.length}</span>
              </div>
              {isExpanded && chapterArticles.map(art => renderArticleRow(art, 20))}
            </div>
          );
        })}
        {articleChildren.map(art => renderArticleRow(art, 16))}
      </>
    );
  }

  function renderStructure() {
    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 340, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>
            {lang === "lt" ? "Istatymo struktura" : "Law structure"}
          </div>

          {structLoading && <div style={loadingDot}>Loading structure...</div>}

          {allLaws.map(s => (
            <div key={s.uri} style={{ marginBottom: 8 }}>
              <div
                onClick={() => setSelectedUri(s.uri)}
                style={{
                  ...cardBase,
                  borderLeft: selectedUri === s.uri ? `3px solid ${KIND_COLORS[s.kind]}` : `3px solid transparent`,
                  background: selectedUri === s.uri ? KIND_COLORS[s.kind] + "0A" : cardBase.background,
                  borderColor: KIND_COLORS[s.kind] + "22",
                  fontWeight: 700,
                  fontSize: sz(13),
                  color: KIND_COLORS[s.kind],
                }}
              >
                {s.label}
              </div>

              {structData && renderLawChildren(s.uri)}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selected
            ? renderDetailPanel(selected)
            : (
              <div style={{ padding: 20 }}>
                <h2 style={{ fontSize: sz(16), fontWeight: 700, color: theme.palette.purple, marginBottom: 8 }}>
                  {lang === "lt" ? "Istatymo struktura" : "Law structure"}
                </h2>
                <p style={{ fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6 }}>
                  {lang === "lt"
                    ? "Ispleskite skyrius kaireje, kad pamatysite straipsnius ir ju kodifikuojamas savokas."
                    : "Expand chapters on the left to see articles and the legal concepts they codify."
                  }
                </p>
              </div>
            )
          }
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────

  return (
    <div style={{
      height: "var(--page-height)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: theme.surface.base,
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: sz(18) }}>{"\u2696"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: sz(14), fontWeight: 700, color: theme.text.primary }}>
            {lang === "lt" ? "Teises aktai kontekste" : "Law in Context"}
          </div>
          {allLaws.length > 0 && (
            <div style={{ fontSize: sz(10), color: theme.text.subtle }}>
              {allLaws.length} {lang === "lt" ? "teises aktai" : allLaws.length === 1 ? "legal document" : "legal documents"}
            </div>
          )}
        </div>

        {/* Language toggle */}
        <div style={{
          display: "flex",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}>
          {(["en", "lt"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: "4px 12px",
                fontSize: sz(11),
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                background: lang === l ? theme.palette.amber + "20" : "transparent",
                color: lang === l ? theme.palette.amber : theme.text.subtle,
                border: "none",
                cursor: "pointer",
                textTransform: "uppercase",
                borderRight: l === "en" ? "1px solid rgba(255,255,255,0.1)" : "none",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Mode sidebar */}
        <div style={{
          width: 52,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 8,
          gap: 2,
          flexShrink: 0,
        }}>
          {MODE_META.map(m => {
            const isActive = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setSelectedUri(null); }}
                title={lang === "lt" ? m.lt : m.en}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: isActive ? theme.palette[m.paletteKey] + "18" : "transparent",
                  color: isActive ? theme.palette[m.paletteKey] : theme.text.hint,
                  fontSize: sz(18),
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                {m.icon}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {mode === "overview" && renderOverview()}
          {mode === "institutions" && renderInstitutions()}
          {mode === "rights" && renderRightsAndPowers()}
          {mode === "compliance" && renderCompliance()}
          {mode === "structure" && renderStructure()}
        </div>
      </div>
    </div>
  );
}
