import { useState, useMemo, useCallback } from "react";
import { useTheme, LoadingState } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import { useInnovationData } from "../useInnovationData";
import type { IINode } from "../useInnovationData";
import { PathFinder } from "./PathFinder";
import { GtmAdvisor } from "./GtmAdvisor";

type ExplorerMode = "browse" | "pathfinder" | "gtm";

export interface InnovationExplorerProps {}

const ORG_KINDS = new Set([
  "Organisation", "GovernmentDepartment", "MilitaryCommand", "MilitaryUnit",
  "Agency", "InnovationHub", "DefenceCluster", "TradeAssociation",
  "PrimeContractor", "SME", "Startup", "Investor", "Accelerator",
  "ResearchOrganisation", "University", "AllianceBody",
]);

const GEO_KINDS = new Set([
  "GeopoliticalEntity", "Nation", "PoliticalBloc", "MilitaryAlliance",
  "IntelligencePartnership",
]);

const AREA_KINDS = new Set([
  "GeographicArea", "Region", "MilitaryInstallation", "TechnologyCluster",
]);

const PROC_KINDS = new Set([
  "ProcurementMechanism", "Framework", "InnovationChallenge",
  "DirectAward", "CoCreationProgramme", "GrantFunding",
]);

type CategoryFilter = "all" | "orgs" | "capabilities" | "people" | "procurement" | "geo" | "sectors";

function buildCategories(theme: Theme): { key: CategoryFilter; label: string; color: string }[] {
  return [
    { key: "all", label: "All", color: theme.text.secondary },
    { key: "orgs", label: "Organisations", color: theme.palette.blue },
    { key: "capabilities", label: "Capabilities", color: theme.palette.emerald },
    { key: "people", label: "People", color: theme.palette.amber },
    { key: "procurement", label: "Procurement", color: theme.palette.purple },
    { key: "geo", label: "Geography", color: theme.palette.cyan },
    { key: "sectors", label: "Sectors", color: theme.palette.orange },
  ];
}

function buildKindColors(theme: Theme): Record<string, string> {
  return {
    GovernmentDepartment: theme.palette.blue,
    MilitaryCommand: "#5B8DEF",
    MilitaryUnit: "#4A7FE0",
    Agency: theme.palette.cyan,
    InnovationHub: theme.palette.emerald,
    DefenceCluster: "#6EE7B7",
    TradeAssociation: "#67E8F9",
    PrimeContractor: theme.palette.orange,
    SME: theme.palette.amber,
    Startup: "#FCD34D",
    Investor: theme.palette.pink,
    Accelerator: theme.palette.emerald,
    ResearchOrganisation: theme.palette.purple,
    University: "#C4B5FD",
    AllianceBody: theme.palette.cyan,
    Organisation: theme.palette.blue,
    Person: theme.palette.amber,
    Role: "#D4A574",
    CapabilityDomain: theme.palette.emerald,
    IndustrySector: theme.palette.orange,
    CustomerSegment: theme.palette.rose,
    ProcurementMechanism: theme.palette.purple,
    Framework: theme.palette.purple,
    InnovationChallenge: "#C4B5FD",
    DirectAward: "#B4A5ED",
    CoCreationProgramme: "#A495DD",
    GrantFunding: "#9485CD",
    GeopoliticalEntity: theme.palette.cyan,
    Nation: theme.palette.cyan,
    PoliticalBloc: "#67E8F9",
    MilitaryAlliance: "#57D8E9",
    IntelligencePartnership: "#47C8D9",
    GeographicArea: "#67E8F9",
    Region: "#67E8F9",
    MilitaryInstallation: "#57D8E9",
    TechnologyCluster: theme.palette.emerald,
  };
}

const KIND_ICONS: Record<string, string> = {
  GovernmentDepartment: "🏛",
  MilitaryCommand: "⚔",
  MilitaryUnit: "🎖",
  Agency: "◈",
  InnovationHub: "💡",
  DefenceCluster: "🔗",
  TradeAssociation: "🤝",
  PrimeContractor: "🏭",
  SME: "🔧",
  Startup: "🚀",
  Investor: "💰",
  Accelerator: "⚡",
  ResearchOrganisation: "🔬",
  University: "🎓",
  AllianceBody: "🌐",
  Organisation: "●",
  Person: "👤",
  Role: "📋",
  CapabilityDomain: "⬡",
  IndustrySector: "◆",
  CustomerSegment: "◎",
  Framework: "📜",
  InnovationChallenge: "🏆",
  DirectAward: "📝",
  CoCreationProgramme: "🤝",
  GrantFunding: "💷",
  ProcurementMechanism: "📜",
  Nation: "🏴",
  PoliticalBloc: "🌍",
  MilitaryAlliance: "⚔",
  IntelligencePartnership: "🔒",
  Region: "📍",
  MilitaryInstallation: "🏗",
  TechnologyCluster: "🔬",
  GeopoliticalEntity: "🌍",
  GeographicArea: "📍",
};

