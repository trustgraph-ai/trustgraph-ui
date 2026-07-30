import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTheme, StreamingResponse } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import { useInference } from "@trustgraph/react-state";
import type { IINode } from "../useInnovationData";

interface GtmAdvisorProps {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  descriptions: Map<string, string>;
  jobTitles: Map<string, string>;
  orgCapabilities: Map<string, string[]>;
  orgSeeks: Map<string, string[]>;
  orgListedOnFramework: Map<string, string[]>;
  orgOperatesFramework: Map<string, string[]>;
  orgProvidesAccess: Map<string, string[]>;
  orgPartners: Map<string, string[]>;
  orgFundedBy: Map<string, string[]>;
  orgLocation: Map<string, string[]>;
  orgSectors: Map<string, string[]>;
  orgSegments: Map<string, string[]>;
  orgTargets: Map<string, string[]>;
  personRoles: Map<string, string[]>;
  personExpertise: Map<string, string[]>;
  roleOrg: Map<string, string>;
  onSelectNode: (uri: string) => void;
}

interface GtmReport {
  entity: IINode;
  capabilities: IINode[];
  demandOrgs: { org: IINode; capability: IINode }[];
  competitors: { org: IINode; capability: IINode }[];
  procurementRoutes: { mechanism: IINode; via: IINode | null }[];
  potentialPrimes: IINode[];
  investors: IINode[];
  accelerators: IINode[];
  keyPeople: { person: IINode; title: string; org: IINode | null; capability: IINode | null }[];
  sectors: IINode[];
  segments: IINode[];
  locations: IINode[];
}

const ORG_KINDS = new Set([
  "Organisation", "GovernmentDepartment", "MilitaryCommand", "MilitaryUnit",
  "Agency", "InnovationHub", "DefenceCluster", "TradeAssociation",
  "PrimeContractor", "SME", "Startup", "Investor", "Accelerator",
  "ResearchOrganisation", "University", "AllianceBody",
]);

