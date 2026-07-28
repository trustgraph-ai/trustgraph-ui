import { useState, useEffect, useMemo } from "react";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const II = "http://pivotlabs.vc/ontology/innovation-intelligence/";

function q(body: string): string {
  return `PREFIX ii: <${II}>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n${body}`;
}

export interface IINode {
  uri: string;
  label: string;
  kind: string;
}

export type IIRelation = [string, string];

export function useInnovationData() {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [nodes, setNodes] = useState<Map<string, IINode>>(new Map());
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());
  const [abbreviations, setAbbreviations] = useState<Map<string, string>>(new Map());

  const [parentOrgRel, setParentOrgRel] = useState<IIRelation[]>([]);
  const [memberOfRel, setMemberOfRel] = useState<IIRelation[]>([]);
  const [partneredWithRel, setPartneredWithRel] = useState<IIRelation[]>([]);
  const [deliversCapRel, setDeliversCapRel] = useState<IIRelation[]>([]);
  const [seeksCapRel, setSeeksCapRel] = useState<IIRelation[]>([]);
  const [targetsSegRel, setTargetsSegRel] = useState<IIRelation[]>([]);
  const [operatesFrameworkRel, setOperatesFrameworkRel] = useState<IIRelation[]>([]);
  const [listedOnFrameworkRel, setListedOnFrameworkRel] = useState<IIRelation[]>([]);
  const [providesAccessRel, setProvidesAccessRel] = useState<IIRelation[]>([]);
  const [holdsRoleRel, setHoldsRoleRel] = useState<IIRelation[]>([]);
  const [roleAtOrgRel, setRoleAtOrgRel] = useState<IIRelation[]>([]);
  const [hasExpertiseRel, setHasExpertiseRel] = useState<IIRelation[]>([]);
  const [broaderDomainRel, setBroaderDomainRel] = useState<IIRelation[]>([]);
  const [locatedInRel, setLocatedInRel] = useState<IIRelation[]>([]);
  const [fundedByRel, setFundedByRel] = useState<IIRelation[]>([]);
  const [operatesInSectorRel, setOperatesInSectorRel] = useState<IIRelation[]>([]);
  const [belongsToSegmentRel, setBelongsToSegmentRel] = useState<IIRelation[]>([]);
  const [hasMemberRel, setHasMemberRel] = useState<IIRelation[]>([]);
  const [withinNationRel, setWithinNationRel] = useState<IIRelation[]>([]);
  const [geoScopeRel, setGeoScopeRel] = useState<IIRelation[]>([]);

  const [jobTitles, setJobTitles] = useState<Map<string, string>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isSocketReady) return;
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const orgTypes = [
          "Organisation", "GovernmentDepartment", "MilitaryCommand", "MilitaryUnit",
          "Agency", "InnovationHub", "DefenceCluster", "TradeAssociation",
          "PrimeContractor", "SME", "Startup", "Investor", "Accelerator",
          "ResearchOrganisation", "University", "AllianceBody",
        ];

        const procTypes = [
          "ProcurementMechanism", "Framework", "InnovationChallenge",
          "DirectAward", "CoCreationProgramme", "GrantFunding",
        ];

        const geoTypes = [
          "GeopoliticalEntity", "Nation", "PoliticalBloc", "MilitaryAlliance",
          "IntelligencePartnership",
        ];

        const areaTypes = [
          "GeographicArea", "Region", "MilitaryInstallation", "TechnologyCluster",
        ];

        const allTypeQueries = [
          ...orgTypes.map(t => ({ type: t, query: q(`SELECT ?e ?label WHERE { ?e a ii:${t} ; rdfs:label ?label . }`) })),
          { type: "Person", query: q(`SELECT ?e ?label WHERE { ?e a ii:Person ; rdfs:label ?label . }`) },
          { type: "Role", query: q(`SELECT ?e ?label WHERE { ?e a ii:Role ; rdfs:label ?label . }`) },
          { type: "CapabilityDomain", query: q(`SELECT ?e ?label WHERE { ?e a ii:CapabilityDomain ; rdfs:label ?label . }`) },
          { type: "IndustrySector", query: q(`SELECT ?e ?label WHERE { ?e a ii:IndustrySector ; rdfs:label ?label . }`) },
          { type: "CustomerSegment", query: q(`SELECT ?e ?label WHERE { ?e a ii:CustomerSegment ; rdfs:label ?label . }`) },
          ...procTypes.map(t => ({ type: t, query: q(`SELECT ?e ?label WHERE { ?e a ii:${t} ; rdfs:label ?label . }`) })),
          ...geoTypes.map(t => ({ type: t, query: q(`SELECT ?e ?label WHERE { ?e a ii:${t} ; rdfs:label ?label . }`) })),
          ...areaTypes.map(t => ({ type: t, query: q(`SELECT ?e ?label WHERE { ?e a ii:${t} ; rdfs:label ?label . }`) })),
        ];

        const relQueries = [
          { key: "parentOrg", query: q(`SELECT ?c ?p WHERE { ?c ii:hasParentOrganisation ?p . }`) },
          { key: "memberOf", query: q(`SELECT ?a ?b WHERE { ?a ii:memberOf ?b . }`) },
          { key: "partneredWith", query: q(`SELECT ?a ?b WHERE { ?a ii:partneredWith ?b . }`) },
          { key: "deliversCap", query: q(`SELECT ?o ?c WHERE { ?o ii:deliversCapabilityIn ?c . }`) },
          { key: "seeksCap", query: q(`SELECT ?o ?c WHERE { ?o ii:seeksCapabilityIn ?c . }`) },
          { key: "targetsSeg", query: q(`SELECT ?o ?s WHERE { ?o ii:targetsSegment ?s . }`) },
          { key: "operatesFramework", query: q(`SELECT ?o ?f WHERE { ?o ii:operatesFramework ?f . }`) },
          { key: "listedOnFramework", query: q(`SELECT ?o ?f WHERE { ?o ii:listedOnFramework ?f . }`) },
          { key: "providesAccess", query: q(`SELECT ?a ?b WHERE { ?a ii:providesAccessTo ?b . }`) },
          { key: "holdsRole", query: q(`SELECT ?p ?r WHERE { ?p ii:holdsRole ?r . }`) },
          { key: "roleAtOrg", query: q(`SELECT ?r ?o WHERE { ?r ii:roleAtOrganisation ?o . }`) },
          { key: "hasExpertise", query: q(`SELECT ?p ?c WHERE { ?p ii:hasExpertiseIn ?c . }`) },
          { key: "broaderDomain", query: q(`SELECT ?c ?b WHERE { ?c ii:hasBroaderDomain ?b . }`) },
          { key: "locatedIn", query: q(`SELECT ?e ?g WHERE { ?e ii:locatedIn ?g . }`) },
          { key: "fundedBy", query: q(`SELECT ?a ?b WHERE { ?a ii:fundedBy ?b . }`) },
          { key: "operatesInSector", query: q(`SELECT ?o ?s WHERE { ?o ii:operatesInSector ?s . }`) },
          { key: "belongsToSegment", query: q(`SELECT ?o ?s WHERE { ?o ii:belongsToSegment ?s . }`) },
          { key: "hasMember", query: q(`SELECT ?g ?n WHERE { ?g ii:hasMember ?n . }`) },
          { key: "withinNation", query: q(`SELECT ?a ?n WHERE { ?a ii:withinNation ?n . }`) },
          { key: "geoScope", query: q(`SELECT ?s ?g WHERE { ?s ii:hasGeopoliticalScope ?g . }`) },
        ];

        const propQueries = [
          { key: "iiDesc", query: q(`SELECT ?e ?v WHERE { ?e ii:description ?v . }`) },
          { key: "rdfsComment", query: q(`PREFIX rdfs2: <http://www.w3.org/2000/01/rdf-schema#>\nSELECT ?e ?v WHERE { ?e rdfs2:comment ?v . }`) },
          { key: "skosDefn", query: q(`PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\nSELECT ?e ?v WHERE { ?e skos:definition ?v . }`) },
          { key: "abbr", query: q(`SELECT ?e ?v WHERE { ?e ii:abbreviation ?v . }`) },
          { key: "jobTitle", query: q(`SELECT ?e ?v WHERE { ?e ii:jobTitle ?v . }`) },
        ];

        const [typeResults, relResults, propResults] = await Promise.all([
          Promise.all(allTypeQueries.map(tq => api.sparqlQuery(tq.query, collection))),
          Promise.all(relQueries.map(rq => api.sparqlQuery(rq.query, collection))),
          Promise.all(propQueries.map(pq => api.sparqlQuery(pq.query, collection))),
        ]);

        if (cancelled) return;

        const nodeMap = new Map<string, IINode>();
        for (let i = 0; i < allTypeQueries.length; i++) {
          const kind = allTypeQueries[i].type;
          for (const r of typeResults[i].rows) {
            if (r.e && !nodeMap.has(r.e)) {
              nodeMap.set(r.e, { uri: r.e, label: r.label || r.e, kind });
            }
          }
        }
        setNodes(nodeMap);

        const setRelFromResults = (idx: number, setter: (v: IIRelation[]) => void, k1: string, k2: string) => {
          setter(relResults[idx].rows.map(r => [r[k1], r[k2]]));
        };

        setRelFromResults(0, setParentOrgRel, "c", "p");
        setRelFromResults(1, setMemberOfRel, "a", "b");
        setRelFromResults(2, setPartneredWithRel, "a", "b");
        setRelFromResults(3, setDeliversCapRel, "o", "c");
        setRelFromResults(4, setSeeksCapRel, "o", "c");
        setRelFromResults(5, setTargetsSegRel, "o", "s");
        setRelFromResults(6, setOperatesFrameworkRel, "o", "f");
        setRelFromResults(7, setListedOnFrameworkRel, "o", "f");
        setRelFromResults(8, setProvidesAccessRel, "a", "b");
        setRelFromResults(9, setHoldsRoleRel, "p", "r");
        setRelFromResults(10, setRoleAtOrgRel, "r", "o");
        setRelFromResults(11, setHasExpertiseRel, "p", "c");
        setRelFromResults(12, setBroaderDomainRel, "c", "b");
        setRelFromResults(13, setLocatedInRel, "e", "g");
        setRelFromResults(14, setFundedByRel, "a", "b");
        setRelFromResults(15, setOperatesInSectorRel, "o", "s");
        setRelFromResults(16, setBelongsToSegmentRel, "o", "s");
        setRelFromResults(17, setHasMemberRel, "g", "n");
        setRelFromResults(18, setWithinNationRel, "a", "n");
        setRelFromResults(19, setGeoScopeRel, "s", "g");

        const descMap = new Map<string, string>();
        // Merge descriptions from ii:description, rdfs:comment, and skos:definition
        for (const r of propResults[0].rows) if (r.e && r.v) descMap.set(r.e, r.v);
        for (const r of propResults[1].rows) if (r.e && r.v && !descMap.has(r.e)) descMap.set(r.e, r.v);
        for (const r of propResults[2].rows) if (r.e && r.v && !descMap.has(r.e)) descMap.set(r.e, r.v);
        setDescriptions(descMap);

        const abbrMap = new Map<string, string>();
        for (const r of propResults[3].rows) if (r.e && r.v) abbrMap.set(r.e, r.v);
        setAbbreviations(abbrMap);

        const jtMap = new Map<string, string>();
        for (const r of propResults[4].rows) if (r.e && r.v) jtMap.set(r.e, r.v);
        setJobTitles(jtMap);

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket, isSocketReady, flowId, generation, collection]);

  const orgChildren = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [child, parent] of parentOrgRel) {
      const list = m.get(parent) || [];
      list.push(child);
      m.set(parent, list);
    }
    return m;
  }, [parentOrgRel]);

  const orgParent = useMemo(() => {
    const m = new Map<string, string>();
    for (const [child, parent] of parentOrgRel) m.set(child, parent);
    return m;
  }, [parentOrgRel]);

  const capabilityChildren = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [child, parent] of broaderDomainRel) {
      const list = m.get(parent) || [];
      list.push(child);
      m.set(parent, list);
    }
    return m;
  }, [broaderDomainRel]);

  const buildRelMap = (rels: IIRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(from) || [];
      list.push(to);
      m.set(from, list);
    }
    return m;
  };

  const orgCapabilities = useMemo(() => buildRelMap(deliversCapRel), [deliversCapRel]);
  const orgSeeks = useMemo(() => buildRelMap(seeksCapRel), [seeksCapRel]);
  const orgTargets = useMemo(() => buildRelMap(targetsSegRel), [targetsSegRel]);
  const orgOperatesFramework = useMemo(() => buildRelMap(operatesFrameworkRel), [operatesFrameworkRel]);
  const orgListedOnFramework = useMemo(() => buildRelMap(listedOnFrameworkRel), [listedOnFrameworkRel]);
  const orgProvidesAccess = useMemo(() => buildRelMap(providesAccessRel), [providesAccessRel]);
  const orgMembers = useMemo(() => buildRelMap(memberOfRel), [memberOfRel]);
  const orgPartners = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [a, b] of partneredWithRel) {
      const la = m.get(a) || []; la.push(b); m.set(a, la);
      const lb = m.get(b) || []; lb.push(a); m.set(b, lb);
    }
    return m;
  }, [partneredWithRel]);
  const orgLocation = useMemo(() => buildRelMap(locatedInRel), [locatedInRel]);
  const orgFundedBy = useMemo(() => buildRelMap(fundedByRel), [fundedByRel]);
  const orgSectors = useMemo(() => buildRelMap(operatesInSectorRel), [operatesInSectorRel]);
  const orgSegments = useMemo(() => buildRelMap(belongsToSegmentRel), [belongsToSegmentRel]);

  const personRoles = useMemo(() => buildRelMap(holdsRoleRel), [holdsRoleRel]);
  const personExpertise = useMemo(() => buildRelMap(hasExpertiseRel), [hasExpertiseRel]);

  const roleOrg = useMemo(() => {
    const m = new Map<string, string>();
    for (const [role, org] of roleAtOrgRel) m.set(role, org);
    return m;
  }, [roleAtOrgRel]);

  const allianceMembers = useMemo(() => buildRelMap(hasMemberRel), [hasMemberRel]);

  const nationAreas = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [area, nation] of withinNationRel) {
      const list = m.get(nation) || [];
      list.push(area);
      m.set(nation, list);
    }
    return m;
  }, [withinNationRel]);

  const segmentScope = useMemo(() => {
    const m = new Map<string, string>();
    for (const [seg, geo] of geoScopeRel) m.set(seg, geo);
    return m;
  }, [geoScopeRel]);

  return {
    nodes, descriptions, abbreviations, jobTitles,
    orgChildren, orgParent, capabilityChildren,
    orgCapabilities, orgSeeks, orgTargets,
    orgOperatesFramework, orgListedOnFramework, orgProvidesAccess,
    orgMembers, orgPartners, orgLocation, orgFundedBy,
    orgSectors, orgSegments,
    personRoles, personExpertise, roleOrg,
    allianceMembers, nationAreas, segmentScope,
    isLoading: isLoading || !isSocketReady, error,
  };
}
