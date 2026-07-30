import { useState, useCallback, useRef, useEffect } from "react";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const LLO = "http://trustgraph.ai/ontologies/lithuanian-legal#";

function q(body: string): string {
  return `PREFIX llo: <${LLO}>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n${body}`;
}

export interface LawNode {
  uri: string;
  label: string;
  kind: string;
}

export type LawRelation = [string, string];

export interface LawEntityDetail {
  description?: string;
  legalBasis?: string;
  governanceDomain?: string;
  docId?: string;
  dateEnacted?: string;
  isExtraordinaryPower?: boolean;
  emergencyLimit?: string;
  responseWindow?: string;
  isPublicAdministration?: boolean;
  isAtExpenseOfEntity?: boolean;
  isPersonalHazard?: boolean;
  indexNumber?: number;
}

export interface LawEntityRelationships {
  subAgencies?: string[];
  subAgencyOf?: string[];
  governsEntities?: string[];
  reportsTo?: string[];
  exchangesDataWith?: string[];
  executedBy?: string[];
  limitsRights?: string[];
  guaranteesRights?: string[];
  penalizesEntities?: string[];
  relaysDataTo?: string[];
  bearsCostOf?: string[];
  amendsStatutes?: string[];
  amendedBy?: string[];
  supersedesVersions?: string[];
  supersededBy?: string[];
  components?: string[];
  codifiesConcepts?: string[];
  limitedByTriggers?: string[];
  penalizedBy?: string[];
  mandatedBy?: string[];
}

export interface OverviewData {
  lawDetails: Map<string, { docId?: string; dateEnacted?: string; description?: string; amends?: string[] }>;
  pipelineDescriptions: Map<string, string>;
}

export interface InstitutionsOverviewData {
  governanceDomains: Map<string, string>;
  dataExchanges: [string, string][];
}

export interface RightsOverviewData {
  rightTriggers: Map<string, string[]>;
  triggerFlags: Map<string, { extraordinary?: boolean; limit?: string; window?: string }>;
}

export interface ComplianceOverviewData {
  selfFunded: Map<string, boolean>;
  entityReportsTo: Map<string, string[]>;
}

export interface StructureData {
  parentChildren: Map<string, string[]>;
  indexNumbers: Map<string, number>;
  articleConcepts: Map<string, string[]>;
}

type Row = Record<string, string>;

