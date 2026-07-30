import { useState, useEffect, useMemo } from "react";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const GT = "http://trustgraph.ai/schemas/gametheory#";

function q(body: string): string {
  return `PREFIX gt: <${GT}>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n${body}`;
}

export interface GTNode {
  uri: string;
  label: string;
  kind: "Game" | "Player" | "DecisionNode" | "ChanceNode" | "OutcomeNode" | "Action" | "Payoff";
}

export type GTRelation = [string, string];

export function useGameTheoryData() {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [nodes, setNodes] = useState<Map<string, GTNode>>(new Map());
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());
  const [probabilities, setProbabilities] = useState<Map<string, number>>(new Map());
  const [utilities, setUtilities] = useState<Map<string, number>>(new Map());
  const [actionLabels, setActionLabels] = useState<Map<string, string>>(new Map());

  const [hasRootNodeRel, setHasRootNodeRel] = useState<GTRelation[]>([]);
  const [belongsToPlayerRel, setBelongsToPlayerRel] = useState<GTRelation[]>([]);
  const [hasActionRel, setHasActionRel] = useState<GTRelation[]>([]);
  const [leadsToNodeRel, setLeadsToNodeRel] = useState<GTRelation[]>([]);
  const [hasPayoffRel, setHasPayoffRel] = useState<GTRelation[]>([]);
  const [forPlayerRel, setForPlayerRel] = useState<GTRelation[]>([]);

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

        const allTypeQueries = [
          { type: "Game" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:Game ; rdfs:label ?label . }`) },
          { type: "Player" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:Player ; rdfs:label ?label . }`) },
          { type: "DecisionNode" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:DecisionNode ; rdfs:label ?label . }`) },
          { type: "ChanceNode" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:ChanceNode ; rdfs:label ?label . }`) },
          { type: "OutcomeNode" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:OutcomeNode ; rdfs:label ?label . }`) },
          { type: "Action" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:Action ; rdfs:label ?label . }`) },
          { type: "Payoff" as const, query: q(`SELECT ?e ?label WHERE { ?e a gt:Payoff ; rdfs:label ?label . }`) },
        ];

        const relQueries = [
          { key: "hasRootNode", query: q(`SELECT ?game ?node WHERE { ?game gt:hasRootNode ?node . }`) },
          { key: "belongsToPlayer", query: q(`SELECT ?node ?player WHERE { ?node gt:belongsToPlayer ?player . }`) },
          { key: "hasAction", query: q(`SELECT ?node ?action WHERE { ?node gt:hasAction ?action . }`) },
          { key: "leadsToNode", query: q(`SELECT ?action ?node WHERE { ?action gt:leadsToNode ?node . }`) },
          { key: "hasPayoff", query: q(`SELECT ?outcome ?payoff WHERE { ?outcome gt:hasPayoff ?payoff . }`) },
          { key: "forPlayer", query: q(`SELECT ?payoff ?player WHERE { ?payoff gt:forPlayer ?player . }`) },
        ];

        const propQueries = [
          { key: "rdfsComment", query: q(`SELECT ?e ?v WHERE { ?e rdfs:comment ?v . }`) },
          { key: "skosDefn", query: q(`PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\nSELECT ?e ?v WHERE { ?e skos:definition ?v . }`) },
          { key: "hasProbability", query: q(`SELECT ?action ?prob WHERE { ?action gt:hasProbability ?prob . }`) },
          { key: "utilityValue", query: q(`SELECT ?payoff ?val WHERE { ?payoff gt:utilityValue ?val . }`) },
          { key: "actionLabel", query: q(`SELECT ?action ?label WHERE { ?action gt:actionLabel ?label . }`) },
        ];

        const [typeResults, relResults, propResults] = await Promise.all([
          Promise.all(allTypeQueries.map(tq => api.sparqlQuery(tq.query, collection))),
          Promise.all(relQueries.map(rq => api.sparqlQuery(rq.query, collection))),
          Promise.all(propQueries.map(pq => api.sparqlQuery(pq.query, collection))),
        ]);

        if (cancelled) return;

        const nodeMap = new Map<string, GTNode>();
        for (let i = 0; i < allTypeQueries.length; i++) {
          const kind = allTypeQueries[i].type;
          for (const r of typeResults[i].rows) {
            if (r.e && !nodeMap.has(r.e)) {
              nodeMap.set(r.e, { uri: r.e, label: r.label || r.e, kind });
            }
          }
        }
        setNodes(nodeMap);

        const setRelFromResults = (idx: number, setter: (v: GTRelation[]) => void, k1: string, k2: string) => {
          setter(relResults[idx].rows.map(r => [r[k1], r[k2]]));
        };

        setRelFromResults(0, setHasRootNodeRel, "game", "node");
        setRelFromResults(1, setBelongsToPlayerRel, "node", "player");
        setRelFromResults(2, setHasActionRel, "node", "action");
        setRelFromResults(3, setLeadsToNodeRel, "action", "node");
        setRelFromResults(4, setHasPayoffRel, "outcome", "payoff");
        setRelFromResults(5, setForPlayerRel, "payoff", "player");

        // Descriptions: rdfs:comment first, skos:definition as fallback
        const descMap = new Map<string, string>();
        for (const r of propResults[0].rows) if (r.e && r.v) descMap.set(r.e, r.v);
        for (const r of propResults[1].rows) if (r.e && r.v && !descMap.has(r.e)) descMap.set(r.e, r.v);
        setDescriptions(descMap);

        const probMap = new Map<string, number>();
        for (const r of propResults[2].rows) if (r.action && r.prob) probMap.set(r.action, parseFloat(r.prob));
        setProbabilities(probMap);

        const utilMap = new Map<string, number>();
        for (const r of propResults[3].rows) if (r.payoff && r.val) utilMap.set(r.payoff, parseInt(r.val, 10));
        setUtilities(utilMap);

        const alMap = new Map<string, string>();
        for (const r of propResults[4].rows) if (r.action && r.label) alMap.set(r.action, r.label);
        setActionLabels(alMap);

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

  const buildRelMap = (rels: GTRelation[]) => {
    const m = new Map<string, string[]>();
    for (const [from, to] of rels) {
      const list = m.get(from) || [];
      list.push(to);
      m.set(from, list);
    }
    return m;
  };

  const buildSingleMap = (rels: GTRelation[]) => {
    const m = new Map<string, string>();
    for (const [from, to] of rels) {
      m.set(from, to);
    }
    return m;
  };

  // Forward adjacency maps (single-value)
  const gameRoots = useMemo(() => buildSingleMap(hasRootNodeRel), [hasRootNodeRel]);
  const nodePlayer = useMemo(() => buildSingleMap(belongsToPlayerRel), [belongsToPlayerRel]);
  const actionTarget = useMemo(() => buildSingleMap(leadsToNodeRel), [leadsToNodeRel]);
  const payoffPlayer = useMemo(() => buildSingleMap(forPlayerRel), [forPlayerRel]);

  // Forward adjacency maps (multi-value)
  const nodeActions = useMemo(() => buildRelMap(hasActionRel), [hasActionRel]);
  const outcomePayoffs = useMemo(() => buildRelMap(hasPayoffRel), [hasPayoffRel]);

  return {
    nodes, descriptions,
    probabilities, utilities, actionLabels,
    gameRoots, nodePlayer, nodeActions,
    actionTarget, outcomePayoffs, payoffPlayer,
    isLoading: isLoading || !isSocketReady, error,
  };
}
