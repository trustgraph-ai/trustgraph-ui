import { useEffect, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";
import type { Triple, Term } from "@trustgraph/react-state";
import type { BaseApi } from "@trustgraph/react-provider";
import type { ExplainNode } from "./useExplainSession";
import { COLLECTION } from "../config";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const TG = "https://trustgraph.ai/ns/";
const TG_QUERY = TG + "query";
const TG_CONCEPT = TG + "concept";
const TG_ENTITY = TG + "entity";
const TG_EDGE_COUNT = TG + "edgeCount";
const TG_SELECTED_EDGE = TG + "selectedEdge";
const TG_EDGE = TG + "edge";
const TG_REASONING = TG + "reasoning";
const TG_CONTENT = TG + "content";
const TG_CHUNK_COUNT = TG + "chunkCount";
const TG_ACTION = TG + "action";
const TG_ARGUMENTS = TG + "arguments";
const TG_THOUGHT = TG + "thought";
const TG_OBSERVATION = TG + "observation";
const TG_DOCUMENT = TG + "document";
const TG_CONTAINS = TG + "contains";
const TG_SUBAGENT_GOAL = TG + "subagentGoal";
const PROV = "http://www.w3.org/ns/prov#";
const PROV_STARTED_AT_TIME = PROV + "startedAtTime";
const PROV_WAS_DERIVED_FROM = PROV + "wasDerivedFrom";
const PROV_WAS_GENERATED_BY = PROV + "wasGeneratedBy";

// Type checks — first match wins
const TYPE_CHECKS: [string, string][] = [
  [TG + "GraphRagQuestion", "question"],
  [TG + "DocRagQuestion", "question"],
  [TG + "AgentQuestion", "question"],
  [TG + "Question", "question"],
  [TG + "Grounding", "grounding"],
  [TG + "Exploration", "exploration"],
  [TG + "Focus", "focus"],
  [TG + "Synthesis", "synthesis"],
  [TG + "Reflection", "reflection"],
  [TG + "Thought", "reflection"],
  [TG + "Observation", "reflection"],
  [TG + "Analysis", "analysis"],
  [TG + "Decomposition", "decomposition"],
  [TG + "Conclusion", "conclusion"],
];

function predIri(triple: Triple): string {
  return triple.p.t === "i" ? triple.p.i : "";
}

function objValue(triple: Triple): string {
  const o = triple.o;
  if (o.t === "i") return o.i;
  if (o.t === "l") return o.v;
  if (o.t === "b") return o.d;
  return "";
}

function objQuotedTriple(triple: Triple): { s: string; p: string; o: string } | null {
  const o = triple.o;
  if (o.t === "t" && o.tr) {
    return {
      s: o.tr.s.t === "i" ? o.tr.s.i : (o.tr.s as any).v || "",
      p: o.tr.p.t === "i" ? o.tr.p.i : (o.tr.p as any).v || "",
      o: o.tr.o.t === "i" ? o.tr.o.i : (o.tr.o as any).v || "",
    };
  }
  return null;
}

const RDFS_LABEL_URI = "http://www.w3.org/2000/01/rdf-schema#label";

/**
 * Extract derivation links (prov:wasDerivedFrom, prov:wasGeneratedBy)
 * and rdfs:label from an event's triples.
 */
function extractDerivationInfo(triples: Triple[]): { derivedFrom: string[]; label?: string } {
  const derivedFrom: string[] = [];
  let label: string | undefined;

  for (const t of triples) {
    const p = predIri(t);
    const val = objValue(t);
    if (p === PROV_WAS_DERIVED_FROM && val) {
      derivedFrom.push(val);
    } else if (p === PROV_WAS_GENERATED_BY && val) {
      derivedFrom.push(val);
    } else if (p === RDFS_LABEL_URI && val) {
      label = val;
    }
  }

  return { derivedFrom, label };
}

function shortUri(uri: string): string {
  const pos = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return pos >= 0 ? uri.slice(pos + 1) : uri;
}

function getEventTypeFromTriples(triples: Triple[]): string {
  const types = new Set<string>();
  for (const t of triples) {
    if (predIri(t) === RDF_TYPE) types.add(objValue(t));
  }
  for (const [typeUri, displayName] of TYPE_CHECKS) {
    if (types.has(typeUri)) return displayName;
  }

  // Unknown type — derive a readable name from the most specific RDF type URI.
  // Filter out generic types like prov:Entity, owl:Thing, rdfs:Resource.
  const GENERIC_TYPES = new Set([
    "http://www.w3.org/ns/prov#Entity",
    "http://www.w3.org/ns/prov#Activity",
    "http://www.w3.org/2002/07/owl#Thing",
    "http://www.w3.org/2000/01/rdf-schema#Resource",
  ]);
  for (const typeUri of types) {
    if (!GENERIC_TYPES.has(typeUri)) {
      return shortUri(typeUri).toLowerCase();
    }
  }
  return "unknown";
}

function parseBasicEventData(eventType: string, triples: Triple[]): unknown {
  switch (eventType) {
    case "question": {
      const data: Record<string, string> = {};
      for (const t of triples) {
        const p = predIri(t);
        if (p === TG_QUERY) data.query = objValue(t);
        if (p === PROV_STARTED_AT_TIME) data.timestamp = objValue(t);
      }
      return data;
    }
    case "grounding": {
      const concepts: string[] = [];
      for (const t of triples) {
        if (predIri(t) === TG_CONCEPT) {
          const v = objValue(t);
          if (v) concepts.push(v);
        }
      }
      return { concepts };
    }
    case "exploration": {
      const data: { entities: string[]; edgeCount?: string; chunkCount?: string } = { entities: [] };
      for (const t of triples) {
        const p = predIri(t);
        if (p === TG_EDGE_COUNT) data.edgeCount = objValue(t);
        if (p === TG_CHUNK_COUNT) data.chunkCount = objValue(t);
        if (p === TG_ENTITY) {
          const uri = objValue(t);
          if (uri) data.entities.push(uri);
        }
      }
      return data;
    }
    case "focus": {
      const edgeSelUris: string[] = [];
      for (const t of triples) {
        if (predIri(t) === TG_SELECTED_EDGE) {
          const uri = objValue(t);
          if (uri) edgeSelUris.push(uri);
        }
      }
      return { edgeSelections: edgeSelUris.map(uri => ({ edgeUri: uri })) };
    }
    case "synthesis": {
      const data: { contentLength?: number } = {};
      for (const t of triples) {
        if (predIri(t) === TG_CONTENT) {
          data.contentLength = objValue(t).length;
        }
      }
      return data;
    }
    case "analysis": {
      const data: Record<string, string> = {};
      for (const t of triples) {
        const p = predIri(t);
        if (p === TG_ACTION) data.action = objValue(t);
        if (p === TG_ARGUMENTS) data.arguments = objValue(t);
        if (p === TG_THOUGHT) data.thoughtUri = objValue(t);
        if (p === TG_OBSERVATION) data.observationUri = objValue(t);
      }
      return data;
    }
    case "decomposition": {
      const goals: string[] = [];
      for (const t of triples) {
        if (predIri(t) === TG_SUBAGENT_GOAL) {
          const v = objValue(t);
          if (v) goals.push(v);
        }
      }
      return { goals };
    }
    case "conclusion":
    case "reflection": {
      const data: Record<string, string> = {};
      for (const t of triples) {
        if (predIri(t) === TG_DOCUMENT) data.documentUri = objValue(t);
      }
      return data;
    }
    default:
      return {};
  }
}

async function queryTriplesUntilSettled(
  api: ReturnType<BaseApi["flow"]>,
  subject: string,
  onUpdate: (triples: Triple[]) => void,
  limit = 100,
  collection = COLLECTION,
  graph?: string,
  maxTries = 6,
): Promise<Triple[]> {
  let prevCount = -1;
  let settled: Triple[] = [];
  let delay = 50;
  const s: Term = { t: "i", i: subject };

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const triples = await api.triplesQuery(s, undefined, undefined, limit, collection, graph);

    if (triples.length !== prevCount) {
      settled = triples;
      onUpdate(triples);
    } else {
      return settled;
    }

    prevCount = triples.length;

    if (attempt < maxTries - 1) {
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 3, 1500);
    }
  }

  return settled;
}

