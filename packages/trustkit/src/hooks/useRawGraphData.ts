import { useState, useEffect, useMemo } from "react";
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
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";

function getTermValue(term: { t: string; i?: string; v?: string }): string {
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  return "";
}

function isUri(term: { t: string }): boolean {
  return term.t === "i";
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function colorForUri(uri: string): { color: string; glow: string } {
  const idx = hashString(uri) % domainColors.length;
  return domainColors[idx];
}

function predicateLabel(uri: string): string {
  const name = getLocalName(uri);
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRawGraphData() {
  const socket = useSocket();
  const [triples, setTriples] = useState<Triple[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        setError(null);

        const api = socket.flow("default");
        const result = await api.triplesQuery(
          undefined, undefined, undefined,
          10000, COLLECTION, "",
        );

        if (!cancelled) {
          setTriples(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsError(true);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket]);

  const { nodes, edges, predicates, startNode } = useMemo(() => {
    const empty = {
      nodes: new Map<string, RawNode>(),
      edges: [] as RawEdge[],
      predicates: new Map<string, PredicateInfo>(),
      startNode: null as string | null,
    };

    if (isLoading || !triples) return empty;

    // Pass 1: collect labels and descriptions
    const labels = new Map<string, string>();
    const descriptions = new Map<string, string>();
    for (const triple of triples) {
      const pred = getTermValue(triple.p);
      if (pred === RDFS_LABEL) {
        labels.set(getTermValue(triple.s), getTermValue(triple.o));
      } else if (pred === RDFS_COMMENT) {
        descriptions.set(getTermValue(triple.s), getTermValue(triple.o));
      }
    }

    // Pass 2: build node index and edges
    const nodeMap = new Map<string, RawNode>();
    const edgeList: RawEdge[] = [];
    const predMap = new Map<string, PredicateInfo>();
    const outDegrees = new Map<string, number>();
    const inDegrees = new Map<string, number>();
    const nodeProps = new Map<string, Record<string, string[]>>();

    function ensureNode(uri: string): void {
      if (nodeMap.has(uri)) return;
      const { color, glow } = colorForUri(uri);
      nodeMap.set(uri, {
        id: uri,
        label: labels.get(uri) || getLocalName(uri),
        description: descriptions.get(uri) || "",
        color,
        glow,
        properties: {},
        outDegree: 0,
        inDegree: 0,
      });
    }

    for (const triple of triples) {
      const subUri = getTermValue(triple.s);
      const predUri = getTermValue(triple.p);
      const objValue = getTermValue(triple.o);

      // Skip label and description triples — they're first-class fields
      if (predUri === RDFS_LABEL || predUri === RDFS_COMMENT) continue;

      if (isUri(triple.s) && isUri(triple.o)) {
        // URI-to-URI: this is an edge
        ensureNode(subUri);
        ensureNode(objValue);

        const predName = predicateLabel(predUri);

        // Track predicate info
        if (!predMap.has(predUri)) {
          const { color } = colorForUri(predUri);
          predMap.set(predUri, {
            uri: predUri,
            label: predName,
            color,
            count: 0,
          });
        }
        predMap.get(predUri)!.count++;

        edgeList.push({
          from: subUri,
          to: objValue,
          predicate: predName,
          predicateUri: predUri,
          color: predMap.get(predUri)!.color,
        });

        outDegrees.set(subUri, (outDegrees.get(subUri) || 0) + 1);
        inDegrees.set(objValue, (inDegrees.get(objValue) || 0) + 1);

      } else if (isUri(triple.s) && !isUri(triple.o)) {
        // URI-to-literal: this is a property
        ensureNode(subUri);
        const propKey = predicateLabel(predUri);
        if (!nodeProps.has(subUri)) nodeProps.set(subUri, {});
        const props = nodeProps.get(subUri)!;
        if (!props[propKey]) props[propKey] = [];
        props[propKey].push(objValue);
      }
    }

    // Apply degrees and properties to nodes
    for (const [uri, node] of nodeMap) {
      node.outDegree = outDegrees.get(uri) || 0;
      node.inDegree = inDegrees.get(uri) || 0;
      node.properties = nodeProps.get(uri) || {};
    }

    // Find most connected node as default start
    let bestUri: string | null = null;
    let bestDegree = -1;
    for (const [uri, node] of nodeMap) {
      const degree = node.outDegree + node.inDegree;
      if (degree > bestDegree) {
        bestDegree = degree;
        bestUri = uri;
      }
    }

    return {
      nodes: nodeMap,
      edges: edgeList,
      predicates: predMap,
      startNode: bestUri,
    };
  }, [isLoading, triples]);

  return { nodes, edges, predicates, startNode, isLoading, isError, error };
}

// ── Neighbourhood extraction ─────────────────────────────────────

export function getNeighbourhood(
  centerUris: string | string[],
  nodes: Map<string, RawNode>,
  edges: RawEdge[],
  depth: number = 2,
): { visibleNodes: RawNode[]; visibleEdges: RawEdge[] } {
  const seeds = Array.isArray(centerUris) ? centerUris : [centerUris];
  const visited = new Set<string>(seeds);

  // Build adjacency for BFS
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)!.add(edge.to);
    adjacency.get(edge.to)!.add(edge.from);
  }

  // BFS from every seed independently to the given depth
  let frontier = [...seeds];
  for (let d = 0; d < depth; d++) {
    const nextFrontier: string[] = [];
    for (const uri of frontier) {
      const neighbours = adjacency.get(uri);
      if (!neighbours) continue;
      for (const n of neighbours) {
        if (!visited.has(n)) {
          visited.add(n);
          nextFrontier.push(n);
        }
      }
    }
    frontier = nextFrontier;
  }

  const visibleNodes: RawNode[] = [];
  for (const uri of visited) {
    const node = nodes.get(uri);
    if (node) visibleNodes.push(node);
  }

  const visibleEdges = edges.filter(
    e => visited.has(e.from) && visited.has(e.to)
  );

  return { visibleNodes, visibleEdges };
}
