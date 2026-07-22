import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const TG = "http://trustgraph.ai/ontology/";

function q(body: string): string {
  return `PREFIX tg: <${TG}>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n${body}`;
}

export interface OcsfNode {
  uri: string;
  label: string;
  kind: string;
}

export type OcsfRelation = [string, string];

export function useOcsfData() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [nodes, setNodes] = useState<Map<string, OcsfNode>>(new Map());
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());
  const [riskScores, setRiskScores] = useState<Map<string, number>>(new Map());
  const [timestamps, setTimestamps] = useState<Map<string, string>>(new Map());
  const [eventDates, setEventDates] = useState<Map<string, string>>(new Map());
  const [severities, setSeverities] = useState<Map<string, string>>(new Map());

  const [hasActorRel, setHasActorRel] = useState<OcsfRelation[]>([]);
  const [hasRiskRel, setHasRiskRel] = useState<OcsfRelation[]>([]);
  const [impactsAssetRel, setImpactsAssetRel] = useState<OcsfRelation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const typeQueries = [
          // Risk event subtypes
          { type: "SensitiveOperation", query: q(`SELECT ?e ?label WHERE { ?e a tg:SensitiveOperation ; rdfs:label ?label . }`) },
          { type: "ExternalDnsLookup", query: q(`SELECT ?e ?label WHERE { ?e a tg:ExternalDnsLookup ; rdfs:label ?label . }`) },
          { type: "IdentityLifecycle", query: q(`SELECT ?e ?label WHERE { ?e a tg:IdentityLifecycle ; rdfs:label ?label . }`) },
          { type: "PrivilegeChange", query: q(`SELECT ?e ?label WHERE { ?e a tg:PrivilegeChange ; rdfs:label ?label . }`) },
          { type: "CredentialSharing", query: q(`SELECT ?e ?label WHERE { ?e a tg:CredentialSharing ; rdfs:label ?label . }`) },
          { type: "DataMovement", query: q(`SELECT ?e ?label WHERE { ?e a tg:DataMovement ; rdfs:label ?label . }`) },
          { type: "EvidenceDestruction", query: q(`SELECT ?e ?label WHERE { ?e a tg:EvidenceDestruction ; rdfs:label ?label . }`) },
          { type: "ComplianceAlert", query: q(`SELECT ?e ?label WHERE { ?e a tg:ComplianceAlert ; rdfs:label ?label . }`) },
          { type: "AfterHoursActivity", query: q(`SELECT ?e ?label WHERE { ?e a tg:AfterHoursActivity ; rdfs:label ?label . }`) },
          { type: "AnomalousActivity", query: q(`SELECT ?e ?label WHERE { ?e a tg:AnomalousActivity ; rdfs:label ?label . }`) },
          { type: "SensitiveAuthentication", query: q(`SELECT ?e ?label WHERE { ?e a tg:SensitiveAuthentication ; rdfs:label ?label . }`) },
          { type: "LateralMovement", query: q(`SELECT ?e ?label WHERE { ?e a tg:LateralMovement ; rdfs:label ?label . }`) },
          // Actors & categories
          { type: "Actor", query: q(`SELECT ?e ?label WHERE { ?e a tg:Actor ; rdfs:label ?label . }`) },
          { type: "RiskCategory", query: q(`SELECT ?e ?label WHERE { ?e a tg:RiskCategory ; rdfs:label ?label . }`) },
          // Asset subtypes
          { type: "Service", query: q(`SELECT ?e ?label WHERE { ?e a tg:Service ; rdfs:label ?label . }`) },
          { type: "Resource", query: q(`SELECT ?e ?label WHERE { ?e a tg:Resource ; rdfs:label ?label . }`) },
          { type: "Domain", query: q(`SELECT ?e ?label WHERE { ?e a tg:Domain ; rdfs:label ?label . }`) },
          { type: "ExternalDomain", query: q(`SELECT ?e ?label WHERE { ?e a tg:ExternalDomain ; rdfs:label ?label . }`) },
          { type: "ServiceAccount", query: q(`SELECT ?e ?label WHERE { ?e a tg:ServiceAccount ; rdfs:label ?label . }`) },
          { type: "Account", query: q(`SELECT ?e ?label WHERE { ?e a tg:Account ; rdfs:label ?label . }`) },
          { type: "Policy", query: q(`SELECT ?e ?label WHERE { ?e a tg:Policy ; rdfs:label ?label . }`) },
          { type: "Infrastructure", query: q(`SELECT ?e ?label WHERE { ?e a tg:Infrastructure ; rdfs:label ?label . }`) },
        ];

        const relQueries = [
          { key: "hasActor", query: q(`SELECT ?event ?actor WHERE { ?event tg:hasActor ?actor . }`) },
          { key: "hasRisk", query: q(`SELECT ?event ?risk WHERE { ?event tg:hasRisk ?risk . }`) },
          { key: "impactsAsset", query: q(`SELECT ?event ?asset WHERE { ?event tg:impactsAsset ?asset . }`) },
        ];

        const propQueries = [
          { key: "rdfsComment", query: q(`SELECT ?e ?v WHERE { ?e rdfs:comment ?v . }`) },
          { key: "skosDefn", query: q(`PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\nSELECT ?e ?v WHERE { ?e skos:definition ?v . }`) },
          { key: "riskScore", query: q(`SELECT ?risk ?score WHERE { ?risk tg:riskScore ?score . }`) },
          { key: "timestamp", query: q(`SELECT ?event ?ts WHERE { ?event tg:timestamp ?ts . }`) },
          { key: "eventDate", query: q(`SELECT ?event ?d WHERE { ?event tg:eventDate ?d . }`) },
          { key: "severity", query: q(`SELECT ?event ?sev WHERE { ?event tg:severity ?sev . }`) },
        ];

        const [typeResults, relResults, propResults] = await Promise.all([
          Promise.all(typeQueries.map(tq => api.sparqlQuery(tq.query, collection))),
          Promise.all(relQueries.map(rq => api.sparqlQuery(rq.query, collection))),
          Promise.all(propQueries.map(pq => api.sparqlQuery(pq.query, collection))),
        ]);

        if (cancelled) return;

        const nodeMap = new Map<string, OcsfNode>();
        for (let i = 0; i < typeQueries.length; i++) {
          const kind = typeQueries[i].type;
          for (const r of typeResults[i].rows) {
            if (r.e && !nodeMap.has(r.e)) {
              nodeMap.set(r.e, { uri: r.e, label: r.label || r.e, kind });
            }
          }
        }
        setNodes(nodeMap);

        const toRels = (idx: number, k1: string, k2: string): OcsfRelation[] =>
          relResults[idx].rows.map((r: Record<string, string>) => [r[k1], r[k2]]);

        setHasActorRel(toRels(0, "event", "actor"));
        setHasRiskRel(toRels(1, "event", "risk"));
        setImpactsAssetRel(toRels(2, "event", "asset"));

        const descMap = new Map<string, string>();
        for (const r of propResults[0].rows) if (r.e && r.v) descMap.set(r.e, r.v);
        for (const r of propResults[1].rows) if (r.e && r.v && !descMap.has(r.e)) descMap.set(r.e, r.v);
        setDescriptions(descMap);

        const scoreMap = new Map<string, number>();
        for (const r of propResults[2].rows) if (r.risk && r.score) scoreMap.set(r.risk, parseFloat(r.score));
        setRiskScores(scoreMap);

        const tsMap = new Map<string, string>();
        for (const r of propResults[3].rows) if (r.event && r.ts) tsMap.set(r.event, r.ts);
        setTimestamps(tsMap);

        const edMap = new Map<string, string>();
        for (const r of propResults[4].rows) if (r.event && r.d) edMap.set(r.event, r.d);
        setEventDates(edMap);

        const sevMap = new Map<string, string>();
        for (const r of propResults[5].rows) if (r.event && r.sev) sevMap.set(r.event, r.sev);
        setSeverities(sevMap);

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket, flowId, generation, collection]);

  const buildRelMap = (rels: OcsfRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(from) || [];
      list.push(to);
      m.set(from, list);
    }
    return m;
  };

  const buildReverseMap = (rels: OcsfRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(to) || [];
      list.push(from);
      m.set(to, list);
    }
    return m;
  };

  const eventActors = useMemo(() => buildRelMap(hasActorRel), [hasActorRel]);
  const eventRisks = useMemo(() => buildRelMap(hasRiskRel), [hasRiskRel]);
  const eventAssets = useMemo(() => buildRelMap(impactsAssetRel), [impactsAssetRel]);

  const actorEvents = useMemo(() => buildReverseMap(hasActorRel), [hasActorRel]);
  const riskEvents = useMemo(() => buildReverseMap(hasRiskRel), [hasRiskRel]);
  const assetEvents = useMemo(() => buildReverseMap(impactsAssetRel), [impactsAssetRel]);

  return {
    nodes, descriptions,
    riskScores, timestamps, eventDates, severities,
    eventActors, eventRisks, eventAssets,
    actorEvents, riskEvents, assetEvents,
    isLoading, error,
  };
}