function EntityPicker({
  nodes,
  abbreviations,
  value,
  onChange,
  placeholder,
  filter,
}: {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  value: string | null;
  onChange: (uri: string | null) => void;
  placeholder: string;
  filter?: (node: IINode) => boolean;
}) {
  const { theme, sz } = useTheme();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const matches = useMemo(() => {
    if (!search) return [];
    const term = search.toLowerCase();
    const result: IINode[] = [];
    for (const node of nodes.values()) {
      if (result.length >= 20) break;
      if (filter && !filter(node)) continue;
      const abbr = abbreviations.get(node.uri)?.toLowerCase() || "";
      if (node.label.toLowerCase().includes(term) || abbr.includes(term)) {
        result.push(node);
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [search, nodes, abbreviations, filter]);

  const selected = value ? nodes.get(value) : null;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      {selected && !open ? (
        <div
          onClick={() => { setOpen(true); setSearch(""); }}
          style={{
            padding: "8px 12px", borderRadius: 6, fontSize: sz(13),
            background: "rgba(255,255,255,0.06)", border: `1px solid ${theme.border.medium}`,
            color: theme.text.primary, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>{selected.label}</span>
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setSearch(""); }}
            style={{ color: theme.text.faint, cursor: "pointer", fontSize: sz(11), marginLeft: 8 }}
          >✕</span>
        </div>
      ) : (
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={open}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: sz(13),
            background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border.default}`,
            color: theme.text.primary, outline: "none",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        />
      )}
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          marginTop: 4, borderRadius: 6, overflow: "hidden",
          background: "#15151F", border: `1px solid ${theme.border.medium}`,
          maxHeight: 240, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {matches.map(node => (
            <div
              key={node.uri}
              onClick={() => { onChange(node.uri); setOpen(false); setSearch(""); }}
              style={{
                padding: "6px 12px", cursor: "pointer", fontSize: sz(12),
                color: theme.text.secondary, borderBottom: `1px solid ${theme.border.subtle}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: theme.text.primary }}>{node.label}</span>
              <span style={{ color: theme.text.faint, fontSize: sz(10), marginLeft: 8 }}>
                {node.kind.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildKindColors(theme: Theme): Record<string, string> {
  return {
    GovernmentDepartment: theme.palette.blue, MilitaryCommand: "#5B8DEF",
    Agency: theme.palette.cyan, InnovationHub: theme.palette.emerald,
    PrimeContractor: theme.palette.orange, SME: theme.palette.amber,
    Startup: "#FCD34D", Investor: theme.palette.pink,
    Accelerator: theme.palette.emerald, ResearchOrganisation: theme.palette.purple,
    University: "#C4B5FD", Person: theme.palette.amber,
    CapabilityDomain: theme.palette.emerald, Framework: theme.palette.purple,
    InnovationChallenge: "#C4B5FD", CustomerSegment: theme.palette.rose,
    Nation: theme.palette.cyan, Region: "#67E8F9",
    IndustrySector: theme.palette.orange,
  };
}

function Section({ title, color, count, children }: {
  title: string; color: string; count: number; children: React.ReactNode;
}) {
  const { theme, sz } = useTheme();
  const [open, setOpen] = useState(true);
  if (count === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          marginBottom: open ? 10 : 0, userSelect: "none",
        }}
      >
        <span style={{
          display: "inline-block", transition: "transform 0.15s",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          fontSize: sz(8), color: theme.text.faint,
        }}>▶</span>
        <span style={{
          fontSize: sz(11), fontWeight: 600, color,
          fontFamily: "'IBM Plex Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {title}
        </span>
        <span style={{
          fontSize: sz(9), color: theme.text.hint, background: "rgba(255,255,255,0.04)",
          padding: "1px 6px", borderRadius: 3,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {count}
        </span>
      </div>
      {open && children}
    </div>
  );
}

function EntityChip({ node, color, subtitle, onClick, kindColorFn }: {
  node: IINode; color?: string; subtitle?: string; onClick: () => void;
  kindColorFn: (kind: string) => string;
}) {
  const { theme, sz } = useTheme();
  const c = color || kindColorFn(node.kind);
  return (
    <div
      onClick={onClick}
      style={{
        display: "inline-flex", flexDirection: "column", padding: "5px 10px",
        borderRadius: 5, cursor: "pointer", marginRight: 6, marginBottom: 6,
        background: `${c}11`, border: `1px solid ${c}33`,
        transition: "all 0.12s", maxWidth: 240,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${c}22`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${c}11`)}
    >
      <span style={{ fontSize: sz(11), color: c, fontWeight: 500 }}>{node.label}</span>
      {subtitle && (
        <span style={{ fontSize: sz(9), color: theme.text.hint, fontFamily: "'IBM Plex Mono', monospace" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

function buildReport(
  entityUri: string,
  props: GtmAdvisorProps,
): GtmReport | null {
  const entity = props.nodes.get(entityUri);
  if (!entity) return null;

  const isOrg = ORG_KINDS.has(entity.kind);
  const isCap = entity.kind === "CapabilityDomain";

  const capabilities: IINode[] = [];
  const demandOrgs: GtmReport["demandOrgs"] = [];
  const competitors: GtmReport["competitors"] = [];
  const procurementRoutes: GtmReport["procurementRoutes"] = [];
  const potentialPrimes: IINode[] = [];
  const investors: IINode[] = [];
  const accelerators: IINode[] = [];
  const keyPeople: GtmReport["keyPeople"] = [];
  const sectors: IINode[] = [];
  const segments: IINode[] = [];
  const locations: IINode[] = [];

  const seenOrgs = new Set<string>();
  const seenPeople = new Set<string>();
  const seenProcurement = new Set<string>();

  const capUris = new Set<string>();

  if (isOrg) {
    const caps = props.orgCapabilities.get(entityUri) || [];
    for (const c of caps) {
      const node = props.nodes.get(c);
      if (node) { capabilities.push(node); capUris.add(c); }
    }

    for (const loc of props.orgLocation.get(entityUri) || []) {
      const n = props.nodes.get(loc);
      if (n) locations.push(n);
    }
    for (const s of props.orgSectors.get(entityUri) || []) {
      const n = props.nodes.get(s);
      if (n) sectors.push(n);
    }
    for (const s of props.orgSegments.get(entityUri) || []) {
      const n = props.nodes.get(s);
      if (n) segments.push(n);
    }
    for (const s of props.orgTargets.get(entityUri) || []) {
      const n = props.nodes.get(s);
      if (n && !segments.find(x => x.uri === n.uri)) segments.push(n);
    }
  } else if (isCap) {
    capUris.add(entityUri);
    capabilities.push(entity);
  }

  // Demand: orgs that seek these capabilities
  for (const [orgUri, seekCaps] of props.orgSeeks) {
    if (orgUri === entityUri) continue;
    for (const c of seekCaps) {
      if (capUris.has(c)) {
        const org = props.nodes.get(orgUri);
        const cap = props.nodes.get(c);
        if (org && cap && !seenOrgs.has(orgUri + ":demand")) {
          demandOrgs.push({ org, capability: cap });
          seenOrgs.add(orgUri + ":demand");
        }
      }
    }
  }

  // Also: orgs that provide access to sought capabilities (customer orgs)
  for (const [orgUri, accessTo] of props.orgProvidesAccess) {
    if (orgUri === entityUri) continue;
    for (const target of accessTo) {
      if (capUris.has(target) || seenOrgs.has(target + ":demand")) {
        const org = props.nodes.get(orgUri);
        if (org && !seenOrgs.has(orgUri + ":demand")) {
          const cap = props.nodes.get(target);
          if (cap) demandOrgs.push({ org, capability: cap });
          seenOrgs.add(orgUri + ":demand");
        }
      }
    }
  }

  // Competitors: other orgs delivering same capabilities
  for (const [orgUri, orgCaps] of props.orgCapabilities) {
    if (orgUri === entityUri) continue;
    for (const c of orgCaps) {
      if (capUris.has(c)) {
        const org = props.nodes.get(orgUri);
        const cap = props.nodes.get(c);
        if (org && cap && !seenOrgs.has(orgUri + ":comp")) {
          competitors.push({ org, capability: cap });
          seenOrgs.add(orgUri + ":comp");
        }
      }
    }
  }

  // Procurement routes: frameworks that demand orgs operate or that list the entity
  const demandOrgUris = new Set(demandOrgs.map(d => d.org.uri));
  for (const [orgUri, frameworks] of props.orgOperatesFramework) {
    if (demandOrgUris.has(orgUri)) {
      for (const fw of frameworks) {
        if (!seenProcurement.has(fw)) {
          const fwNode = props.nodes.get(fw);
          const viaNode = props.nodes.get(orgUri);
          if (fwNode) { procurementRoutes.push({ mechanism: fwNode, via: viaNode || null }); seenProcurement.add(fw); }
        }
      }
    }
  }
  // Frameworks entity is listed on
  for (const [orgUri, frameworks] of props.orgListedOnFramework) {
    if (orgUri === entityUri) {
      for (const fw of frameworks) {
        if (!seenProcurement.has(fw)) {
          const fwNode = props.nodes.get(fw);
          if (fwNode) { procurementRoutes.push({ mechanism: fwNode, via: null }); seenProcurement.add(fw); }
        }
      }
    }
  }
  // Frameworks connected to demand orgs via providesAccess
  for (const [orgUri, accessTo] of props.orgProvidesAccess) {
    for (const target of accessTo) {
      if (demandOrgUris.has(orgUri) || demandOrgUris.has(target)) {
        const fwNode = props.nodes.get(target);
        if (fwNode && (fwNode.kind === "Framework" || fwNode.kind === "InnovationChallenge" ||
            fwNode.kind === "CoCreationProgramme" || fwNode.kind === "GrantFunding") && !seenProcurement.has(target)) {
          const via = props.nodes.get(orgUri);
          procurementRoutes.push({ mechanism: fwNode, via: via || null });
          seenProcurement.add(target);
        }
      }
    }
  }

  // Potential primes: large orgs that are partners or that deliver overlapping capabilities
  const primeKinds = new Set(["PrimeContractor"]);
  for (const [orgUri, partners] of props.orgPartners) {
    if (orgUri === entityUri) {
      for (const p of partners) {
        const n = props.nodes.get(p);
        if (n && primeKinds.has(n.kind)) potentialPrimes.push(n);
      }
    }
    if (partners.includes(entityUri)) {
      const n = props.nodes.get(orgUri);
      if (n && primeKinds.has(n.kind)) potentialPrimes.push(n);
    }
  }
  // Primes delivering overlapping capabilities
  for (const c of competitors) {
    if (primeKinds.has(c.org.kind) && !potentialPrimes.find(p => p.uri === c.org.uri)) {
      potentialPrimes.push(c.org);
    }
  }
  // Primes operating relevant frameworks
  for (const route of procurementRoutes) {
    if (route.via && primeKinds.has(route.via.kind) && !potentialPrimes.find(p => p.uri === route.via!.uri)) {
      potentialPrimes.push(route.via);
    }
  }

  // Investors and Accelerators
  for (const [orgUri, funders] of props.orgFundedBy) {
    if (orgUri === entityUri) {
      for (const f of funders) {
        const n = props.nodes.get(f);
        if (n) {
          if (n.kind === "Investor") investors.push(n);
          else if (n.kind === "Accelerator") accelerators.push(n);
        }
      }
    }
  }
  // Also find investors/accelerators connected to capability space
  for (const [orgUri, orgCaps] of props.orgCapabilities) {
    const n = props.nodes.get(orgUri);
    if (!n) continue;
    if (n.kind === "Investor" && !investors.find(x => x.uri === orgUri)) {
      for (const c of orgCaps) {
        if (capUris.has(c)) { investors.push(n); break; }
      }
    }
    if (n.kind === "Accelerator" && !accelerators.find(x => x.uri === orgUri)) {
      for (const c of orgCaps) {
        if (capUris.has(c)) { accelerators.push(n); break; }
      }
    }
  }

  // Key people: expertise in relevant capabilities or roles at demand/competitor orgs
  const relevantOrgUris = new Set([
    ...demandOrgs.map(d => d.org.uri),
    ...competitors.map(c => c.org.uri),
    ...potentialPrimes.map(p => p.uri),
  ]);
  for (const [personUri, caps] of props.personExpertise) {
    for (const c of caps) {
      if (capUris.has(c) && !seenPeople.has(personUri)) {
        const person = props.nodes.get(personUri);
        const cap = props.nodes.get(c);
        if (person) {
          const title = props.jobTitles.get(personUri) || "";
          const roles = props.personRoles.get(personUri) || [];
          let org: IINode | null = null;
          for (const r of roles) {
            const orgUri = props.roleOrg.get(r);
            if (orgUri) { org = props.nodes.get(orgUri) || null; break; }
          }
          keyPeople.push({ person, title, org, capability: cap || null });
          seenPeople.add(personUri);
        }
      }
    }
  }
  for (const [personUri, roles] of props.personRoles) {
    if (seenPeople.has(personUri)) continue;
    for (const r of roles) {
      const orgUri = props.roleOrg.get(r);
      if (orgUri && relevantOrgUris.has(orgUri)) {
        const person = props.nodes.get(personUri);
        const org = props.nodes.get(orgUri);
        if (person) {
          const title = props.jobTitles.get(personUri) || "";
          keyPeople.push({ person, title, org: org || null, capability: null });
          seenPeople.add(personUri);
          break;
        }
      }
    }
  }

  return {
    entity, capabilities, demandOrgs, competitors, procurementRoutes,
    potentialPrimes, investors, accelerators, keyPeople,
    sectors, segments, locations,
  };
}

const GTM_SYSTEM_PROMPT = `You are an expert Go-To-Market strategy advisor for innovation ecosystems. You help founders and startups navigate complex procurement landscapes, identify market opportunities, and build actionable GTM plans.

Given structured intelligence about an entity's position in an ecosystem (demand signals, procurement routes, competitive landscape, key contacts, partners, investors), synthesise a concise, actionable GTM strategy report.

Structure your response with clear sections using markdown headers. Be specific and actionable — reference the actual entities, people, and routes provided. Prioritise the most promising opportunities. Keep the tone direct and practical, like advice from an experienced advisor. Do not invent information beyond what is provided.`;

function buildGtmPrompt(report: GtmReport, descriptions: Map<string, string>): string {
  const lines: string[] = [];
  const desc = descriptions.get(report.entity.uri);

  lines.push(`## Entity: ${report.entity.label} (${report.entity.kind})`);
  if (desc) lines.push(`Description: ${desc}`);

  if (report.capabilities.length > 0) {
    lines.push(`\n## Capabilities Delivered`);
    for (const c of report.capabilities) {
      const cd = descriptions.get(c.uri);
      lines.push(`- ${c.label}${cd ? `: ${cd}` : ""}`);
    }
  }

  if (report.demandOrgs.length > 0) {
    lines.push(`\n## Demand — Organisations Seeking These Capabilities`);
    for (const { org, capability } of report.demandOrgs) {
      lines.push(`- ${org.label} (${org.kind}) — seeks ${capability.label}`);
    }
  }

  if (report.procurementRoutes.length > 0) {
    lines.push(`\n## Procurement Routes`);
    for (const { mechanism, via } of report.procurementRoutes) {
      lines.push(`- ${mechanism.label} (${mechanism.kind})${via ? ` — via ${via.label}` : ""}`);
    }
  }

  if (report.potentialPrimes.length > 0) {
    lines.push(`\n## Prime Contractors (Potential Partners)`);
    for (const p of report.potentialPrimes) lines.push(`- ${p.label}`);
  }

  if (report.competitors.length > 0) {
    lines.push(`\n## Competitive Landscape`);
    for (const { org, capability } of report.competitors) {
      lines.push(`- ${org.label} (${org.kind}) — delivers ${capability.label}`);
    }
  }

  if (report.keyPeople.length > 0) {
    lines.push(`\n## Key People`);
    for (const { person, title, org, capability } of report.keyPeople) {
      const parts = [title, org?.label, capability ? `expertise: ${capability.label}` : ""].filter(Boolean);
      lines.push(`- ${person.label}${parts.length > 0 ? ` — ${parts.join(", ")}` : ""}`);
    }
  }

  if (report.investors.length > 0) {
    lines.push(`\n## Investors`);
    for (const inv of report.investors) lines.push(`- ${inv.label}`);
  }

  if (report.accelerators.length > 0) {
    lines.push(`\n## Accelerators & Incubators`);
    for (const acc of report.accelerators) lines.push(`- ${acc.label}`);
  }

  if (report.sectors.length > 0) {
    lines.push(`\n## Industry Sectors`);
    for (const s of report.sectors) lines.push(`- ${s.label}`);
  }

  if (report.segments.length > 0) {
    lines.push(`\n## Customer Segments`);
    for (const s of report.segments) lines.push(`- ${s.label}`);
  }

  if (report.locations.length > 0) {
    lines.push(`\n## Geographic Presence`);
    for (const loc of report.locations) lines.push(`- ${loc.label}`);
  }

  lines.push(`\n---\nBased on the above ecosystem intelligence, provide a Go-To-Market strategy report for ${report.entity.label}. Include: (1) Executive summary, (2) Priority target customers and why, (3) Recommended procurement approach, (4) Partnership strategy, (5) Competitive positioning, (6) Key contacts to engage, (7) Recommended next steps.`);

  return lines.join("\n");
}

export function GtmAdvisor(props: GtmAdvisorProps) {
  const { theme, sz } = useTheme();
  const { nodes, abbreviations, descriptions, onSelectNode } = props;
  const [entityUri, setEntityUri] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamRef = useRef("");

  const inference = useInference();

  const KIND_COLORS = useMemo(() => buildKindColors(theme), [theme]);

  const kindColor = useCallback((kind: string): string => {
    return KIND_COLORS[kind] || theme.text.muted;
  }, [KIND_COLORS, theme.text.muted]);

  const orgFilter = useCallback((node: IINode) =>
    ORG_KINDS.has(node.kind) || node.kind === "CapabilityDomain",
  []);

  const report = useMemo(() => {
    if (!entityUri) return null;
    return buildReport(entityUri, props);
  }, [entityUri, props]);

  const entity = entityUri ? nodes.get(entityUri) : null;

  const handleGenerate = useCallback(async () => {
    if (!report) return;
    setIsStreaming(true);
    setStreamError(null);
    setStreamingText("");
    streamRef.current = "";

    const prompt = buildGtmPrompt(report, descriptions);

    try {
      await inference.textCompletion({
        systemPrompt: GTM_SYSTEM_PROMPT,
        input: prompt,
        callbacks: {
          onChunk: (chunk: string, complete: boolean) => {
            streamRef.current += chunk;
            setStreamingText(streamRef.current);
            if (complete) setIsStreaming(false);
          },
          onError: (error: string) => {
            setStreamError(error);
            setIsStreaming(false);
          },
        },
      });
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : String(err));
      setIsStreaming(false);
    }
  }, [report, descriptions, inference]);

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: sz(16), fontWeight: 600, color: theme.text.primary, marginBottom: 6,
          }}>
            Go-To-Market Advisor
          </div>
          <div style={{ fontSize: sz(12), color: theme.text.faint, lineHeight: 1.5 }}>
            Select your organisation or capability area to generate a GTM strategy map.
            Discover who needs what you offer, how to reach them, and who to partner with.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: sz(9), color: theme.palette.emerald, fontFamily: "'IBM Plex Mono', monospace",
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
          }}>Your organisation or capability</div>
          <EntityPicker
            nodes={nodes}
            abbreviations={abbreviations}
            value={entityUri}
            onChange={setEntityUri}
            placeholder="Search for your startup, company, or capability area..."
            filter={orgFilter}
          />
        </div>

        {entity && descriptions.get(entity.uri) && (
          <div style={{
            padding: 12, marginBottom: 20, borderRadius: 8,
            background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border.subtle}`,
            fontSize: sz(12), color: theme.text.secondary, lineHeight: 1.6,
          }}>
            {descriptions.get(entity.uri)}
          </div>
        )}

        {report && (
          <div>
            {/* Capabilities */}
            {report.capabilities.length > 1 && (
              <Section title="Your Capabilities" color={theme.palette.emerald} count={report.capabilities.length}>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {report.capabilities.map(cap => (
                    <EntityChip key={cap.uri} node={cap} onClick={() => onSelectNode(cap.uri)} kindColorFn={kindColor} />
                  ))}
                </div>
              </Section>
            )}

            {/* Demand */}
            <Section title="Demand — Who Needs This" color={theme.palette.rose} count={report.demandOrgs.length}>
              {report.demandOrgs.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {report.demandOrgs.map(({ org, capability }) => (
                    <EntityChip
                      key={org.uri}
                      node={org}
                      subtitle={`seeks ${capability.label}`}
                      onClick={() => onSelectNode(org.uri)}
                      kindColorFn={kindColor}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: sz(11), color: theme.text.hint, padding: "4px 0" }}>
                  No organisations seeking these capabilities found in the dataset
                </div>
              )}
            </Section>

            {/* Procurement Routes */}
            <Section title="Procurement Routes" color={theme.palette.purple} count={report.procurementRoutes.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.procurementRoutes.map(({ mechanism, via }) => (
                  <EntityChip
                    key={mechanism.uri}
                    node={mechanism}
                    color={theme.palette.purple}
                    subtitle={via ? `via ${via.label}` : "direct listing"}
                    onClick={() => onSelectNode(mechanism.uri)}
                    kindColorFn={kindColor}
                  />
                ))}
              </div>
            </Section>

            {/* Potential Primes */}
            <Section title="Prime Contractors to Partner With" color={theme.palette.orange} count={report.potentialPrimes.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.potentialPrimes.map(prime => (
                  <EntityChip key={prime.uri} node={prime} onClick={() => onSelectNode(prime.uri)} kindColorFn={kindColor} />
                ))}
              </div>
            </Section>

            {/* Competitors */}
            <Section title="Competitive Landscape" color={theme.palette.amber} count={report.competitors.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.competitors.map(({ org, capability }) => (
                  <EntityChip
                    key={org.uri}
                    node={org}
                    color={theme.palette.amber}
                    subtitle={`delivers ${capability.label}`}
                    onClick={() => onSelectNode(org.uri)}
                    kindColorFn={kindColor}
                  />
                ))}
              </div>
            </Section>

            {/* Key People */}
            <Section title="Key People" color={theme.palette.amber} count={report.keyPeople.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.keyPeople.map(({ person, title, org, capability }) => {
                  const sub = [title, org?.label, capability ? `expertise: ${capability.label}` : ""]
                    .filter(Boolean).join(" · ");
                  return (
                    <EntityChip
                      key={person.uri}
                      node={person}
                      color={theme.palette.amber}
                      subtitle={sub}
                      onClick={() => onSelectNode(person.uri)}
                      kindColorFn={kindColor}
                    />
                  );
                })}
              </div>
            </Section>

            {/* Investors & Accelerators */}
            <Section title="Investors" color={theme.palette.pink} count={report.investors.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.investors.map(inv => (
                  <EntityChip key={inv.uri} node={inv} onClick={() => onSelectNode(inv.uri)} kindColorFn={kindColor} />
                ))}
              </div>
            </Section>

            <Section title="Accelerators & Incubators" color={theme.palette.emerald} count={report.accelerators.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.accelerators.map(acc => (
                  <EntityChip key={acc.uri} node={acc} onClick={() => onSelectNode(acc.uri)} kindColorFn={kindColor} />
                ))}
              </div>
            </Section>

            {/* Sectors & Segments */}
            {(report.sectors.length > 0 || report.segments.length > 0) && (
              <>
                <Section title="Industry Sectors" color={theme.palette.orange} count={report.sectors.length}>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {report.sectors.map(s => (
                      <EntityChip key={s.uri} node={s} onClick={() => onSelectNode(s.uri)} kindColorFn={kindColor} />
                    ))}
                  </div>
                </Section>
                <Section title="Customer Segments" color={theme.palette.rose} count={report.segments.length}>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {report.segments.map(s => (
                      <EntityChip key={s.uri} node={s} onClick={() => onSelectNode(s.uri)} kindColorFn={kindColor} />
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Locations */}
            <Section title="Geographic Presence" color={theme.palette.cyan} count={report.locations.length}>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {report.locations.map(loc => (
                  <EntityChip key={loc.uri} node={loc} onClick={() => onSelectNode(loc.uri)} kindColorFn={kindColor} />
                ))}
              </div>
            </Section>

            {/* Empty state */}
            {report.demandOrgs.length === 0 && report.competitors.length === 0 &&
             report.procurementRoutes.length === 0 && report.keyPeople.length === 0 && (
              <div style={{
                padding: 32, textAlign: "center", borderRadius: 8,
                background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border.subtle}`,
              }}>
                <div style={{ fontSize: sz(24), opacity: 0.3, marginBottom: 8 }}>∅</div>
                <div style={{ color: theme.text.faint, fontSize: sz(13) }}>
                  Limited GTM intelligence available for this entity
                </div>
                <div style={{ color: theme.text.hint, fontSize: sz(11), marginTop: 4 }}>
                  Try selecting a different organisation or capability area with more connections
                </div>
              </div>
            )}

            {/* Generate strategy button */}
            {(report.demandOrgs.length > 0 || report.competitors.length > 0 ||
              report.procurementRoutes.length > 0 || report.keyPeople.length > 0) && (
              <div style={{
                marginTop: 8, marginBottom: 16, padding: 16, borderRadius: 8,
                background: `${theme.palette.emerald}08`,
                border: `1px solid ${theme.palette.emerald}22`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{
                    fontSize: sz(12), fontWeight: 600, color: theme.palette.emerald, marginBottom: 2,
                  }}>
                    Generate Strategy Report
                  </div>
                  <div style={{ fontSize: sz(11), color: theme.text.hint }}>
                    Use AI to synthesise the above intelligence into an actionable GTM plan
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isStreaming}
                  style={{
                    padding: "8px 20px", borderRadius: 6, cursor: "pointer",
                    background: isStreaming ? "rgba(255,255,255,0.04)" : `${theme.palette.emerald}22`,
                    color: isStreaming ? theme.text.faint : theme.palette.emerald,
                    fontSize: sz(12), fontWeight: 600, border: `1px solid ${theme.palette.emerald}44`,
                    fontFamily: "'IBM Plex Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {isStreaming ? "Generating..." : "Generate"}
                </button>
              </div>
            )}

            {/* Streaming AI response */}
            {(streamingText || isStreaming || streamError) && (
              <div style={{ marginTop: 4 }}>
                <StreamingResponse
                  text={streamingText}
                  isStreaming={isStreaming}
                  error={streamError}
                />
              </div>
            )}
          </div>
        )}

        {!entityUri && (
          <div style={{
            padding: 48, textAlign: "center", borderRadius: 8,
            background: "rgba(255,255,255,0.02)", border: `1px solid ${theme.border.subtle}`,
          }}>
            <div style={{ fontSize: sz(32), opacity: 0.2, marginBottom: 12 }}>🚀</div>
            <div style={{ color: theme.text.faint, fontSize: sz(13), marginBottom: 8 }}>
              Select your organisation or capability area above
            </div>
            <div style={{ color: theme.text.hint, fontSize: sz(11), lineHeight: 1.6 }}>
              The GTM advisor will map out demand signals, procurement routes,<br />
              competitive landscape, key contacts, and potential partners
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