async function resolveLabel(
  api: ReturnType<BaseApi["flow"]>,
  uri: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(uri)) return cache.get(uri)!;
  try {
    const triples = await api.triplesQuery(
      { t: "i", i: uri },
      { t: "i", i: RDFS_LABEL },
      undefined, 1, COLLECTION,
    );
    const label = triples.length > 0 ? objValue(triples[0]) : shortUri(uri);
    cache.set(uri, label);
    return label;
  } catch {
    const fallback = shortUri(uri);
    cache.set(uri, fallback);
    return fallback;
  }
}

export interface ProvenanceChain {
  chain: { uri: string; label: string }[];
}

async function traceProvenanceChain(
  api: ReturnType<BaseApi["flow"]>,
  startUri: string,
  labelCache: Map<string, string>,
  maxDepth = 10,
): Promise<ProvenanceChain> {
  const chain: { uri: string; label: string }[] = [];
  let current: string | null = startUri;

  for (let i = 0; i < maxDepth && current; i++) {
    const label = await resolveLabel(api, current, labelCache);
    chain.push({ uri: current, label });

    const parentTriples = await api.triplesQuery(
      { t: "i", i: current },
      { t: "i", i: PROV_WAS_DERIVED_FROM },
      undefined, 1, COLLECTION,
    );

    const parentUri = parentTriples.length > 0 ? objValue(parentTriples[0]) : null;
    if (!parentUri || parentUri === current) break;
    current = parentUri;
  }

  return { chain };
}

