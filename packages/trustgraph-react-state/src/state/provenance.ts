/**
 * Hook for tracing provenance chains in the knowledge graph
 * Follows tg:contains to find subgraphs, then prov:wasDerivedFrom
 * to trace chunk → page → document chains
 */

import { useState, useCallback, useRef } from "react";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore } from "./session";
import type { Triple, Term } from "@trustgraph/client";
import {
  TG,
  PROV_WAS_DERIVED_FROM,
  RDFS_LABEL,
} from "@trustgraph/client";
import type { ProvenanceChain, ProvenanceChainItem } from "../utils/explainability";
import { getTermValue } from "../utils/explainability";

const TG_CONTAINS = TG + "contains";

export interface UseProvenanceOptions {
  flow?: string;
  collection?: string;
  /** Maximum depth to trace (default: 10) */
  maxDepth?: number;
}

export interface UseProvenanceResult {
  /** Trace provenance chain from a URI to root */
  traceChain: (uri: string) => Promise<ProvenanceChain>;
  /** Trace provenance for an edge (s, p, o) - finds containing subgraph first */
  traceEdgeProvenance: (s: string, p: string, o: string) => Promise<ProvenanceChain[]>;
  /** Resolve label for a URI (uses cache) */
  resolveLabel: (uri: string) => Promise<string>;
  /** Clear the label cache */
  clearCache: () => void;
  /** Whether any trace operation is in progress */
  isTracing: boolean;
}

/**
 * Hook for tracing provenance chains
 */
export const useProvenance = (options: UseProvenanceOptions = {}): UseProvenanceResult => {
  const { flow, collection = "default", maxDepth = 10 } = options;

  const socket = useSocket();
  const connectionState = useConnectionState();
  const sessionFlowId = useSessionStore((state) => state.flowId);
  const effectiveFlow = flow ?? sessionFlowId;

  const [isTracing, setIsTracing] = useState(false);

  // Label cache to avoid repeated queries
  const labelCacheRef = useRef<Map<string, string>>(new Map());

  /**
   * Check if connected
   */
  const isConnected = useCallback(() => {
    return (
      connectionState?.status === "authenticated" ||
      connectionState?.status === "unauthenticated"
    );
  }, [connectionState]);

  /**
   * Query for rdfs:label of a URI
   */
  const resolveLabel = useCallback(
    async (uri: string): Promise<string> => {
      // Check cache
      if (labelCacheRef.current.has(uri)) {
        return labelCacheRef.current.get(uri)!;
      }

      // Not an IRI - return as-is
      if (!uri.startsWith("http") && !uri.startsWith("urn:")) {
        return uri;
      }

      if (!isConnected()) {
        return uri;
      }

      try {
        const triples = await socket
          .flow(effectiveFlow)
          .triplesQuery(
            { t: "i", i: uri },
            { t: "i", i: RDFS_LABEL },
            undefined,
            1,
            collection
          );

        const label =
          triples.length > 0 ? getTermValue(triples[0].o) : uri;

        // Cache the result
        labelCacheRef.current.set(uri, label);
        return label;
      } catch {
        return uri;
      }
    },
    [socket, effectiveFlow, collection, isConnected]
  );

  /**
   * Query for prov:wasDerivedFrom parent of a URI
   */
  const queryDerivedFrom = useCallback(
    async (uri: string): Promise<string | null> => {
      if (!isConnected()) return null;

      try {
        const triples = await socket
          .flow(effectiveFlow)
          .triplesQuery(
            { t: "i", i: uri },
            { t: "i", i: PROV_WAS_DERIVED_FROM },
            undefined,
            1,
            collection
          );

        if (triples.length > 0) {
          return getTermValue(triples[0].o);
        }
        return null;
      } catch {
        return null;
      }
    },
    [socket, effectiveFlow, collection, isConnected]
  );

  /**
   * Trace the full provenance chain from a URI to root
   */
  const traceChain = useCallback(
    async (uri: string): Promise<ProvenanceChain> => {
      setIsTracing(true);

      try {
        const chain: ProvenanceChainItem[] = [];
        let current: string | null = uri;

        for (let depth = 0; depth < maxDepth && current; depth++) {
          const label = await resolveLabel(current);
          chain.push({ uri: current, label });

          const parent = await queryDerivedFrom(current);
          if (!parent || parent === current) {
            break;
          }
          current = parent;
        }

        // The last item in the chain is the root document
        const rootItem = chain.length > 0 ? chain[chain.length - 1] : undefined;

        return {
          chain,
          documentUri: rootItem?.uri,
          documentLabel: rootItem?.label,
        };
      } finally {
        setIsTracing(false);
      }
    },
    [maxDepth, resolveLabel, queryDerivedFrom]
  );

  /**
   * Find subgraphs that contain an edge via tg:contains with a quoted triple
   */
  const queryContainingSubgraphs = useCallback(
    async (s: string, p: string, o: string): Promise<string[]> => {
      if (!isConnected()) return [];

      try {
        // Build the quoted triple term for the edge
        const quotedTriple: Term = {
          t: "t",
          tr: {
            s: { t: "i", i: s },
            p: { t: "i", i: p },
            o: o.startsWith("http") || o.startsWith("urn:")
              ? { t: "i", i: o }
              : { t: "l", v: o },
          },
        };

        const triples = await socket
          .flow(effectiveFlow)
          .triplesQuery(
            undefined,
            { t: "i", i: TG_CONTAINS },
            quotedTriple,
            10,
            collection
          );

        return triples.map((t) => getTermValue(t.s));
      } catch {
        return [];
      }
    },
    [socket, effectiveFlow, collection, isConnected]
  );

  /**
   * Trace provenance for an edge — find containing subgraph, then follow
   * wasDerivedFrom chain: subgraph → chunk → page → document
   */
  const traceEdgeProvenance = useCallback(
    async (s: string, p: string, o: string): Promise<ProvenanceChain[]> => {
      setIsTracing(true);

      try {
        // Find subgraphs containing this edge
        const subgraphUris = await queryContainingSubgraphs(s, p, o);

        const chains: ProvenanceChain[] = [];

        for (const subgraphUri of subgraphUris) {
          // Follow wasDerivedFrom from the subgraph to the chunk
          const chunkUri = await queryDerivedFrom(subgraphUri);
          if (chunkUri) {
            // Trace the full chain from chunk upward
            const chain = await traceChain(chunkUri);
            chains.push(chain);
          }
        }

        return chains;
      } finally {
        setIsTracing(false);
      }
    },
    [queryContainingSubgraphs, queryDerivedFrom, traceChain]
  );

  /**
   * Clear the label cache
   */
  const clearCache = useCallback(() => {
    labelCacheRef.current.clear();
  }, []);

  return {
    traceChain,
    traceEdgeProvenance,
    resolveLabel,
    clearCache,
    isTracing,
  };
};
