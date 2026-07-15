import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@trustgraph/react-provider";
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

export function useLawData(lang: string = "en") {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [nodes, setNodes] = useState<Map<string, LawNode>>(new Map());
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());

  const [docIds, setDocIds] = useState<Map<string, string>>(new Map());
  const [datesEnacted, setDatesEnacted] = useState<Map<string, string>>(new Map());
  const [governanceDomains, setGovernanceDomains] = useState<Map<string, string>>(new Map());
  const [extraordinaryPower, setExtraordinaryPower] = useState<Map<string, boolean>>(new Map());
  const [emergencyLimits, setEmergencyLimits] = useState<Map<string, string>>(new Map());
  const [responseWindows, setResponseWindows] = useState<Map<string, string>>(new Map());
  const [publicAdmin, setPublicAdmin] = useState<Map<string, boolean>>(new Map());
  const [selfFunded, setSelfFunded] = useState<Map<string, boolean>>(new Map());
  const [personalHazard, setPersonalHazard] = useState<Map<string, boolean>>(new Map());
  const [legalBases, setLegalBases] = useState<Map<string, string>>(new Map());
  const [indexNumbers, setIndexNumbers] = useState<Map<string, number>>(new Map());

  const [hasComponentRel, setHasComponentRel] = useState<LawRelation[]>([]);
  const [codifiesConceptRel, setCodifiesConceptRel] = useState<LawRelation[]>([]);
  const [governsEntityRel, setGovernsEntityRel] = useState<LawRelation[]>([]);
  const [mustReportToRel, setMustReportToRel] = useState<LawRelation[]>([]);
  const [exchangesDataRel, setExchangesDataRel] = useState<LawRelation[]>([]);
  const [subAgencyOfRel, setSubAgencyOfRel] = useState<LawRelation[]>([]);
  const [executedByRel, setExecutedByRel] = useState<LawRelation[]>([]);
  const [limitsRightRel, setLimitsRightRel] = useState<LawRelation[]>([]);
  const [guaranteesRightRel, setGuaranteesRightRel] = useState<LawRelation[]>([]);
  const [penalizesEntityRel, setPenalizesEntityRel] = useState<LawRelation[]>([]);
  const [relaysDataToRel, setRelaysDataToRel] = useState<LawRelation[]>([]);
  const [bearsCostOfRel, setBearsCostOfRel] = useState<LawRelation[]>([]);
  const [amendsRel, setAmendsRel] = useState<LawRelation[]>([]);
  const [supersedesRel, setSupersedesRel] = useState<LawRelation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const lfTagged = `FILTER(LANG(?label) = "${lang}")`;
        const lfUntagged = `FILTER(LANG(?label) = "")`;
        const cfTagged = `FILTER(LANG(?v) = "${lang}")`;
        const cfUntagged = `FILTER(LANG(?v) = "")`;

        const typeNames = [
          "Statute", "LegislativeDraft", "Chapter", "Article",
          "Ministry", "JurisdictionAuthority",
          "RegulatedEntity", "CriticalInfrastructureOperator",
          "ElectronicCommunicationsProvider", "HostingServiceProvider",
          "IncidentTrigger", "ResilienceMandate", "ContinuityProtocol",
          "InformationPipeline", "CivicRight", "ExecutiveLiability", "LegalConcept",
        ];

        const taggedTypeQueries = typeNames.map(t => ({
          type: t,
          query: q(`SELECT ?e ?label WHERE { ?e a llo:${t} ; rdfs:label ?label . ${lfTagged} }`),
        }));
        const untaggedTypeQueries = typeNames.map(t => ({
          type: t,
          query: q(`SELECT ?e ?label WHERE { ?e a llo:${t} ; rdfs:label ?label . ${lfUntagged} }`),
        }));

        const relQueries = [
          { key: "hasComponent", query: q(`SELECT ?p ?c WHERE { ?p llo:hasComponent ?c . }`) },
          { key: "codifiesConcept", query: q(`SELECT ?a ?c WHERE { ?a llo:codifiesConcept ?c . }`) },
          { key: "governsEntity", query: q(`SELECT ?auth ?ent WHERE { ?auth llo:governsEntity ?ent . }`) },
          { key: "mustReportTo", query: q(`SELECT ?ent ?auth WHERE { ?ent llo:mustReportTo ?auth . }`) },
          { key: "exchangesDataWith", query: q(`SELECT ?a ?b WHERE { ?a llo:exchangesDataWith ?b . }`) },
          { key: "subAgencyOf", query: q(`SELECT ?sub ?parent WHERE { ?sub llo:subAgencyOf ?parent . }`) },
          { key: "executedByAuthority", query: q(`SELECT ?t ?auth WHERE { ?t llo:executedByAuthority ?auth . }`) },
          { key: "limitsRight", query: q(`SELECT ?t ?r WHERE { ?t llo:limitsRight ?r . }`) },
          { key: "guaranteesRightTo", query: q(`SELECT ?s ?r WHERE { ?s llo:guaranteesRightTo ?r . }`) },
          { key: "penalizesEntity", query: q(`SELECT ?l ?ent WHERE { ?l llo:penalizesEntity ?ent . }`) },
          { key: "relaysDataTo", query: q(`SELECT ?p ?auth WHERE { ?p llo:relaysDataTo ?auth . }`) },
          { key: "bearsCostOf", query: q(`SELECT ?m ?ent WHERE { ?m llo:bearsCostOf ?ent . }`) },
          { key: "proposesAmendmentTo", query: q(`SELECT ?draft ?statute WHERE { ?draft llo:proposesAmendmentTo ?statute . }`) },
          { key: "supersedesVersion", query: q(`SELECT ?newer ?older WHERE { ?newer llo:supersedesVersion ?older . }`) },
        ];

        const taggedDescQuery = q(`SELECT ?e ?v WHERE { ?e rdfs:comment ?v . ${cfTagged} }`);
        const untaggedDescQuery = q(`SELECT ?e ?v WHERE { ?e rdfs:comment ?v . ${cfUntagged} }`);

        const propQueries = [
          { key: "hasDocID", query: q(`SELECT ?e ?v WHERE { ?e llo:hasDocID ?v . }`) },
          { key: "dateEnacted", query: q(`SELECT ?e ?v WHERE { ?e llo:dateEnacted ?v . }`) },
          { key: "hasGovernanceDomain", query: q(`SELECT ?e ?v WHERE { ?e llo:hasGovernanceDomain ?v . }`) },
          { key: "isExtraordinaryPower", query: q(`SELECT ?e ?v WHERE { ?e llo:isExtraordinaryPower ?v . }`) },
          { key: "hasEmergencyLimit", query: q(`SELECT ?e ?v WHERE { ?e llo:hasEmergencyLimit ?v . }`) },
          { key: "hasResponseWindow", query: q(`SELECT ?e ?v WHERE { ?e llo:hasResponseWindow ?v . }`) },
          { key: "isPublicAdministration", query: q(`SELECT ?e ?v WHERE { ?e llo:isPublicAdministration ?v . }`) },
          { key: "isAtExpenseOfEntity", query: q(`SELECT ?e ?v WHERE { ?e llo:isAtExpenseOfEntity ?v . }`) },
          { key: "isPersonalHazard", query: q(`SELECT ?e ?v WHERE { ?e llo:isPersonalHazard ?v . }`) },
          { key: "hasLegalBasis", query: q(`SELECT ?e ?v WHERE { ?e llo:hasLegalBasis ?v . }`) },
          { key: "hasIndexNumber", query: q(`SELECT ?e ?v WHERE { ?e llo:hasIndexNumber ?v . }`) },
        ];

        const [taggedTypeResults, untaggedTypeResults, relResults, propResults, taggedDescResult, untaggedDescResult] = await Promise.all([
          Promise.all(taggedTypeQueries.map(tq => api.sparqlQuery(tq.query, collection))),
          Promise.all(untaggedTypeQueries.map(tq => api.sparqlQuery(tq.query, collection))),
          Promise.all(relQueries.map(rq => api.sparqlQuery(rq.query, collection))),
          Promise.all(propQueries.map(pq => api.sparqlQuery(pq.query, collection))),
          api.sparqlQuery(taggedDescQuery, collection),
          api.sparqlQuery(untaggedDescQuery, collection),
        ]);

        if (cancelled) return;

        const nodeMap = new Map<string, LawNode>();
        for (let i = 0; i < typeNames.length; i++) {
          const kind = typeNames[i];
          for (const r of untaggedTypeResults[i].rows) {
            if (r.e) nodeMap.set(r.e, { uri: r.e, label: r.label || r.e, kind });
          }
          for (const r of taggedTypeResults[i].rows) {
            if (r.e) nodeMap.set(r.e, { uri: r.e, label: r.label || r.e, kind });
          }
        }
        setNodes(nodeMap);

        const setRel = (idx: number, setter: (v: LawRelation[]) => void, k1: string, k2: string) => {
          setter(relResults[idx].rows.filter(r => r[k1] && r[k2]).map(r => [r[k1], r[k2]]));
        };

        setRel(0, setHasComponentRel, "p", "c");
        setRel(1, setCodifiesConceptRel, "a", "c");
        setRel(2, setGovernsEntityRel, "auth", "ent");
        setRel(3, setMustReportToRel, "ent", "auth");
        setRel(4, setExchangesDataRel, "a", "b");
        setRel(5, setSubAgencyOfRel, "sub", "parent");
        setRel(6, setExecutedByRel, "t", "auth");
        setRel(7, setLimitsRightRel, "t", "r");
        setRel(8, setGuaranteesRightRel, "s", "r");
        setRel(9, setPenalizesEntityRel, "l", "ent");
        setRel(10, setRelaysDataToRel, "p", "auth");
        setRel(11, setBearsCostOfRel, "m", "ent");
        setRel(12, setAmendsRel, "draft", "statute");
        setRel(13, setSupersedesRel, "newer", "older");

        const descMap = new Map<string, string>();
        for (const r of untaggedDescResult.rows) if (r.e && r.v) descMap.set(r.e, r.v);
        for (const r of taggedDescResult.rows) if (r.e && r.v) descMap.set(r.e, r.v);
        setDescriptions(descMap);

        const didMap = new Map<string, string>();
        for (const r of propResults[0].rows) if (r.e && r.v) didMap.set(r.e, r.v);
        setDocIds(didMap);

        const deMap = new Map<string, string>();
        for (const r of propResults[1].rows) if (r.e && r.v) deMap.set(r.e, r.v);
        setDatesEnacted(deMap);

        const gdMap = new Map<string, string>();
        for (const r of propResults[2].rows) if (r.e && r.v) gdMap.set(r.e, r.v);
        setGovernanceDomains(gdMap);

        const epMap = new Map<string, boolean>();
        for (const r of propResults[3].rows) if (r.e && r.v != null) epMap.set(r.e, String(r.v) === "true");
        setExtraordinaryPower(epMap);

        const elMap = new Map<string, string>();
        for (const r of propResults[4].rows) if (r.e && r.v) elMap.set(r.e, r.v);
        setEmergencyLimits(elMap);

        const rwMap = new Map<string, string>();
        for (const r of propResults[5].rows) if (r.e && r.v) rwMap.set(r.e, r.v);
        setResponseWindows(rwMap);

        const paMap = new Map<string, boolean>();
        for (const r of propResults[6].rows) if (r.e && r.v != null) paMap.set(r.e, String(r.v) === "true");
        setPublicAdmin(paMap);

        const sfMap = new Map<string, boolean>();
        for (const r of propResults[7].rows) if (r.e && r.v != null) sfMap.set(r.e, String(r.v) === "true");
        setSelfFunded(sfMap);

        const phMap = new Map<string, boolean>();
        for (const r of propResults[8].rows) if (r.e && r.v != null) phMap.set(r.e, String(r.v) === "true");
        setPersonalHazard(phMap);

        const lbMap = new Map<string, string>();
        for (const r of propResults[9].rows) if (r.e && r.v) lbMap.set(r.e, r.v);
        setLegalBases(lbMap);

        const inMap = new Map<string, number>();
        for (const r of propResults[10].rows) if (r.e && r.v) inMap.set(r.e, parseInt(r.v, 10));
        setIndexNumbers(inMap);

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket, flowId, generation, collection, lang]);

  const buildRelMap = (rels: LawRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(from) || [];
      list.push(to);
      m.set(from, list);
    }
    return m;
  };

  const buildReverseMap = (rels: LawRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(to) || [];
      list.push(from);
      m.set(to, list);
    }
    return m;
  };

  const parentChildren = useMemo(() => buildRelMap(hasComponentRel), [hasComponentRel]);
  const articleConcepts = useMemo(() => buildRelMap(codifiesConceptRel), [codifiesConceptRel]);
  const authorityEntities = useMemo(() => buildRelMap(governsEntityRel), [governsEntityRel]);
  const entityReportsTo = useMemo(() => buildRelMap(mustReportToRel), [mustReportToRel]);
  const dataExchange = useMemo(() => buildRelMap(exchangesDataRel), [exchangesDataRel]);
  const subAgencyParent = useMemo(() => buildRelMap(subAgencyOfRel), [subAgencyOfRel]);
  const triggerAuthority = useMemo(() => buildRelMap(executedByRel), [executedByRel]);
  const triggerRights = useMemo(() => buildRelMap(limitsRightRel), [limitsRightRel]);
  const statuteRights = useMemo(() => buildRelMap(guaranteesRightRel), [guaranteesRightRel]);
  const liabilityEntities = useMemo(() => buildRelMap(penalizesEntityRel), [penalizesEntityRel]);
  const pipelineAuthority = useMemo(() => buildRelMap(relaysDataToRel), [relaysDataToRel]);
  const mandateEntities = useMemo(() => buildRelMap(bearsCostOfRel), [bearsCostOfRel]);
  const draftAmends = useMemo(() => buildRelMap(amendsRel), [amendsRel]);
  const supersedes = useMemo(() => buildRelMap(supersedesRel), [supersedesRel]);

  const rightTriggers = useMemo(() => buildReverseMap(limitsRightRel), [limitsRightRel]);
  const authoritySubAgencies = useMemo(() => buildReverseMap(subAgencyOfRel), [subAgencyOfRel]);
  const entityPenalties = useMemo(() => buildReverseMap(penalizesEntityRel), [penalizesEntityRel]);
  const entityMandates = useMemo(() => buildReverseMap(bearsCostOfRel), [bearsCostOfRel]);
  const amendedBy = useMemo(() => buildReverseMap(amendsRel), [amendsRel]);
  const supersededBy = useMemo(() => buildReverseMap(supersedesRel), [supersedesRel]);

  return {
    nodes, descriptions,
    docIds, datesEnacted, governanceDomains,
    extraordinaryPower, emergencyLimits, responseWindows,
    publicAdmin, selfFunded, personalHazard,
    legalBases, indexNumbers,
    parentChildren, articleConcepts, authorityEntities,
    entityReportsTo, dataExchange, subAgencyParent,
    triggerAuthority, triggerRights, statuteRights,
    liabilityEntities, pipelineAuthority, mandateEntities,
    draftAmends, supersedes,
    rightTriggers, authoritySubAgencies,
    entityPenalties, entityMandates,
    amendedBy, supersededBy,
    isLoading, error,
  };
}
