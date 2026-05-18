import { useState, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";
import type { Triple } from "@trustgraph/react-state";
import { COLLECTION } from "../config";
import { domainColors } from "../theme";
import { getLocalName } from "../utils/uri";

// ── Types ────────────────────────────────────────────────────────

export interface RawNode {
  id: string;
  label: string;
  description: string;
  color: string;
  glow: string;
  properties: Record<string, string[]>;
  outDegree: number;
  inDegree: number;
}

export interface RawEdge {
  from: string;
  to: string;
  predicate: string;
  predicateUri: string;
  color: string;
}

export interface PredicateInfo {
  uri: string;
  label: string;
  color: string;
  count: number;
}

// ── Helpers ──────────────────────────────────────────────────────

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

export function getTermValue(term: { t: string; i?: string; v?: string }): string {
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  return "";
}

export function isUri(term: { t: string }): boolean {
  return term.t === "i";
}

export function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function colorForUri(uri: string): { color: string; glow: string } {
  const idx = hashString(uri) % domainColors.length;
  return domainColors[idx];
}

export function predicateLabel(uri: string): string {
  const name = getLocalName(uri);
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function makeIriTerm(uri: string) {
  return { t: "i" as const, i: uri };
}

// ── Process triples into nodes and edges ─────────────────────────

export function processTriples(
  triples: Triple[],
  nodeMap: Map<string, RawNode>,
  edgeSet: Set<string>,
  edgeList: RawEdge[],
  predMap: Map<string, PredicateInfo>,
) {
  // First pass: collect labels
  const labels = new Map<string, string>();
  for (const triple of triples) {
    if (getTermValue(triple.p) === RDFS_LABEL) {
      labels.set(getTermValue(triple.s), getTermValue(triple.o));
    }
  }

  // Update existing nodes with newly discovered labels
  for (const [uri, label] of labels) {
    const existing = nodeMap.get(uri);
    if (existing && existing.label === getLocalName(uri)) {
      existing.label = label;
    }
  }

  function ensureNode(uri: string): void {
    if (nodeMap.has(uri)) return;
    const { color, glow } = colorForUri(uri);
    nodeMap.set(uri, {
      id: uri,
      label: labels.get(uri) || getLocalName(uri),
      description: "",
      color,
      glow,
      properties: {},
      outDegree: 0,
      inDegree: 0,
    });
  }

  // Second pass: build edges and properties
  for (const triple of triples) {
    const subUri = getTermValue(triple.s);
    const predUri = getTermValue(triple.p);
    const objValue = getTermValue(triple.o);

    if (predUri === RDFS_LABEL) continue;

    if (isUri(triple.s) && isUri(triple.o)) {
      ensureNode(subUri);
      ensureNode(objValue);

      // Deduplicate edges
      const edgeKey = `${subUri}|${predUri}|${objValue}`;
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      const predName = predicateLabel(predUri);

      if (!predMap.has(predUri)) {
        const { color } = colorForUri(predUri);
        predMap.set(predUri, { uri: predUri, label: predName, color, count: 0 });
      }
      predMap.get(predUri)!.count++;

      edgeList.push({
        from: subUri,
        to: objValue,
        predicate: predName,
        predicateUri: predUri,
        color: predMap.get(predUri)!.color,
      });

      // Update degrees
      const fromNode = nodeMap.get(subUri)!;
      const toNode = nodeMap.get(objValue)!;
      fromNode.outDegree++;
      toNode.inDegree++;

    } else if (isUri(triple.s) && !isUri(triple.o)) {
      ensureNode(subUri);
      const node = nodeMap.get(subUri)!;
      const propKey = predicateLabel(predUri);
      if (!node.properties[propKey]) node.properties[propKey] = [];
      if (!node.properties[propKey].includes(objValue)) {
        node.properties[propKey].push(objValue);
      }
    }
  }
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRawGraphData() {
  const socket = useSocket();

  // Shared mutable cache — refs so fetches don't re-render until we snapshot
  const nodeMapRef = useRef(new Map<string, RawNode>());
  const edgeListRef = useRef<RawEdge[]>([]);
  const edgeSetRef = useRef(new Set<string>());
  const predMapRef = useRef(new Map<string, PredicateInfo>());
  const fetchedRef = useRef(new Set<string>());

  // Snapshot state that triggers re-renders
  const [nodes, setNodes] = useState(new Map<string, RawNode>());
  const [edges, setEdges] = useState<RawEdge[]>([]);
  const [predicates, setPredicates] = useState(new Map<string, PredicateInfo>());
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch neighbourhood for a single URI — returns the new nodes found
  const fetchNeighbourhood = useCallback(async (uri: string): Promise<string[]> => {
    if (fetchedRef.current.has(uri)) return [];
    fetchedRef.current.add(uri);

    setIsFetching(true);
    setIsError(false);
    setError(null);

    try {
      const api = socket.flow("default");

      // Fetch outgoing and incoming triples in parallel
      const [outgoing, incoming] = await Promise.all([
        api.triplesQuery(makeIriTerm(uri), undefined, undefined, 500, COLLECTION, ""),
        api.triplesQuery(undefined, undefined, makeIriTerm(uri), 500, COLLECTION, ""),
      ]);

      const allTriples = [...outgoing, ...incoming];

      // Also fetch labels for any newly discovered URIs
      const newUris = new Set<string>();
      for (const triple of allTriples) {
        if (isUri(triple.s)) newUris.add(getTermValue(triple.s));
        if (isUri(triple.o)) newUris.add(getTermValue(triple.o));
      }

      // Fetch labels for new URIs we haven't seen
      const labelFetches: Promise<Triple[]>[] = [];
      for (const u of newUris) {
        if (!nodeMapRef.current.has(u)) {
          labelFetches.push(
            api.triplesQuery(makeIriTerm(u), makeIriTerm(RDFS_LABEL), undefined, 1, COLLECTION, ""),
          );
        }
      }

      const labelResults = await Promise.all(labelFetches);
      const labelTriples = labelResults.flat();

      // Process everything into the cache
      processTriples(
        [...allTriples, ...labelTriples],
        nodeMapRef.current,
        edgeSetRef.current,
        edgeListRef.current,
        predMapRef.current,
      );

      // Ensure the fetched node itself exists, even if it has no edges
      if (!nodeMapRef.current.has(uri)) {
        const { color, glow } = colorForUri(uri);
        // Check if we got a label from the outgoing triples
        let label = getLocalName(uri);
        for (const t of outgoing) {
          if (getTermValue(t.p) === RDFS_LABEL) {
            label = getTermValue(t.o);
            break;
          }
        }
        nodeMapRef.current.set(uri, {
          id: uri,
          label,
          description: "",
          color,
          glow,
          properties: {},
          outDegree: 0,
          inDegree: 0,
        });
      }

      // Snapshot to trigger re-render
      setNodes(new Map(nodeMapRef.current));
      setEdges([...edgeListRef.current]);
      setPredicates(new Map(predMapRef.current));
      setIsFetching(false);

      // Return newly discovered node URIs
      const newNodes: string[] = [];
      for (const u of newUris) {
        if (nodeMapRef.current.has(u)) newNodes.push(u);
      }
      return newNodes;

    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsFetching(false);
      return [];
    }
  }, [socket]);

  // Reset the cache (for search "go somewhere new")
  const resetCache = useCallback(() => {
    nodeMapRef.current = new Map();
    edgeListRef.current = [];
    edgeSetRef.current = new Set();
    predMapRef.current = new Map();
    fetchedRef.current = new Set();
    setNodes(new Map());
    setEdges([]);
    setPredicates(new Map());
  }, []);

  // Find a starting node by fetching a small sample of triples
  const findStartNode = useCallback(async (): Promise<string | null> => {
    try {
      const api = socket.flow("default");
      const sample = await api.triplesQuery(undefined, undefined, undefined, 100, COLLECTION, "");

      // Count URI occurrences to find the most connected
      const counts = new Map<string, number>();
      for (const triple of sample) {
        if (isUri(triple.s)) {
          const uri = getTermValue(triple.s);
          counts.set(uri, (counts.get(uri) || 0) + 1);
        }
        if (isUri(triple.o)) {
          const uri = getTermValue(triple.o);
          counts.set(uri, (counts.get(uri) || 0) + 1);
        }
      }

      // Pick the most frequent URI
      let bestUri: string | null = null;
      let bestCount = 0;
      for (const [uri, count] of counts) {
        if (count > bestCount) {
          bestCount = count;
          bestUri = uri;
        }
      }

      return bestUri;
    } catch {
      return null;
    }
  }, [socket]);

  // Search index: every URI with an rdfs:label
  const labelsRef = useRef<Map<string, string> | null>(null);
  const labelsBuildingRef = useRef(false);

  const buildSearchIndex = useCallback(async () => {
    if (labelsRef.current || labelsBuildingRef.current) return;
    labelsBuildingRef.current = true;

    try {
      const api = socket.flow("default");
      const labelTriples = await api.triplesQuery(
        undefined, makeIriTerm(RDFS_LABEL), undefined,
        10000, COLLECTION, "",
      );

      const labels = new Map<string, string>();
      for (const triple of labelTriples) {
        if (isUri(triple.s)) {
          labels.set(getTermValue(triple.s), getTermValue(triple.o));
        }
      }

      labelsRef.current = labels;
    } catch {
      labelsBuildingRef.current = false;
    }
  }, [socket]);

  // Search: build index if needed, then filter
  const searchNodes = useCallback(async (query: string): Promise<RawNode[]> => {
    await buildSearchIndex();

    const labels = labelsRef.current;
    if (!labels) return [];
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const results: RawNode[] = [];
    for (const [uri, label] of labels) {
      if (label.toLowerCase().includes(q)) {
        const { color, glow } = colorForUri(uri);
        results.push({
          id: uri,
          label,
          description: "",
          color,
          glow,
          properties: {},
          outDegree: 0,
          inDegree: 0,
        });
        if (results.length >= 20) break;
      }
    }
    return results;
  }, [buildSearchIndex]);

  return { nodes, edges, predicates, isFetching, isError, error, fetchNeighbourhood, resetCache, findStartNode, searchNodes };
}