async function queryEdgeProvenance(
  api: ReturnType<BaseApi["flow"]>,
  edge: { s: string; p: string; o: string },
  labelCache: Map<string, string>,
): Promise<ProvenanceChain[]> {
  const oTerm: Term = (edge.o.startsWith("http") || edge.o.startsWith("urn:"))
    ? { t: "i", i: edge.o }
    : { t: "l", v: edge.o };

  const containsTriples = await api.triplesQuery(
    undefined,
    { t: "i", i: TG_CONTAINS },
    {
      t: "t",
      tr: {
        s: { t: "i", i: edge.s },
        p: { t: "i", i: edge.p },
        o: oTerm,
      },
    },
    10, COLLECTION,
  );

  const chains: ProvenanceChain[] = [];
  for (const t of containsTriples) {
    const subgraphUri = t.s.t === "i" ? t.s.i : "";
    if (!subgraphUri) continue;

    const derivedTriples = await api.triplesQuery(
      { t: "i", i: subgraphUri },
      { t: "i", i: PROV_WAS_DERIVED_FROM },
      undefined, 10, COLLECTION,
    );

    for (const dt of derivedTriples) {
      const sourceUri = objValue(dt);
      if (sourceUri) {
        const chain = await traceProvenanceChain(api, sourceUri, labelCache);
        chains.push(chain);
      }
    }
  }

  return chains;
}

