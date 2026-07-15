import { useState, useMemo, useCallback } from "react";
import { useLawData } from "../../hooks/useLawData";
import type { LawNode } from "../../hooks/useLawData";
import { palette, text, surface } from "../../theme/colors";

export interface LawExplorerProps {}

type Mode = "overview" | "institutions" | "rights" | "compliance" | "structure";

const MODE_META: { key: Mode; en: string; lt: string; icon: string; color: string }[] = [
  { key: "overview", en: "Overview", lt: "Apzvalga", icon: "\u2696", color: palette.amber },
  { key: "institutions", en: "Institutions", lt: "Institucijos", icon: "\u25C8", color: palette.blue },
  { key: "rights", en: "Rights & Powers", lt: "Teises ir galios", icon: "\u25C9", color: palette.emerald },
  { key: "compliance", en: "Compliance", lt: "Atitiktis", icon: "\u25CE", color: palette.rose },
  { key: "structure", en: "Law Structure", lt: "Struktura", icon: "\u25B3", color: palette.purple },
];

const KIND_COLORS: Record<string, string> = {
  Statute: palette.amber,
  LegislativeDraft: palette.cyan,
  Chapter: palette.purple,
  Article: palette.blue,
  Ministry: "#4A9EFF",
  JurisdictionAuthority: "#6B8AFF",
  RegulatedEntity: palette.rose,
  CriticalInfrastructureOperator: palette.rose,
  ElectronicCommunicationsProvider: palette.rose,
  HostingServiceProvider: palette.rose,
  IncidentTrigger: palette.orange,
  ResilienceMandate: palette.cyan,
  ContinuityProtocol: palette.cyan,
  InformationPipeline: palette.purple,
  CivicRight: palette.emerald,
  ExecutiveLiability: "#FF4A6B",
  LegalConcept: "#9CA3AF",
};

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

function domainBadgeColor(domain: string): string {
  if (domain === "Military") return palette.rose;
  if (domain === "Civilian") return palette.blue;
  if (domain === "Independent Regulatory") return palette.emerald;
  return text.muted;
}

const cardBase: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: text.subtle,
  marginBottom: 8,
  marginTop: 16,
};