function kindLabel(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").trim();
}

function matchesCategory(node: IINode, cat: CategoryFilter): boolean {
  if (cat === "all") return true;
  if (cat === "orgs") return ORG_KINDS.has(node.kind);
  if (cat === "capabilities") return node.kind === "CapabilityDomain";
  if (cat === "people") return node.kind === "Person" || node.kind === "Role";
  if (cat === "procurement") return PROC_KINDS.has(node.kind);
  if (cat === "geo") return GEO_KINDS.has(node.kind) || AREA_KINDS.has(node.kind);
  if (cat === "sectors") return node.kind === "IndustrySector" || node.kind === "CustomerSegment";
  return true;
}

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

function RelLink({ uri, label, color, onClick }: { uri: string; label: string; color: string; onClick: (uri: string) => void }) {
  const { sz } = useTheme();
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

export function InnovationExplorer(_props: InnovationExplorerProps) {
  const { theme, sz } = useTheme();
  const data = useInnovationData();
  const [mode, setMode] = useState<ExplorerMode>("browse");
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const CATEGORIES = useMemo(() => buildCategories(theme), [theme]);
  const KIND_COLORS = useMemo(() => buildKindColors(theme), [theme]);

  const adjacency = useMemo(() => {
    const adj = new Map<string, { target: string; label: string }[]>();
    const add = (from: string, to: string, label: string) => {
      const list = adj.get(from) || [];
      list.push({ target: to, label });
      adj.set(from, list);
    };
    const addBidi = (from: string, to: string, fwd: string, rev: string) => {
      add(from, to, fwd);
      add(to, from, rev);
    };

    for (const [org, caps] of data.orgCapabilities) for (const c of caps) addBidi(org, c, "delivers capability in", "supplied by");
    for (const [org, caps] of data.orgSeeks) for (const c of caps) addBidi(org, c, "seeks capability in", "sought by");
    for (const [child, parent] of data.orgParent) addBidi(child, parent, "sub-organisation of", "parent of");
    for (const [org, targets] of data.orgMembers) for (const t of targets) addBidi(org, t, "member of", "has member");
    for (const [org, partners] of data.orgPartners) for (const p of partners) add(org, p, "partner");
    for (const [org, fws] of data.orgOperatesFramework) for (const f of fws) addBidi(org, f, "operates framework", "operated by");
    for (const [org, fws] of data.orgListedOnFramework) for (const f of fws) addBidi(org, f, "listed on framework", "lists supplier");
    for (const [org, targets] of data.orgProvidesAccess) for (const t of targets) addBidi(org, t, "provides access to", "accessible via");
    for (const [org, locs] of data.orgLocation) for (const l of locs) addBidi(org, l, "located in", "location of");
    for (const [org, funders] of data.orgFundedBy) for (const f of funders) addBidi(org, f, "funded by", "funds");
    for (const [org, sectors] of data.orgSectors) for (const s of sectors) addBidi(org, s, "operates in sector", "sector contains");
    for (const [org, segs] of data.orgTargets) for (const s of segs) addBidi(org, s, "targets segment", "targeted by");
    for (const [org, segs] of data.orgSegments) for (const s of segs) addBidi(org, s, "belongs to segment", "segment contains");
    for (const [person, roles] of data.personRoles) {
      for (const r of roles) {
        const orgUri = data.roleOrg.get(r);
        if (orgUri) addBidi(person, orgUri, "holds role at", "employs");
      }
    }
    for (const [person, caps] of data.personExpertise) for (const c of caps) addBidi(person, c, "has expertise in", "expert");
    for (const [parent, children] of data.capabilityChildren) for (const c of children) addBidi(c, parent, "sub-domain of", "has sub-domain");
    for (const [alliance, members] of data.allianceMembers) for (const m of members) addBidi(alliance, m, "member nation", "member of");
    for (const [nation, areas] of data.nationAreas) for (const a of areas) addBidi(a, nation, "within nation", "contains area");
    for (const [seg, geo] of data.segmentScope) addBidi(seg, geo, "scoped to", "scope of");

    return adj;
  }, [data]);

  const selectNode = useCallback((uri: string) => {
    setSelectedUri(uri);
  }, []);

  const filteredNodes = useMemo(() => {
    const result: IINode[] = [];
    const term = searchTerm.toLowerCase();
    for (const node of data.nodes.values()) {
      if (!matchesCategory(node, category)) continue;
      if (term) {
        const abbr = data.abbreviations.get(node.uri)?.toLowerCase() || "";
        const desc = data.descriptions.get(node.uri)?.toLowerCase() || "";
        if (!node.label.toLowerCase().includes(term) && !abbr.includes(term) && !desc.includes(term)) continue;
      }
      result.push(node);
    }
    result.sort((a, b) => a.label.localeCompare(b.label));
    return result;
  }, [data.nodes, data.abbreviations, data.descriptions, searchTerm, category]);

  const groupedNodes = useMemo(() => {
    const groups = new Map<string, IINode[]>();
    for (const node of filteredNodes) {
      const kind = node.kind;
      const list = groups.get(kind) || [];
      list.push(node);
      groups.set(kind, list);
    }
    const sorted = [...groups.entries()].sort((a, b) => {
      const order = ["GovernmentDepartment", "MilitaryCommand", "Agency", "InnovationHub",
        "PrimeContractor", "Startup", "SME", "Investor", "Accelerator",
        "ResearchOrganisation", "University", "DefenceCluster", "TradeAssociation",
        "AllianceBody", "MilitaryUnit", "Organisation",
        "Person", "CapabilityDomain", "IndustrySector", "CustomerSegment",
        "Framework", "InnovationChallenge", "CoCreationProgramme", "GrantFunding",
        "DirectAward", "ProcurementMechanism",
        "Nation", "MilitaryAlliance", "IntelligencePartnership", "PoliticalBloc",
        "Region", "MilitaryInstallation", "TechnologyCluster"];
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return sorted;
  }, [filteredNodes]);

  const selected = selectedUri ? data.nodes.get(selectedUri) : null;

  const nodeLabel = useCallback((uri: string): string => {
    const n = data.nodes.get(uri);
    if (!n) return uri.split("/").pop() || uri;
    const abbr = data.abbreviations.get(uri);
    return abbr ? `${n.label} (${abbr})` : n.label;
  }, [data.nodes, data.abbreviations]);

  const nodeColor = useCallback((uri: string): string => {
    const n = data.nodes.get(uri);
    return n ? (KIND_COLORS[n.kind] || theme.text.muted) : theme.text.muted;
  }, [data.nodes, KIND_COLORS, theme.text.muted]);

  const stats = useMemo(() => {
    let orgs = 0, people = 0, caps = 0, procs = 0;
    for (const n of data.nodes.values()) {
      if (ORG_KINDS.has(n.kind)) orgs++;
      else if (n.kind === "Person") people++;
      else if (n.kind === "CapabilityDomain") caps++;
      else if (PROC_KINDS.has(n.kind)) procs++;
    }
    return { orgs, people, caps, procs, total: data.nodes.size };
  }, [data.nodes]);

  if (data.isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <LoadingState message="Loading innovation intelligence data..." />
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

  function renderRelationships(uri: string) {
    const sections: { title: string; color: string; uris: string[] }[] = [];

    const addSection = (title: string, color: string, uris: string[] | undefined) => {
      if (uris && uris.length > 0) sections.push({ title, color, uris });
    };

    const node = data.nodes.get(uri);
    if (!node) return null;

    if (ORG_KINDS.has(node.kind)) {
      addSection("Delivers Capability In", theme.palette.emerald, data.orgCapabilities.get(uri));
      addSection("Seeks Capability In", theme.palette.rose, data.orgSeeks.get(uri));
      addSection("Sub-Organisations", theme.palette.blue, data.orgChildren.get(uri));
      const parent = data.orgParent.get(uri);
      if (parent) addSection("Parent Organisation", theme.palette.blue, [parent]);
      addSection("Member Of", theme.palette.cyan, data.orgMembers.get(uri));
      addSection("Partners", theme.palette.pink, data.orgPartners.get(uri));
      addSection("Operates In Sector", theme.palette.orange, data.orgSectors.get(uri));
      addSection("Targets Segment", theme.palette.rose, data.orgTargets.get(uri));
      addSection("Belongs To Segment", theme.palette.rose, data.orgSegments.get(uri));
      addSection("Operates Framework", theme.palette.purple, data.orgOperatesFramework.get(uri));
      addSection("Listed On Framework", theme.palette.purple, data.orgListedOnFramework.get(uri));
      addSection("Provides Access To", theme.palette.cyan, data.orgProvidesAccess.get(uri));
      addSection("Located In", "#67E8F9", data.orgLocation.get(uri));
      addSection("Funded By", theme.palette.pink, data.orgFundedBy.get(uri));
    }

    if (node.kind === "Person") {
      const roles = data.personRoles.get(uri) || [];
      if (roles.length > 0) {
        for (const roleUri of roles) {
          const orgUri = data.roleOrg.get(roleUri);
          const title = data.jobTitles.get(roleUri);
          if (orgUri || title) {
            sections.push({
              title: title || "Role",
              color: theme.palette.amber,
              uris: orgUri ? [orgUri] : [],
            });
          }
        }
      }
      addSection("Expertise", theme.palette.emerald, data.personExpertise.get(uri));
    }

    if (node.kind === "CapabilityDomain") {
      const subs = data.capabilityChildren.get(uri);
      addSection("Sub-Domains", theme.palette.emerald, subs);
      const suppliers: string[] = [];
      const seekers: string[] = [];
      for (const [org, caps] of data.orgCapabilities) {
        if (caps.includes(uri)) suppliers.push(org);
      }
      for (const [org, caps] of data.orgSeeks) {
        if (caps.includes(uri)) seekers.push(org);
      }
      addSection("Supplied By", theme.palette.blue, suppliers.length > 0 ? suppliers : undefined);
      addSection("Sought By", theme.palette.rose, seekers.length > 0 ? seekers : undefined);
    }

    if (PROC_KINDS.has(node.kind)) {
      const operators: string[] = [];
      const listed: string[] = [];
      for (const [org, fws] of data.orgOperatesFramework) {
        if (fws.includes(uri)) operators.push(org);
      }
      for (const [org, fws] of data.orgListedOnFramework) {
        if (fws.includes(uri)) listed.push(org);
      }
      addSection("Operated By", theme.palette.blue, operators.length > 0 ? operators : undefined);
      addSection("Listed Suppliers", theme.palette.amber, listed.length > 0 ? listed : undefined);
    }

    if (node.kind === "CustomerSegment") {
      const targeting: string[] = [];
      const belonging: string[] = [];
      for (const [org, segs] of data.orgTargets) {
        if (segs.includes(uri)) targeting.push(org);
      }
      for (const [org, segs] of data.orgSegments) {
        if (segs.includes(uri)) belonging.push(org);
      }
      addSection("Targeted By", theme.palette.blue, targeting.length > 0 ? targeting : undefined);
      addSection("Organisations In Segment", theme.palette.cyan, belonging.length > 0 ? belonging : undefined);
      const scope = data.segmentScope.get(uri);
      if (scope) addSection("Geopolitical Scope", theme.palette.cyan, [scope]);
    }

    if (GEO_KINDS.has(node.kind)) {
      addSection("Member Nations", theme.palette.cyan, data.allianceMembers.get(uri));
      addSection("Regions & Installations", "#67E8F9", data.nationAreas.get(uri));
      // Reverse: which alliances include this nation?
      const memberOfAlliances: string[] = [];
      for (const [alliance, members] of data.allianceMembers) {
        if (members.includes(uri)) memberOfAlliances.push(alliance);
      }
      addSection("Member Of", theme.palette.cyan, memberOfAlliances.length > 0 ? memberOfAlliances : undefined);
      // Reverse: which customer segments scope to this geo entity?
      const scopedSegments: string[] = [];
      for (const [seg, geo] of data.segmentScope) {
        if (geo === uri) scopedSegments.push(seg);
      }
      addSection("Customer Segments", theme.palette.rose, scopedSegments.length > 0 ? scopedSegments : undefined);
      // Reverse: which orgs are located in areas within this nation?
      const locatedOrgs: string[] = [];
      const areasInNation = new Set(data.nationAreas.get(uri) || []);
      for (const [org, locs] of data.orgLocation) {
        if (locs.some(l => l === uri || areasInNation.has(l))) locatedOrgs.push(org);
      }
      addSection("Organisations Located Here", theme.palette.blue, locatedOrgs.length > 0 ? locatedOrgs : undefined);
    }

    if (AREA_KINDS.has(node.kind)) {
      // Reverse: which orgs are located in this area?
      const locatedOrgs: string[] = [];
      for (const [org, locs] of data.orgLocation) {
        if (locs.includes(uri)) locatedOrgs.push(org);
      }
      addSection("Organisations Located Here", theme.palette.blue, locatedOrgs.length > 0 ? locatedOrgs : undefined);
    }

    if (node.kind === "IndustrySector") {
      const orgsInSector: string[] = [];
      for (const [org, sectors] of data.orgSectors) {
        if (sectors.includes(uri)) orgsInSector.push(org);
      }
      addSection("Organisations In Sector", theme.palette.blue, orgsInSector.length > 0 ? orgsInSector : undefined);
    }

    if (sections.length === 0) return null;

    return (
      <>
        {sections.map((s, i) => (
          <Section key={i} title={s.title} color={s.color}>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {s.uris.map(u => (
                <RelLink key={u} uri={u} label={nodeLabel(u)} color={nodeColor(u)} onClick={selectNode} />
              ))}
            </div>
          </Section>
        ))}
      </>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden",
      borderTop: `1px solid ${theme.border.default}`,
    }}>
      {/* Mode toggle */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 16px",
        borderBottom: `1px solid ${theme.border.subtle}`,
        fontFamily: theme.font.mono, fontSize: sz(11),
      }}>
        {([["browse", "⊞ Browse"], ["pathfinder", "⇢ Pathfinder"], ["gtm", "🚀 GTM Advisor"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "5px 14px", borderRadius: 5, border: "none", cursor: "pointer",
              background: mode === m ? "rgba(255,255,255,0.08)" : "transparent",
              color: mode === m ? theme.text.primary : theme.text.faint,
              fontFamily: theme.font.mono, fontSize: sz(11),
              fontWeight: mode === m ? 600 : 400, transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "pathfinder" ? (
        <PathFinder
          nodes={data.nodes}
          abbreviations={data.abbreviations}
          adjacency={adjacency}
          onSelectNode={(uri) => { setSelectedUri(uri); setMode("browse"); }}
        />
      ) : mode === "gtm" ? (
        <GtmAdvisor
          nodes={data.nodes}
          abbreviations={data.abbreviations}
          descriptions={data.descriptions}
          jobTitles={data.jobTitles}
          orgCapabilities={data.orgCapabilities}
          orgSeeks={data.orgSeeks}
          orgListedOnFramework={data.orgListedOnFramework}
          orgOperatesFramework={data.orgOperatesFramework}
          orgProvidesAccess={data.orgProvidesAccess}
          orgPartners={data.orgPartners}
          orgFundedBy={data.orgFundedBy}
          orgLocation={data.orgLocation}
          orgSectors={data.orgSectors}
          orgSegments={data.orgSegments}
          orgTargets={data.orgTargets}
          personRoles={data.personRoles}
          personExpertise={data.personExpertise}
          roleOrg={data.roleOrg}
          onSelectNode={(uri) => { setSelectedUri(uri); setMode("browse"); }}
        />
      ) : (
      <div style={{
        display: "flex", flex: 1, overflow: "hidden",
      }}>
      {/* Left panel — entity list */}
      <div style={{
        width: 380, minWidth: 380, borderRight: `1px solid ${theme.border.default}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Stats bar */}
        <div style={{
          padding: "10px 16px", borderBottom: `1px solid ${theme.border.subtle}`,
          display: "flex", gap: 12, fontSize: sz(10), color: theme.text.faint,
          fontFamily: theme.font.mono,
        }}>
          <span><span style={{ color: theme.palette.blue }}>{stats.orgs}</span> orgs</span>
          <span><span style={{ color: theme.palette.amber }}>{stats.people}</span> people</span>
          <span><span style={{ color: theme.palette.emerald }}>{stats.caps}</span> capabilities</span>
          <span><span style={{ color: theme.palette.purple }}>{stats.procs}</span> procurement</span>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px 6px", borderBottom: `1px solid ${theme.border.subtle}` }}>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search entities..."
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 6, fontSize: sz(12),
              background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border.default}`,
              color: theme.text.primary, outline: "none",
              fontFamily: theme.font.sans,
            }}
          />
          {/* Category filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, marginBottom: 4 }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  padding: "3px 8px", borderRadius: 4, fontSize: sz(10), border: "none",
                  cursor: "pointer",
                  background: category === c.key ? `${c.color}22` : "transparent",
                  color: category === c.key ? c.color : theme.text.faint,
                  fontFamily: theme.font.mono,
                  transition: "all 0.15s",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entity list */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {groupedNodes.map(([kind, nodes]) => (
            <div key={kind} style={{ marginBottom: 12, padding: "0 12px" }}>
              <div style={{
                fontSize: sz(9), color: KIND_COLORS[kind] || theme.text.faint,
                fontFamily: theme.font.mono,
                textTransform: "uppercase", letterSpacing: "0.05em",
                marginBottom: 4, paddingBottom: 2,
                borderBottom: `1px solid ${(KIND_COLORS[kind] || theme.text.faint)}15`,
              }}>
                {KIND_ICONS[kind] || "●"} {kindLabel(kind)} ({nodes.length})
              </div>
              {nodes.map(node => {
                const isSelected = selectedUri === node.uri;
                const color = KIND_COLORS[node.kind] || theme.text.muted;
                const abbr = data.abbreviations.get(node.uri);
                return (
                  <div
                    key={node.uri}
                    onClick={() => selectNode(node.uri)}
                    style={{
                      padding: "5px 8px", borderRadius: 4, cursor: "pointer",
                      fontSize: sz(12), lineHeight: 1.3,
                      background: isSelected ? `${color}15` : "transparent",
                      color: isSelected ? color : theme.text.secondary,
                      borderLeft: isSelected ? `2px solid ${color}` : "2px solid transparent",
                      transition: "all 0.12s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ flexShrink: 0, width: 14, textAlign: "center", fontSize: sz(10) }}>
                      {KIND_ICONS[node.kind] || "●"}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {node.label}
                      {abbr && <span style={{ color: theme.text.faint, fontSize: sz(10) }}> ({abbr})</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {filteredNodes.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: theme.text.faint, fontSize: sz(12) }}>
              No entities match your search
            </div>
          )}
        </div>
      </div>

      {/* Right panel — detail */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {!selected ? (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            <div style={{ fontSize: sz(32), opacity: 0.3 }}>🔍</div>
            <div style={{ color: theme.text.faint, fontSize: sz(13), textAlign: "center", maxWidth: 320 }}>
              Select an entity from the list to explore the innovation ecosystem
            </div>
            <div style={{
              marginTop: 16, padding: 16, borderRadius: 8,
              background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border.subtle}`,
              fontSize: sz(11), color: theme.text.faint, maxWidth: 400, lineHeight: 1.6,
            }}>
              <div style={{ color: theme.text.secondary, marginBottom: 8, fontSize: sz(12), fontWeight: 600 }}>
                {stats.total} entities loaded
              </div>
              Explore organisations, people, capabilities, procurement routes and geographic clusters
              across the innovation ecosystem.
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: sz(20) }}>{KIND_ICONS[selected.kind] || "●"}</span>
                <div>
                  <div style={{ fontSize: sz(18), fontWeight: 600, color: theme.text.primary }}>
                    {selected.label}
                  </div>
                  <div style={{
                    fontSize: sz(10), color: KIND_COLORS[selected.kind] || theme.text.muted,
                    fontFamily: theme.font.mono, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {kindLabel(selected.kind)}
                    {data.abbreviations.get(selected.uri) && (
                      <span style={{ marginLeft: 8, color: theme.text.faint }}>
                        {data.abbreviations.get(selected.uri)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {data.descriptions.get(selected.uri) && (
                <div style={{
                  fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6,
                  padding: "12px 14px", borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${theme.border.subtle}`,
                }}>
                  {data.descriptions.get(selected.uri)}
                </div>
              )}
            </div>

            {/* Relationships */}
            {renderRelationships(selected.uri)}
          </div>
        )}
      </div>
    </div>
      )}
    </div>
  );
}