async function enrichEventData(
  api: ReturnType<BaseApi["flow"]>,
  eventType: string,
  basicData: unknown,
  labelCache: Map<string, string>,
  explainGraph: string,
): Promise<unknown> {
  switch (eventType) {
    case "exploration": {
      const data = { ...(basicData as { entities: string[]; entityLabels?: string[] }) };
      if (data.entities.length > 0) {
        data.entityLabels = await Promise.all(
          data.entities.map(uri => resolveLabel(api, uri, labelCache))
        );
      }
      return data;
    }
    case "focus": {
      const basic = basicData as { edgeSelections: Array<{ edgeUri: string; edge?: any; edgeLabels?: any; reasoning?: string }> };
      const edgeSelections = await Promise.all(basic.edgeSelections.map(async (basicSel) => {
        const s: Term = { t: "i", i: basicSel.edgeUri };
        const edgeTriples = await api.triplesQuery(s, undefined, undefined, 100, COLLECTION, explainGraph);

        const sel: any = { edgeUri: basicSel.edgeUri };
        for (const et of edgeTriples) {
          const p = predIri(et);
          if (p === TG_EDGE) sel.edge = objQuotedTriple(et) || undefined;
          if (p === TG_REASONING) sel.reasoning = objValue(et);
        }

        if (sel.edge) {
          const [labels, sources] = await Promise.all([
            Promise.all([
              resolveLabel(api, sel.edge.s, labelCache),
              resolveLabel(api, sel.edge.p, labelCache),
              resolveLabel(api, sel.edge.o, labelCache),
            ]),
            queryEdgeProvenance(api, sel.edge, labelCache),
          ]);
          sel.edgeLabels = { s: labels[0], p: labels[1], o: labels[2] };
          sel.sources = sources;
        }

        return sel;
      }));

      return { edgeSelections };
    }
    default:
      return basicData;
  }
}

/**
 * Automatically fetches and parses explain events as they arrive.
 * Watches the events list and fetches data for any unfetched events.
 */
export function useExplainEventFetcher(
  events: ExplainNode[],
  updateEvent: (explainId: string, updates: Partial<ExplainNode>) => void,
) {
  const socket = useSocket();
  const labelCacheRef = useRef(new Map<string, string>());
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const MAX_EMPTY_RETRIES = 5;
  const EMPTY_RETRY_DELAYS = [500, 1000, 2000, 4000, 8000];

  const fetchNode = useCallback(async (explainId: string) => {
    updateEvent(explainId, { fetching: true });

    try {
      const api = socket.flow("default");
      const node = eventsRef.current.find(n => n.explainId === explainId);
      if (!node) return;

      // Wait before first fetch to give the backend time to write triples.
      // Increase delay on each empty retry.
      const retryIndex = node.emptyRetries;
      const initialDelay = EMPTY_RETRY_DELAYS[Math.min(retryIndex, EMPTY_RETRY_DELAYS.length - 1)];
      await new Promise(r => setTimeout(r, initialDelay));

      let latestEventType = "unknown";
      let latestBasicData: unknown = {};

      const settledTriples = await queryTriplesUntilSettled(
        api, node.explainId,
        (triples) => {
          latestEventType = getEventTypeFromTriples(triples);
          latestBasicData = parseBasicEventData(latestEventType, triples);
          const { derivedFrom, label } = extractDerivationInfo(triples);
          updateEvent(explainId, {
            eventType: latestEventType,
            label,
            data: latestBasicData,
            derivedFrom: derivedFrom.length > 0 ? derivedFrom : undefined,
            fetched: true,
            fetching: false,
          });
        },
        100, COLLECTION, node.explainGraph,
      );

      if (settledTriples.length === 0) {
        if (retryIndex < MAX_EMPTY_RETRIES) {
          // Not fetched yet — allow the useEffect to schedule another attempt
          updateEvent(explainId, {
            fetching: false,
            emptyRetries: retryIndex + 1,
          });
        } else {
          // Give up after max retries
          updateEvent(explainId, { fetched: true, fetching: false });
        }
        return;
      }

      const enriched = await enrichEventData(
        api, latestEventType, latestBasicData, labelCacheRef.current, node.explainGraph,
      );
      if (enriched !== latestBasicData) {
        updateEvent(explainId, { data: enriched });
      }
    } catch (err) {
      updateEvent(explainId, {
        error: String(err),
        fetching: false,
      });
    }
  }, [socket, updateEvent]);

  useEffect(() => {
    for (const node of events) {
      if (!node.fetched && !node.fetching && !node.error) {
        fetchNode(node.explainId);
      }
    }
  }, [events, fetchNode]);

  return { labelCache: labelCacheRef };
}