export function useLawData(lang: string = "en") {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";
  const flowId = useSessionStore((s) => s.flowId);
  useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  // All known nodes, accumulated incrementally
  const [nodes, setNodes] = useState<Map<string, LawNode>>(new Map());
  const [error] = useState<Error | null>(null);

  // Caches keyed by language where relevant
  const typeListCache = useRef<Map<string, LawNode[]>>(new Map());
  const detailCache = useRef<Map<string, LawEntityDetail>>(new Map());
  const relsCache = useRef<Map<string, LawEntityRelationships>>(new Map());
  const overviewCache = useRef<OverviewData | null>(null);
  const institutionsCache = useRef<InstitutionsOverviewData | null>(null);
  const rightsCache = useRef<RightsOverviewData | null>(null);
  const complianceCache = useRef<ComplianceOverviewData | null>(null);
  const structureCache = useRef<StructureData | null>(null);
  const prevLangRef = useRef(lang);

  const collectionRef = useRef(collection);
  collectionRef.current = collection;

  // Clear language-dependent caches when lang changes
  useEffect(() => {
    if (prevLangRef.current !== lang) {
      typeListCache.current.clear();
      detailCache.current.clear();
      overviewCache.current = null;
      prevLangRef.current = lang;
    }
  }, [lang]);

  // Stable API accessor
  const getApi = useCallback(() => {
    return socket.flow(flowId);
  }, [socket, flowId]);

  const col = useCallback(() => collectionRef.current, []);

  const langFilter = useCallback((varName: string) => {
    return `FILTER(LANG(?${varName}) = "${lang}" || LANG(?${varName}) = "")`;
  }, [lang]);

  // Merge nodes into the accumulated node map
  const mergeNodes = useCallback((newNodes: LawNode[]) => {
    setNodes(prev => {
      const next = new Map(prev);
      let changed = false;
      for (const n of newNodes) {
        const existing = next.get(n.uri);
        if (!existing || existing.label !== n.label) {
          next.set(n.uri, n);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Fetch entities of given types — returns list, merges into node map, caches per lang+types
  const fetchEntitiesByKind = useCallback(async (...kinds: string[]): Promise<LawNode[]> => {
    const cacheKey = `${lang}:${kinds.join(",")}`;
    const cached = typeListCache.current.get(cacheKey);
    if (cached) return cached;

    const api = getApi();
    const c = col();
    const lf = `FILTER(LANG(?label) = "${lang}" || LANG(?label) = "")`;

    const results = await Promise.all(kinds.map(kind =>
      api.sparqlQuery(q(`SELECT ?e ?label WHERE { ?e a llo:${kind} ; rdfs:label ?label . ${lf} }`), c),
    ));

    const nodeList: LawNode[] = [];
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i];
      for (const r of results[i].rows) {
        if (r.e) nodeList.push({ uri: r.e, label: r.label || r.e, kind });
      }
    }

    typeListCache.current.set(cacheKey, nodeList);
    mergeNodes(nodeList);
    return nodeList;
  }, [getApi, col, lang, mergeNodes]);

  // Fetch detail properties for a single entity
  const fetchDetail = useCallback(async (uri: string): Promise<LawEntityDetail> => {
    const cacheKey = `${lang}:${uri}`;
    const cached = detailCache.current.get(cacheKey);
    if (cached) return cached;

    const api = getApi();
    const c = col();
    const cf = langFilter("v");

    const results = await Promise.all([
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> rdfs:comment ?v . ${cf} } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasLegalBasis ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasGovernanceDomain ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasDocID ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:dateEnacted ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:isExtraordinaryPower ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasEmergencyLimit ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasResponseWindow ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:isPublicAdministration ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:isAtExpenseOfEntity ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:isPersonalHazard ?v . } LIMIT 1`), c),
      api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasIndexNumber ?v . } LIMIT 1`), c),
    ]);

    const val = (idx: number) => results[idx].rows[0]?.v as string | undefined;
    const boolVal = (idx: number) => {
      const v = val(idx);
      return v != null ? String(v) === "true" : undefined;
    };

    const detail: LawEntityDetail = {
      description: val(0),
      legalBasis: val(1),
      governanceDomain: val(2),
      docId: val(3),
      dateEnacted: val(4),
      isExtraordinaryPower: boolVal(5),
      emergencyLimit: val(6),
      responseWindow: val(7),
      isPublicAdministration: boolVal(8),
      isAtExpenseOfEntity: boolVal(9),
      isPersonalHazard: boolVal(10),
      indexNumber: val(11) != null ? parseInt(val(11)!, 10) : undefined,
    };

    detailCache.current.set(cacheKey, detail);
    return detail;
  }, [getApi, col, langFilter, lang]);

  // Fetch relationships for a single entity (language-independent)
  const fetchRelationships = useCallback(async (uri: string): Promise<LawEntityRelationships> => {
    const cached = relsCache.current.get(uri);
    if (cached) return cached;

    const api = getApi();
    const c = col();

    const fwd = (pred: string) =>
      api.sparqlQuery(q(`SELECT ?o WHERE { <${uri}> llo:${pred} ?o . }`), c);
    const rev = (pred: string) =>
      api.sparqlQuery(q(`SELECT ?s WHERE { ?s llo:${pred} <${uri}> . }`), c);

    const [
      subAgencies, subAgencyOf, governs, reportsTo, exchanges,
      executedBy, limitsR, guaranteesR, penalizes, relays, bearsCost,
      amends, amendedBy, supersedes, supersededBy,
      components, codifies, limitedBy, penalizedBy, mandatedBy,
    ] = await Promise.all([
      rev("subAgencyOf"),
      fwd("subAgencyOf"),
      fwd("governsEntity"),
      fwd("mustReportTo"),
      fwd("exchangesDataWith"),
      fwd("executedByAuthority"),
      fwd("limitsRight"),
      fwd("guaranteesRightTo"),
      fwd("penalizesEntity"),
      fwd("relaysDataTo"),
      fwd("bearsCostOf"),
      fwd("proposesAmendmentTo"),
      rev("proposesAmendmentTo"),
      fwd("supersedesVersion"),
      rev("supersedesVersion"),
      fwd("hasComponent"),
      fwd("codifiesConcept"),
      rev("limitsRight"),
      rev("penalizesEntity"),
      rev("bearsCostOf"),
    ]);

    const toList = (res: { rows: Row[] }, key: string) => {
      const uris = res.rows.filter(r => r[key]).map(r => r[key]);
      return uris.length > 0 ? uris : undefined;
    };

    // Fetch labels for any referenced URIs we don't know yet
    const allReferenced = new Set<string>();
    const collectUris = (res: { rows: Row[] }, key: string) => {
      for (const r of res.rows) if (r[key]) allReferenced.add(r[key]);
    };
    collectUris(subAgencies, "s"); collectUris(subAgencyOf, "o");
    collectUris(governs, "o"); collectUris(reportsTo, "o");
    collectUris(exchanges, "o"); collectUris(executedBy, "o");
    collectUris(limitsR, "o"); collectUris(guaranteesR, "o");
    collectUris(penalizes, "o"); collectUris(relays, "o");
    collectUris(bearsCost, "o"); collectUris(amends, "o");
    collectUris(amendedBy, "s"); collectUris(supersedes, "o");
    collectUris(supersededBy, "s"); collectUris(components, "o");
    collectUris(codifies, "o"); collectUris(limitedBy, "s");
    collectUris(penalizedBy, "s"); collectUris(mandatedBy, "s");

    // Fetch labels for unknown referenced nodes
    const unknownUris = [...allReferenced].filter(u => !nodes.get(u));
    if (unknownUris.length > 0) {
      const lf = `FILTER(LANG(?label) = "${lang}" || LANG(?label) = "")`;
      const values = unknownUris.map(u => `<${u}>`).join(" ");
      const labelResult = await api.sparqlQuery(
        q(`SELECT ?e ?label ?type WHERE { VALUES ?e { ${values} } ?e rdfs:label ?label ; a ?type . ${lf} }`),
        c,
      );
      const fetched: LawNode[] = [];
      for (const r of labelResult.rows) {
        if (r.e && r.label) {
          const kind = (r.type || "").split("#").pop() || "Unknown";
          fetched.push({ uri: r.e, label: r.label, kind });
        }
      }
      mergeNodes(fetched);
    }

    const rels: LawEntityRelationships = {
      subAgencies: toList(subAgencies, "s"),
      subAgencyOf: toList(subAgencyOf, "o"),
      governsEntities: toList(governs, "o"),
      reportsTo: toList(reportsTo, "o"),
      exchangesDataWith: toList(exchanges, "o"),
      executedBy: toList(executedBy, "o"),
      limitsRights: toList(limitsR, "o"),
      guaranteesRights: toList(guaranteesR, "o"),
      penalizesEntities: toList(penalizes, "o"),
      relaysDataTo: toList(relays, "o"),
      bearsCostOf: toList(bearsCost, "o"),
      amendsStatutes: toList(amends, "o"),
      amendedBy: toList(amendedBy, "s"),
      supersedesVersions: toList(supersedes, "o"),
      supersededBy: toList(supersededBy, "s"),
      components: toList(components, "o"),
      codifiesConcepts: toList(codifies, "o"),
      limitedByTriggers: toList(limitedBy, "s"),
      penalizedBy: toList(penalizedBy, "s"),
      mandatedBy: toList(mandatedBy, "s"),
    };

    relsCache.current.set(uri, rels);
    return rels;
  }, [getApi, col, nodes, lang, mergeNodes]);

  // Overview: law details + pipeline descriptions
  const fetchOverview = useCallback(async (lawUris: string[], pipelineUris: string[]): Promise<OverviewData> => {
    if (overviewCache.current) return overviewCache.current;

    const api = getApi();
    const c = col();
    const cf = langFilter("v");

    const lawDetails = new Map<string, { docId?: string; dateEnacted?: string; description?: string; amends?: string[] }>();

    const lawQueries = await Promise.all(lawUris.map(async (uri) => {
      const [docRes, dateRes, descRes, amendsRes] = await Promise.all([
        api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasDocID ?v . } LIMIT 1`), c),
        api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:dateEnacted ?v . } LIMIT 1`), c),
        api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> rdfs:comment ?v . ${cf} } LIMIT 1`), c),
        api.sparqlQuery(q(`SELECT ?o WHERE { <${uri}> llo:proposesAmendmentTo ?o . }`), c),
      ]);
      return {
        uri,
        docId: docRes.rows[0]?.v as string | undefined,
        dateEnacted: dateRes.rows[0]?.v as string | undefined,
        description: descRes.rows[0]?.v as string | undefined,
        amends: amendsRes.rows.filter((r: Row) => r.o).map((r: Row) => r.o) as string[],
      };
    }));

    for (const ld of lawQueries) {
      lawDetails.set(ld.uri, { docId: ld.docId, dateEnacted: ld.dateEnacted, description: ld.description, amends: ld.amends.length > 0 ? ld.amends : undefined });
    }

    const pipelineDescriptions = new Map<string, string>();
    if (pipelineUris.length > 0) {
      const descResults = await Promise.all(pipelineUris.map(uri =>
        api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> rdfs:comment ?v . ${cf} } LIMIT 1`), c),
      ));
      pipelineUris.forEach((uri, i) => {
        const v = descResults[i].rows[0]?.v as string | undefined;
        if (v) pipelineDescriptions.set(uri, v);
      });
    }

    const result: OverviewData = { lawDetails, pipelineDescriptions };
    overviewCache.current = result;
    return result;
  }, [getApi, col, langFilter]);

  // Institutions overview: governance domains + data exchanges
  const fetchInstitutionsOverview = useCallback(async (orgUris: string[]): Promise<InstitutionsOverviewData> => {
    if (institutionsCache.current) return institutionsCache.current;

    const api = getApi();
    const c = col();

    const [domainResults, exchangeResults] = await Promise.all([
      Promise.all(orgUris.map(uri =>
        api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasGovernanceDomain ?v . } LIMIT 1`), c),
      )),
      api.sparqlQuery(q(`SELECT ?a ?b WHERE { ?a llo:exchangesDataWith ?b . }`), c),
    ]);

    const governanceDomains = new Map<string, string>();
    orgUris.forEach((uri, i) => {
      const v = domainResults[i].rows[0]?.v as string | undefined;
      if (v) governanceDomains.set(uri, v);
    });

    const dataExchanges: [string, string][] = exchangeResults.rows
      .filter((r: Row) => r.a && r.b)
      .map((r: Row) => [r.a, r.b]);

    const result: InstitutionsOverviewData = { governanceDomains, dataExchanges };
    institutionsCache.current = result;
    return result;
  }, [getApi, col]);

  // Rights overview: right→trigger mappings + trigger flags
  const fetchRightsOverview = useCallback(async (rightUris: string[], triggerUris: string[]): Promise<RightsOverviewData> => {
    if (rightsCache.current) return rightsCache.current;

    const api = getApi();
    const c = col();

    const [triggerMapResults, flagResults] = await Promise.all([
      Promise.all(rightUris.map(uri =>
        api.sparqlQuery(q(`SELECT ?s WHERE { ?s llo:limitsRight <${uri}> . }`), c),
      )),
      Promise.all(triggerUris.map(uri =>
        Promise.all([
          api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:isExtraordinaryPower ?v . } LIMIT 1`), c),
          api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasEmergencyLimit ?v . } LIMIT 1`), c),
          api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:hasResponseWindow ?v . } LIMIT 1`), c),
        ]),
      )),
    ]);

    const rightTriggers = new Map<string, string[]>();
    rightUris.forEach((uri, i) => {
      const triggers = triggerMapResults[i].rows.filter((r: Row) => r.s).map((r: Row) => r.s);
      if (triggers.length > 0) rightTriggers.set(uri, triggers);
    });

    const triggerFlags = new Map<string, { extraordinary?: boolean; limit?: string; window?: string }>();
    triggerUris.forEach((uri, i) => {
      const [extraRes, limitRes, windowRes] = flagResults[i];
      const v = (res: { rows: Row[] }) => res.rows[0]?.v as string | undefined;
      const extraVal = v(extraRes);
      triggerFlags.set(uri, {
        extraordinary: extraVal != null ? String(extraVal) === "true" : undefined,
        limit: v(limitRes),
        window: v(windowRes),
      });
    });

    const result: RightsOverviewData = { rightTriggers, triggerFlags };
    rightsCache.current = result;
    return result;
  }, [getApi, col]);

  // Compliance overview: self-funded flags + reporting chains
  const fetchComplianceOverview = useCallback(async (entityUris: string[], mandateUris: string[]): Promise<ComplianceOverviewData> => {
    if (complianceCache.current) return complianceCache.current;

    const api = getApi();
    const c = col();

    const [selfFundedResults, reportsToResults] = await Promise.all([
      Promise.all(mandateUris.map(uri =>
        api.sparqlQuery(q(`SELECT ?v WHERE { <${uri}> llo:isAtExpenseOfEntity ?v . } LIMIT 1`), c),
      )),
      Promise.all(entityUris.map(uri =>
        api.sparqlQuery(q(`SELECT ?o WHERE { <${uri}> llo:mustReportTo ?o . }`), c),
      )),
    ]);

    const selfFunded = new Map<string, boolean>();
    mandateUris.forEach((uri, i) => {
      const v = selfFundedResults[i].rows[0]?.v as string | undefined;
      if (v != null) selfFunded.set(uri, String(v) === "true");
    });

    const entityReportsTo = new Map<string, string[]>();
    entityUris.forEach((uri, i) => {
      const tos = reportsToResults[i].rows.filter((r: Row) => r.o).map((r: Row) => r.o);
      if (tos.length > 0) entityReportsTo.set(uri, tos);
    });

    const result: ComplianceOverviewData = { selfFunded, entityReportsTo };
    complianceCache.current = result;
    return result;
  }, [getApi, col]);

  // Structure: parent→children, index numbers, article→concepts
  const fetchStructure = useCallback(async (): Promise<StructureData> => {
    if (structureCache.current) return structureCache.current;

    const api = getApi();
    const c = col();

    const [componentResults, indexResults, conceptResults] = await Promise.all([
      api.sparqlQuery(q(`SELECT ?p ?c WHERE { ?p llo:hasComponent ?c . }`), c),
      api.sparqlQuery(q(`SELECT ?e ?v WHERE { ?e llo:hasIndexNumber ?v . }`), c),
      api.sparqlQuery(q(`SELECT ?a ?c WHERE { ?a llo:codifiesConcept ?c . }`), c),
    ]);

    const parentChildren = new Map<string, string[]>();
    for (const r of componentResults.rows) {
      if (!r.p || !r.c) continue;
      const list = parentChildren.get(r.p) || [];
      list.push(r.c);
      parentChildren.set(r.p, list);
    }

    const indexNumbers = new Map<string, number>();
    for (const r of indexResults.rows) {
      if (r.e && r.v) indexNumbers.set(r.e, parseInt(r.v, 10));
    }

    const articleConcepts = new Map<string, string[]>();
    for (const r of conceptResults.rows) {
      if (!r.a || !r.c) continue;
      const list = articleConcepts.get(r.a) || [];
      list.push(r.c);
      articleConcepts.set(r.a, list);
    }

    const result: StructureData = { parentChildren, indexNumbers, articleConcepts };
    structureCache.current = result;
    return result;
  }, [getApi, col]);

  return {
    nodes,
    error,
    isSocketReady,
    fetchEntitiesByKind,
    fetchDetail,
    fetchRelationships,
    fetchOverview,
    fetchInstitutionsOverview,
    fetchRightsOverview,
    fetchComplianceOverview,
    fetchStructure,
  };
}
