import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const TG = "http://trustgraph.ai/ontology/";

function q(body: string): string {
  return `PREFIX tg: <${TG}>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n${body}`;
}

export interface RiskNode {
  uri: string;
  label: string;
  kind: string;
}

export type RiskRelation = [string, string];

export function useRiskData() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [nodes, setNodes] = useState<Map<string, RiskNode>>(new Map());
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());
  const [riskScores, setRiskScores] = useState<Map<string, number>>(new Map());
  const [timestamps, setTimestamps] = useState<Map<string, string>>(new Map());
  const [eventDates, setEventDates] = useState<Map<string, string>>(new Map());
  const [processStatus, setProcessStatus] = useState<Map<string, string>>(new Map());
  const [invokedBy, setInvokedBy] = useState<Map<string, string>>(new Map());
  const [assignedTo, setAssignedTo] = useState<Map<string, string>>(new Map());
  const [stepNumbers, setStepNumbers] = useState<Map<string, number>>(new Map());
  const [stepComplete, setStepComplete] = useState<Map<string, boolean>>(new Map());

  const [hasActorRel, setHasActorRel] = useState<RiskRelation[]>([]);
  const [hasRiskRel, setHasRiskRel] = useState<RiskRelation[]>([]);
  const [impactsAssetRel, setImpactsAssetRel] = useState<RiskRelation[]>([]);
  const [mitigatesEventRel, setMitigatesEventRel] = useState<RiskRelation[]>([]);
  const [hasStepRel, setHasStepRel] = useState<RiskRelation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const allTypeQueries = [
          { type: "Actor", query: q(`SELECT ?e ?label WHERE { ?e a tg:Actor ; rdfs:label ?label . }`) },
          { type: "Risk", query: q(`SELECT ?e ?label WHERE { ?e a tg:Risk ; rdfs:label ?label . }`) },
          { type: "Asset", query: q(`SELECT ?e ?label WHERE { ?e a tg:Asset ; rdfs:label ?label . }`) },
          { type: "Event", query: q(`SELECT ?e ?label WHERE { ?e a tg:Event ; rdfs:label ?label . }`) },
          { type: "Process", query: q(`SELECT ?e ?label WHERE { ?e a tg:Process ; rdfs:label ?label . }`) },
          { type: "ProcessStep", query: q(`SELECT ?e ?label WHERE { ?e a tg:ProcessStep ; rdfs:label ?label . }`) },
        ];

        const relQueries = [
          { key: "hasActor", query: q(`SELECT ?event ?actor WHERE { ?event tg:hasActor ?actor . }`) },
          { key: "hasRisk", query: q(`SELECT ?event ?risk WHERE { ?event tg:hasRisk ?risk . }`) },
          { key: "impactsAsset", query: q(`SELECT ?event ?asset WHERE { ?event tg:impactsAsset ?asset . }`) },
          { key: "mitigatesEvent", query: q(`SELECT ?proc ?event WHERE { ?proc tg:mitigatesEvent ?event . }`) },
          { key: "hasStep", query: q(`SELECT ?proc ?step WHERE { ?proc tg:hasStep ?step . }`) },
        ];

        const propQueries = [
          { key: "rdfsComment", query: q(`SELECT ?e ?v WHERE { ?e rdfs:comment ?v . }`) },
          { key: "skosDefn", query: q(`PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\nSELECT ?e ?v WHERE { ?e skos:definition ?v . }`) },
          { key: "riskScore", query: q(`SELECT ?risk ?score WHERE { ?risk tg:riskScore ?score . }`) },
          { key: "timestamp", query: q(`SELECT ?event ?ts WHERE { ?event tg:timestamp ?ts . }`) },
          { key: "eventDate", query: q(`SELECT ?event ?d WHERE { ?event tg:eventDate ?d . }`) },
          { key: "processStatus", query: q(`SELECT ?proc ?status WHERE { ?proc tg:processStatus ?status . }`) },
          { key: "invokedBy", query: q(`SELECT ?proc ?by WHERE { ?proc tg:invokedBy ?by . }`) },
          { key: "assignedTo", query: q(`SELECT ?e ?to WHERE { ?e tg:assignedTo ?to . }`) },
          { key: "stepNumber", query: q(`SELECT ?step ?n WHERE { ?step tg:stepNumber ?n . }`) },
          { key: "isComplete", query: q(`SELECT ?step ?v WHERE { ?step tg:isComplete ?v . }`) },
        ];

        const [typeResults, relResults, propResults] = await Promise.all([
          Promise.all(allTypeQueries.map(tq => api.sparqlQuery(tq.query, collection))),
          Promise.all(relQueries.map(rq => api.sparqlQuery(rq.query, collection))),
          Promise.all(propQueries.map(pq => api.sparqlQuery(pq.query, collection))),
        ]);

        if (cancelled) return;

        const nodeMap = new Map<string, RiskNode>();
        for (let i = 0; i < allTypeQueries.length; i++) {
          const kind = allTypeQueries[i].type;
          for (const r of typeResults[i].rows) {
            if (r.e && !nodeMap.has(r.e)) {
              nodeMap.set(r.e, { uri: r.e, label: r.label || r.e, kind });
            }
          }
        }
        setNodes(nodeMap);

        const setRelFromResults = (idx: number, setter: (v: RiskRelation[]) => void, k1: string, k2: string) => {
          setter(relResults[idx].rows.map(r => [r[k1], r[k2]]));
        };

        setRelFromResults(0, setHasActorRel, "event", "actor");
        setRelFromResults(1, setHasRiskRel, "event", "risk");
        setRelFromResults(2, setImpactsAssetRel, "event", "asset");
        setRelFromResults(3, setMitigatesEventRel, "proc", "event");
        setRelFromResults(4, setHasStepRel, "proc", "step");

        // Descriptions: rdfs:comment first, skos:definition as fallback
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

        const psMap = new Map<string, string>();
        for (const r of propResults[5].rows) if (r.proc && r.status) psMap.set(r.proc, r.status);
        setProcessStatus(psMap);

        const ibMap = new Map<string, string>();
        for (const r of propResults[6].rows) if (r.proc && r.by) ibMap.set(r.proc, r.by);
        setInvokedBy(ibMap);

        const atMap = new Map<string, string>();
        for (const r of propResults[7].rows) if (r.e && r.to) atMap.set(r.e, r.to);
        setAssignedTo(atMap);

        const snMap = new Map<string, number>();
        for (const r of propResults[8].rows) if (r.step && r.n) snMap.set(r.step, parseInt(r.n, 10));
        setStepNumbers(snMap);

        const icMap = new Map<string, boolean>();
        for (const r of propResults[9].rows) if (r.step && r.v != null) icMap.set(r.step, String(r.v) === "true");
        setStepComplete(icMap);

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

  const buildRelMap = (rels: RiskRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(from) || [];
      list.push(to);
      m.set(from, list);
    }
    return m;
  };

  // Forward adjacency maps
  const eventActors = useMemo(() => buildRelMap(hasActorRel), [hasActorRel]);
  const eventRisks = useMemo(() => buildRelMap(hasRiskRel), [hasRiskRel]);
  const eventAssets = useMemo(() => buildRelMap(impactsAssetRel), [impactsAssetRel]);
  const processEvents = useMemo(() => buildRelMap(mitigatesEventRel), [mitigatesEventRel]);
  const processSteps = useMemo(() => buildRelMap(hasStepRel), [hasStepRel]);

  // Reverse adjacency maps
  const actorEvents = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [event, actor] of hasActorRel) {
      const list = m.get(actor) || [];
      list.push(event);
      m.set(actor, list);
    }
    return m;
  }, [hasActorRel]);

  const riskEvents = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [event, risk] of hasRiskRel) {
      const list = m.get(risk) || [];
      list.push(event);
      m.set(risk, list);
    }
    return m;
  }, [hasRiskRel]);

  const assetEvents = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [event, asset] of impactsAssetRel) {
      const list = m.get(asset) || [];
      list.push(event);
      m.set(asset, list);
    }
    return m;
  }, [impactsAssetRel]);

  const eventProcesses = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [proc, event] of mitigatesEventRel) {
      const list = m.get(event) || [];
      list.push(proc);
      m.set(event, list);
    }
    return m;
  }, [mitigatesEventRel]);

  return {
    nodes, descriptions,
    riskScores, timestamps, eventDates,
    processStatus, invokedBy, assignedTo,
    stepNumbers, stepComplete,
    eventActors, eventRisks, eventAssets,
    processEvents, processSteps,
    actorEvents, riskEvents, assetEvents, eventProcesses,
    isLoading, error,
  };
}