export function LawExplorer(_props: LawExplorerProps) {
  const [lang, setLang] = useState<"en" | "lt">("en");
  const [mode, setMode] = useState<Mode>("overview");
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const data = useLawData(lang);

  const nodeLabel = useCallback((uri: string | undefined) => {
    if (!uri) return "";
    return data.nodes.get(uri)?.label || uri.split("#").pop() || uri;
  }, [data.nodes]);

  const nodesByKind = useCallback((...kinds: string[]) => {
    return [...data.nodes.values()]
      .filter(n => kinds.includes(n.kind))
      .sort((a, b) => {
        const ia = data.indexNumbers.get(a.uri) ?? 999;
        const ib = data.indexNumbers.get(b.uri) ?? 999;
        return ia - ib || a.label.localeCompare(b.label);
      });
  }, [data.nodes, data.indexNumbers]);

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

  if (data.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "var(--page-height)", color: text.muted, fontSize: 14 }}>
        Loading data...
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "var(--page-height)", color: palette.rose, fontSize: 14 }}>
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
          fontSize: 11,
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
    const c = color || KIND_COLORS[node.kind] || text.muted;
    return renderChip(node.label, c, () => setSelectedUri(uri));
  }

  function renderDetailPanel(node: LawNode) {
    const desc = data.descriptions.get(node.uri);
    const basis = data.legalBases.get(node.uri);
    const domain = data.governanceDomains.get(node.uri);
    const color = KIND_COLORS[node.kind] || text.muted;

    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {renderChip(node.kind.replace(/([A-Z])/g, " $1").trim(), color)}
          {domain && renderChip(domain, domainBadgeColor(domain))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "8px 0 4px", lineHeight: 1.3 }}>
          {node.label}
        </h2>

        {desc && (
          <p style={{ fontSize: 12, color: text.secondary, lineHeight: 1.6, margin: "8px 0 16px" }}>
            {desc}
          </p>
        )}

        {basis && (
          <div style={{ fontSize: 11, color: text.subtle, marginBottom: 16 }}>
            Legal basis: <span style={{ color: text.secondary }}>{basis}</span>
          </div>
        )}

        {LAW_KINDS.includes(node.kind) && renderLawDetail(node.uri)}
        {ORG_KINDS.includes(node.kind) && renderOrgConnections(node.uri)}
        {ENTITY_KINDS.includes(node.kind) && renderEntityConnections(node.uri)}
        {TRIGGER_KINDS.includes(node.kind) && renderTriggerDetail(node.uri)}
        {node.kind === "CivicRight" && renderRightDetail(node.uri)}
        {MANDATE_KINDS.includes(node.kind) && renderMandateDetail(node.uri)}
        {node.kind === "Article" && renderArticleDetail(node.uri)}
        {node.kind === "Chapter" && renderArticleDetail(node.uri)}
        {node.kind === "ExecutiveLiability" && renderLiabilityDetail(node.uri)}
        {node.kind === "InformationPipeline" && renderPipelineDetail(node.uri)}
      </div>
    );
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

  function renderOrgConnections(uri: string) {
    const subAgencies = data.authoritySubAgencies.get(uri);
    const parentOrg = data.subAgencyParent.get(uri);
    const governed = data.authorityEntities.get(uri);
    const exchanges = data.dataExchange.get(uri);

    return (
      <>
        {renderConnectionSection(lang === "lt" ? "Pavaldi" : "Sub-agencies", subAgencies, palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Pavaldi organizacijai" : "Reports to", parentOrg, palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Priiueri subjektus" : "Governs", governed, palette.rose)}
        {renderConnectionSection(lang === "lt" ? "Keiciasi duomenimis su" : "Exchanges data with", exchanges, palette.cyan)}
      </>
    );
  }

  function renderEntityConnections(uri: string) {
    const reportsTo = data.entityReportsTo.get(uri);
    const penalties = data.entityPenalties.get(uri);
    const entityMandates = data.entityMandates.get(uri);
    const isPubAdmin = data.publicAdmin.get(uri);

    return (
      <>
        {isPubAdmin !== undefined && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              isPubAdmin ? (lang === "lt" ? "Viesojo administravimo" : "Public administration") : (lang === "lt" ? "Privatus sektorius" : "Private sector"),
              isPubAdmin ? palette.blue : palette.amber,
            )}
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Praneiti" : "Must report to", reportsTo, palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Pareigos" : "Obligations", entityMandates, palette.cyan)}
        {renderConnectionSection(lang === "lt" ? "Baudos" : "Subject to penalties", penalties, "#FF4A6B")}
      </>
    );
  }

  function renderTriggerDetail(uri: string) {
    const isExtra = data.extraordinaryPower.get(uri);
    const limit = data.emergencyLimits.get(uri);
    const window = data.responseWindows.get(uri);
    const authority = data.triggerAuthority.get(uri);
    const rightsLimited = data.triggerRights.get(uri);

    return (
      <>
        {isExtra !== undefined && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              isExtra ? (lang === "lt" ? "Ypatingasis igaliojimas" : "Extraordinary power") : (lang === "lt" ? "Standartinis" : "Standard power"),
              isExtra ? palette.orange : palette.emerald,
            )}
          </div>
        )}
        {limit && (
          <div style={{ fontSize: 12, color: text.secondary, marginBottom: 8 }}>
            <span style={{ color: text.subtle }}>{lang === "lt" ? "Laiko riba: " : "Time limit: "}</span>
            <span style={{ color: palette.amber, fontWeight: 600 }}>{formatDuration(limit)}</span>
          </div>
        )}
        {window && (
          <div style={{ fontSize: 12, color: text.secondary, marginBottom: 8 }}>
            <span style={{ color: text.subtle }}>{lang === "lt" ? "Reagavimo langas: " : "Response window: "}</span>
            <span style={{ color: palette.amber, fontWeight: 600 }}>{formatDuration(window)}</span>
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Vykdoma" : "Executed by", authority, palette.blue)}
        {renderConnectionSection(lang === "lt" ? "Riboja teises" : "Limits rights", rightsLimited, palette.emerald)}
      </>
    );
  }

  function renderRightDetail(uri: string) {
    const limitedBy = data.rightTriggers.get(uri);
    return renderConnectionSection(
      lang === "lt" ? "Gali buti ribojama" : "Can be limited by",
      limitedBy,
      palette.orange,
    );
  }

  function renderMandateDetail(uri: string) {
    const isSelfFunded = data.selfFunded.get(uri);
    const affectedEntities = data.mandateEntities.get(uri);

    return (
      <>
        {isSelfFunded !== undefined && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              isSelfFunded ? (lang === "lt" ? "Savo lesomis" : "At entity's own expense") : (lang === "lt" ? "Valstybes lesomis" : "State funded"),
              isSelfFunded ? palette.amber : palette.emerald,
            )}
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Taikoma" : "Applies to", affectedEntities, palette.rose)}
      </>
    );
  }

  function renderArticleDetail(uri: string) {
    const concepts = data.articleConcepts.get(uri);
    return renderConnectionSection(lang === "lt" ? "Kodifikuoja" : "Codifies", concepts, "#9CA3AF");
  }

  function renderLiabilityDetail(uri: string) {
    const isPersonal = data.personalHazard.get(uri);
    const penalized = data.liabilityEntities.get(uri);

    return (
      <>
        {isPersonal && (
          <div style={{ marginBottom: 12 }}>
            {renderChip(
              lang === "lt" ? "Asmenine atsakomybe" : "Personal liability (targets executives individually)",
              "#FF4A6B",
            )}
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Taikoma subjektams" : "Penalizes", penalized, palette.rose)}
      </>
    );
  }

  function renderPipelineDetail(uri: string) {
    const relaysTo = data.pipelineAuthority.get(uri);
    return renderConnectionSection(lang === "lt" ? "Perduoda duomenis" : "Relays data to", relaysTo, palette.blue);
  }

  function renderLawDetail(uri: string) {
    const docId = data.docIds.get(uri);
    const enacted = data.datesEnacted.get(uri);
    const amends = data.draftAmends.get(uri);
    const amendedByList = data.amendedBy.get(uri);
    const supersededByList = data.supersededBy.get(uri);
    const supersedesList = data.supersedes.get(uri);
    const guaranteedRights = data.statuteRights.get(uri);
    const components = data.parentChildren.get(uri);

    return (
      <>
        {docId && (
          <div style={{ fontSize: 12, color: text.secondary, marginBottom: 4 }}>
            <span style={{ color: text.subtle }}>{lang === "lt" ? "Dokumentas: " : "Document ID: "}</span>
            <span style={{ fontWeight: 600 }}>{docId}</span>
          </div>
        )}
        {enacted && (
          <div style={{ fontSize: 12, color: text.secondary, marginBottom: 12 }}>
            <span style={{ color: text.subtle }}>{lang === "lt" ? "Priimtas: " : "Enacted: "}</span>
            <span style={{ fontWeight: 600 }}>{enacted}</span>
          </div>
        )}
        {renderConnectionSection(lang === "lt" ? "Keicia" : "Amends", amends, palette.amber)}
        {renderConnectionSection(lang === "lt" ? "Keiciamas" : "Amended by", amendedByList, palette.cyan)}
        {renderConnectionSection(lang === "lt" ? "Pakeicia" : "Supersedes", supersedesList, text.muted)}
        {renderConnectionSection(lang === "lt" ? "Pakeiciamas" : "Superseded by", supersededByList, text.muted)}
        {renderConnectionSection(lang === "lt" ? "Garantuojamos teises" : "Guarantees rights", guaranteedRights, palette.emerald)}
        {renderConnectionSection(lang === "lt" ? "Skyriai" : "Chapters", components, palette.purple)}
      </>
    );
  }

  // ─── Overview mode ──────────────────────────────────────────────────

  function renderOverview() {
    const stats = [
      { label: lang === "lt" ? "Teises aktai" : "Legal documents", value: allLaws.length, color: palette.amber },
      { label: lang === "lt" ? "Institucijos" : "Institutions", value: orgs.length, color: palette.blue },
      { label: lang === "lt" ? "Reguliuojami" : "Regulated entities", value: entities.length, color: palette.rose },
      { label: lang === "lt" ? "Galios" : "Emergency powers", value: triggers.length, color: palette.orange },
      { label: lang === "lt" ? "Teises" : "Civic rights", value: rights.length, color: palette.emerald },
      { label: lang === "lt" ? "Straipsniai" : "Articles", value: articles.length, color: palette.purple },
    ];

    return (
      <div style={{ padding: 24, maxWidth: 800, overflowY: "auto", height: "100%" }}>
        <div style={sectionTitle}>
          {lang === "lt" ? "Teises aktai" : "Legal documents"}
        </div>
        {allLaws.map(law => {
          const docId = data.docIds.get(law.uri);
          const enacted = data.datesEnacted.get(law.uri);
          const desc = data.descriptions.get(law.uri);
          const amends = data.draftAmends.get(law.uri);
          const isStatute = law.kind === "Statute";
          const accentColor = isStatute ? palette.amber : palette.cyan;

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
                {docId && (
                  <span style={{ fontSize: 11, color: accentColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {docId}
                  </span>
                )}
                {renderChip(isStatute ? (lang === "lt" ? "Istatymas" : "Statute") : (lang === "lt" ? "Projektas" : "Draft/Amendment"), accentColor)}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 4px", lineHeight: 1.3 }}>
                {law.label}
              </h2>
              {enacted && (
                <div style={{ fontSize: 12, color: text.muted, marginBottom: 6 }}>
                  {lang === "lt" ? "Priimtas: " : "Enacted: "}{enacted}
                </div>
              )}
              {amends && amends.length > 0 && (
                <div style={{ fontSize: 11, color: palette.cyan, marginBottom: 4 }}>
                  {lang === "lt" ? "Keicia: " : "Amends: "}{amends.map(u => nodeLabel(u)).join(", ")}
                </div>
              )}
              {desc && (
                <p style={{ fontSize: 12, color: text.subtle, lineHeight: 1.5, margin: "4px 0 0" }}>
                  {desc.length > 200 ? desc.slice(0, 200) + "..." : desc}
                </p>
              )}
            </div>
          );
        })}

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10, marginBottom: 24 }}>
          {stats.map(s => (
            <div
              key={s.label}
              style={{
                ...cardBase,
                cursor: "default",
                textAlign: "center",
                borderColor: s.color + "22",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: text.subtle, marginTop: 2 }}>{s.label}</div>
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
                borderColor: m.color + "22",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = m.color + "55"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = m.color + "22"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: m.color + "15", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 16, color: m.color,
              }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: m.color }}>{lang === "lt" ? m.lt : m.en}</div>
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
                style={{ ...cardBase, marginBottom: 8, borderColor: palette.purple + "22" }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: palette.purple }}>{p.label}</div>
                <div style={{ fontSize: 11, color: text.subtle, marginTop: 4 }}>
                  {data.descriptions.get(p.uri)?.slice(0, 120)}...
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // ─── Institutions mode ──────────────────────────────────────────────

  function renderInstitutions() {
    const ministries = orgs.filter(o => o.kind === "Ministry");
    const authorities = orgs.filter(o => o.kind === "JurisdictionAuthority");

    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 280, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>{lang === "lt" ? "Ministerijos" : "Ministries"}</div>
          {ministries.map(renderOrgCard)}

          <div style={sectionTitle}>{lang === "lt" ? "Institucijos" : "Authorities"}</div>
          {authorities.map(renderOrgCard)}
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
    const domain = data.governanceDomains.get(node.uri);
    const color = KIND_COLORS[node.kind] || text.muted;

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
        <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? color : text.primary }}>
          {node.label}
        </div>
        {domain && (
          <div style={{ fontSize: 10, color: domainBadgeColor(domain), marginTop: 2 }}>
            {domain}
          </div>
        )}
      </div>
    );
  }

  function renderInstitutionalOverview() {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: palette.blue, marginBottom: 8 }}>
          {lang === "lt" ? "Institucine struktura" : "Institutional framework"}
        </h2>
        <p style={{ fontSize: 12, color: text.secondary, lineHeight: 1.6, marginBottom: 16 }}>
          {lang === "lt"
            ? "Pasirinkite institucija kaireje, kad pamatysite jos igaliojimus, priiurimus subjektus ir duomenu mainu rysius."
            : "Select an institution on the left to see its powers, governed entities, and data exchange relationships."
          }
        </p>

        <div style={sectionTitle}>{lang === "lt" ? "Duomenu mainu tinklas" : "Data exchange network"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.dataExchange.size > 0 && [...data.dataExchange.entries()].map(([from, tos]) =>
            tos.map(to => (
              <div key={`${from}-${to}`} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.02)",
                fontSize: 11, color: text.secondary,
              }}>
                <span
                  onClick={() => setSelectedUri(from)}
                  style={{ color: palette.cyan, cursor: "pointer", fontWeight: 600 }}
                >
                  {nodeLabel(from)}
                </span>
                <span style={{ color: text.hint }}>{"\u2194"}</span>
                <span
                  onClick={() => setSelectedUri(to)}
                  style={{ color: palette.cyan, cursor: "pointer", fontWeight: 600 }}
                >
                  {nodeLabel(to)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── Rights & Powers mode ───────────────────────────────────────────

  function renderRightsAndPowers() {
    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 320, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>
            {lang === "lt" ? "Garantuojamos teises" : "Guaranteed rights"}
            <span style={{ color: palette.emerald, marginLeft: 6 }}>({rights.length})</span>
          </div>
          {rights.map(r => {
            const isSelected = selectedUri === r.uri;
            const limitedBy = data.rightTriggers.get(r.uri);
            return (
              <div
                key={r.uri}
                onClick={() => setSelectedUri(r.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${palette.emerald}` : `3px solid transparent`,
                  background: isSelected ? palette.emerald + "0A" : cardBase.background,
                  borderColor: palette.emerald + "15",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? palette.emerald : text.primary }}>
                  {r.label}
                </div>
                {limitedBy && limitedBy.length > 0 && (
                  <div style={{ fontSize: 10, color: palette.orange, marginTop: 4 }}>
                    {lang === "lt" ? "Ribojama " : "Limited by "}{limitedBy.length} {lang === "lt" ? "galiomis" : "power(s)"}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ ...sectionTitle, marginTop: 20 }}>
            {lang === "lt" ? "Ypatingosios galios" : "Emergency powers"}
            <span style={{ color: palette.orange, marginLeft: 6 }}>({triggers.length})</span>
          </div>
          {triggers.map(t => {
            const isSelected = selectedUri === t.uri;
            const isExtra = data.extraordinaryPower.get(t.uri);
            const limit = data.emergencyLimits.get(t.uri);
            const window = data.responseWindows.get(t.uri);
            return (
              <div
                key={t.uri}
                onClick={() => setSelectedUri(t.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${palette.orange}` : `3px solid transparent`,
                  background: isSelected ? palette.orange + "0A" : cardBase.background,
                  borderColor: palette.orange + "15",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? palette.orange : text.primary }}>
                  {t.label}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {isExtra && renderChip(lang === "lt" ? "Ypatingasis" : "Extraordinary", palette.orange)}
                  {(limit || window) && renderChip(formatDuration(limit || window || ""), palette.amber)}
                </div>
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
        <h2 style={{ fontSize: 16, fontWeight: 700, color: palette.emerald, marginBottom: 8 }}>
          {lang === "lt" ? "Teisiu ir galiu balansas" : "Balance of rights and powers"}
        </h2>
        <p style={{ fontSize: 12, color: text.secondary, lineHeight: 1.6, marginBottom: 20 }}>
          {lang === "lt"
            ? "Istatymas garantuoja pagrindines pilietines teises kibernetineje erdveje, taciau leidzia jas laikinai apriboti ypatinguju incidentu metu. Visos apribojimu priemones turi buti proporcingos ir laiko atzivilgiu ribotos."
            : "The law guarantees fundamental civic rights in cyberspace while allowing temporary limitations during emergency incidents. All restrictive measures must be proportionate and time-limited."
          }
        </p>

        <div style={sectionTitle}>{lang === "lt" ? "Teisiu ir galiu rysiai" : "Rights-powers connections"}</div>
        {rights.map(r => {
          const limitedBy = data.rightTriggers.get(r.uri);
          if (!limitedBy || limitedBy.length === 0) return (
            <div key={r.uri} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              marginBottom: 4, fontSize: 12,
            }}>
              <span style={{ color: palette.emerald, fontWeight: 600, flex: 1, cursor: "pointer" }}
                onClick={() => setSelectedUri(r.uri)}>
                {r.label}
              </span>
              <span style={{ color: text.hint, fontSize: 11 }}>
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
                <span style={{ fontSize: 12, color: palette.emerald, fontWeight: 600, flex: 1, cursor: "pointer" }}
                  onClick={() => setSelectedUri(r.uri)}>
                  {r.label}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                {limitedBy.map(t => (
                  <span key={t}>{renderRefChip(t, palette.orange)}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Compliance mode ────────────────────────────────────────────────

  function renderCompliance() {
    return (
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{
          width: 280, borderRight: "1px solid rgba(255,255,255,0.06)",
          overflowY: "auto", padding: "12px 10px",
        }}>
          <div style={sectionTitle}>
            {lang === "lt" ? "Reguliuojami subjektai" : "Regulated entities"}
            <span style={{ color: palette.rose, marginLeft: 6 }}>({entities.length})</span>
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
                  borderLeft: isSelected ? `3px solid ${palette.rose}` : `3px solid transparent`,
                  background: isSelected ? palette.rose + "0A" : cardBase.background,
                  borderColor: palette.rose + "15",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? palette.rose : text.primary }}>
                  {e.label}
                </div>
                <div style={{ fontSize: 10, color: text.subtle, marginTop: 2 }}>
                  {e.kind.replace(/([A-Z])/g, " $1").trim()}
                </div>
              </div>
            );
          })}

          <div style={{ ...sectionTitle, marginTop: 16 }}>
            {lang === "lt" ? "Atsparumo reikalavimai" : "Resilience mandates"}
            <span style={{ color: palette.cyan, marginLeft: 6 }}>({mandates.length})</span>
          </div>
          {mandates.map(m => {
            const isSelected = selectedUri === m.uri;
            const isSelf = data.selfFunded.get(m.uri);
            return (
              <div
                key={m.uri}
                onClick={() => setSelectedUri(m.uri)}
                style={{
                  ...cardBase,
                  marginBottom: 6,
                  borderLeft: isSelected ? `3px solid ${palette.cyan}` : `3px solid transparent`,
                  background: isSelected ? palette.cyan + "0A" : cardBase.background,
                  borderColor: palette.cyan + "15",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? palette.cyan : text.primary }}>
                  {m.label}
                </div>
                {isSelf && (
                  <div style={{ fontSize: 10, color: palette.amber, marginTop: 2 }}>
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "#FF4A6B" : text.primary }}>
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
        <h2 style={{ fontSize: 16, fontWeight: 700, color: palette.rose, marginBottom: 8 }}>
          {lang === "lt" ? "Atitikties pareigos" : "Compliance obligations"}
        </h2>
        <p style={{ fontSize: 12, color: text.secondary, lineHeight: 1.6, marginBottom: 20 }}>
          {lang === "lt"
            ? "Istatymas nustato pareigas keturioms reguliuojamu subjektu kategorijoms. Kiekviena kategorija turi specifines praneisimu ir saugumo uztikrinimo pareigas."
            : "The law establishes obligations for four categories of regulated entities. Each category has specific reporting and security requirements."
          }
        </p>

        <div style={sectionTitle}>{lang === "lt" ? "Praneisimu grandine" : "Reporting chains"}</div>
        {entities.map(e => {
          const reportsTo = data.entityReportsTo.get(e.uri);
          return (
            <div key={e.uri} style={{
              padding: "8px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              marginBottom: 4,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: palette.rose,
                cursor: "pointer", marginBottom: 4,
              }} onClick={() => setSelectedUri(e.uri)}>
                {e.label}
              </div>
              {reportsTo && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: text.hint }}>{lang === "lt" ? "praneisa" : "reports to"} {"\u2192"}</span>
                  {reportsTo.map(a => <span key={a}>{renderRefChip(a, palette.blue)}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Structure mode ─────────────────────────────────────────────────

  function renderArticleRow(art: LawNode, indent: number) {
    const isArtExpanded = expandedArticles.has(art.uri);
    const concepts = data.articleConcepts.get(art.uri) || [];
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
            borderLeft: selectedUri === art.uri ? `3px solid ${palette.blue}` : `3px solid transparent`,
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: 2, padding: "8px 12px",
          }}
        >
          {concepts.length > 0 && (
            <span style={{ fontSize: 9, color: text.hint, transition: "transform 0.15s", transform: isArtExpanded ? "rotate(90deg)" : "none" }}>
              {"\u25B6"}
            </span>
          )}
          <span style={{ fontSize: 11, color: selectedUri === art.uri ? palette.blue : text.secondary }}>
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
              <span style={{ fontSize: 11, color: selectedUri === cUri ? "#9CA3AF" : text.subtle }}>
                {concept.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderLawChildren(lawUri: string) {
    const children = (data.parentChildren.get(lawUri) || [])
      .map(u => data.nodes.get(u))
      .filter((n): n is LawNode => !!n)
      .sort((a, b) => (data.indexNumbers.get(a.uri) ?? 0) - (data.indexNumbers.get(b.uri) ?? 0));

    const chapterChildren = children.filter(n => n.kind === "Chapter");
    const articleChildren = children.filter(n => n.kind === "Article");

    return (
      <>
        {chapterChildren.map(ch => {
          const isExpanded = expandedChapters.has(ch.uri);
          const chapterArticles = (data.parentChildren.get(ch.uri) || [])
            .map(u => data.nodes.get(u))
            .filter((n): n is LawNode => n?.kind === "Article")
            .sort((a, b) => (data.indexNumbers.get(a.uri) ?? 0) - (data.indexNumbers.get(b.uri) ?? 0));

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
                  borderLeft: selectedUri === ch.uri ? `3px solid ${palette.purple}` : `3px solid transparent`,
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 10, color: text.hint, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                  {"\u25B6"}
                </span>
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: palette.purple, flex: 1, cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); setSelectedUri(ch.uri); }}
                >
                  {ch.label}
                </span>
                <span style={{ fontSize: 10, color: text.hint }}>{chapterArticles.length}</span>
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
                  fontSize: 13,
                  color: KIND_COLORS[s.kind],
                }}
              >
                {s.label}
              </div>

              {renderLawChildren(s.uri)}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selected
            ? renderDetailPanel(selected)
            : (
              <div style={{ padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: palette.purple, marginBottom: 8 }}>
                  {lang === "lt" ? "Istatymo struktura" : "Law structure"}
                </h2>
                <p style={{ fontSize: 12, color: text.secondary, lineHeight: 1.6 }}>
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
        background: surface.base,
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>{"\u2696"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {lang === "lt" ? "Teises aktai kontekste" : "Law in Context"}
          </div>
          <div style={{ fontSize: 10, color: text.subtle }}>
            {allLaws.length} {lang === "lt" ? "teises aktai" : allLaws.length === 1 ? "legal document" : "legal documents"}
          </div>
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
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                background: lang === l ? palette.amber + "20" : "transparent",
                color: lang === l ? palette.amber : text.subtle,
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
                  background: isActive ? m.color + "18" : "transparent",
                  color: isActive ? m.color : text.hint,
                  fontSize: 18,
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
