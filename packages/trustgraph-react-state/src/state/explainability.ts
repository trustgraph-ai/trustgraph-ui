/**
 * Hook for managing explainability state during GraphRAG queries
 * Unpacks explain events into structured data with provenance chains
 *
 * Processing strategy:
 * - Events are processed immediately as they arrive
 * - Explain triples are embedded directly in events (no store lookups)
 * - Edge labels are resolved via triple store queries
 * - Edge label resolution + provenance runs in parallel
 * - onUpdate callback fires on every session state change, allowing
 *   callers to sync to external stores (e.g. Zustand)
 */

import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "./session";
import { useProvenance } from "./provenance";
import type { ExplainEvent, Triple } from "@trustgraph/client";
import {
  parseExplainTriples,
  parseEdgeSelectionTriples,
  getTermValue,
  type ExplainabilitySession,
  type QuestionEvent,
  type ExplorationEvent,
  type FocusEvent,
  type SynthesisEvent,
  type SelectedEdge,
  type ProvenanceChainItem,
} from "../utils/explainability";

export interface UseExplainabilityOptions {
  flow?: string;
  collection?: string;
  /** Trace provenance for selected edges (default: true) */
  traceProvenance?: boolean;
  /** Called on every session state change with the latest session */
  onUpdate?: (session: ExplainabilitySession) => void;
}

export interface UseExplainabilityResult {
  /** Add an explain event (wire this to graphRag callbacks.onExplain) */
  addEvent: (event: ExplainEvent) => void;
  /** Current session data (React state - may lag behind ref) */
  session: ExplainabilitySession;
  /** Ref-backed session that's always immediately up-to-date (no render delay) */
  sessionRef: React.RefObject<ExplainabilitySession>;
  /** Raw events received */
  events: ExplainEvent[];
  /** Whether unpacking is in progress (React state) */
  isUnpacking: boolean;
  /** Ref-backed processing flag - always immediately up-to-date */
  isProcessingRef: React.RefObject<boolean>;
  /** Any error during unpacking */
  error: string | null;
  /** Reset the session */
  reset: () => void;
}

/**
 * Hook for managing explainability during inference
 */
export const useExplainability = (
  options: UseExplainabilityOptions = {}
): UseExplainabilityResult => {
  const {
    flow,
    collection = "default",
    traceProvenance = true,
  } = options;

  const sessionFlowId = useSessionStore((state) => state.flowId);
  const effectiveFlow = flow ?? sessionFlowId;

  const { traceEdgeProvenance, resolveLabel } = useProvenance({
    flow: effectiveFlow,
    collection,
  });

  // Keep onUpdate in a ref so it doesn't break memoisation
  const onUpdateRef = useRef(options.onUpdate);
  onUpdateRef.current = options.onUpdate;

  const [events, setEvents] = useState<ExplainEvent[]>([]);
  const [session, setSession] = useState<ExplainabilitySession>({});
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror session in a ref so it's always immediately readable (no render delay)
  const sessionRef = useRef<ExplainabilitySession>({});

  // Track pending unpack operations
  const unpackQueueRef = useRef<ExplainEvent[]>([]);
  const isProcessingRef = useRef(false);

  /**
   * Resolve a single edge: extract from embedded triples, resolve labels
   */
  const resolveEdge = useCallback(
    async (edgeSelUri: string, allTriples: Triple[]): Promise<SelectedEdge | null> => {
      // Filter embedded triples for this edge selection URI
      const edgeTriples = allTriples.filter(
        (t) => getTermValue(t.s) === edgeSelUri
      );
      const { edge, reasoning } = parseEdgeSelectionTriples(edgeTriples);

      if (!edge) return null;

      const selectedEdge: SelectedEdge = {
        edge,
        reasoning: reasoning || undefined,
      };

      // Kick off label resolution and provenance in parallel
      const [labels, provenanceChains] = await Promise.all([
        // Labels — all 3 in parallel
        Promise.all([
          resolveLabel(edge.s),
          resolveLabel(edge.p),
          resolveLabel(edge.o),
        ]),
        // Provenance
        traceProvenance
          ? traceEdgeProvenance(edge.s, edge.p, edge.o)
          : Promise.resolve([]),
      ]);

      selectedEdge.labels = { s: labels[0], p: labels[1], o: labels[2] };

      if (provenanceChains.length > 0) {
        selectedEdge.sources = provenanceChains.map((c) => c.chain).flat();
      }

      return selectedEdge;
    },
    [resolveLabel, traceProvenance, traceEdgeProvenance]
  );

  /**
   * Unpack a focus event — resolve ALL edges in parallel
   */
  const unpackFocusEvent = useCallback(
    async (focusEvent: FocusEvent, allTriples: Triple[]): Promise<FocusEvent> => {
      // Fire off all edge resolutions concurrently
      const edgePromises = focusEvent.edgeSelectionUris.map(
        (uri) => resolveEdge(uri, allTriples)
      );

      const results = await Promise.all(edgePromises);
      const selectedEdges = results.filter((e): e is SelectedEdge => e !== null);

      return {
        ...focusEvent,
        selectedEdges,
      };
    },
    [resolveEdge]
  );

  /** Helper to update state, ref, and notify caller together */
  const updateSession = useCallback(
    (updater: (prev: ExplainabilitySession) => ExplainabilitySession) => {
      sessionRef.current = updater(sessionRef.current);
      setSession(updater);
      onUpdateRef.current?.(sessionRef.current);
    },
    []
  );

  const AGENT_STEP_TYPES = new Set([
    "agent-question", "decomposition", "analysis", "reflection", "conclusion",
    "grounding",
  ]);

  /**
   * Resolve labels for inline edges (edges already extracted, just need labels)
   */
  const resolveEdgeLabels = useCallback(
    async (focusEvent: FocusEvent): Promise<FocusEvent> => {
      if (!focusEvent.selectedEdges || focusEvent.selectedEdges.length === 0) {
        return focusEvent;
      }

      const resolved = await Promise.all(
        focusEvent.selectedEdges.map(async (se) => {
          const [sLabel, pLabel, oLabel] = await Promise.all([
            resolveLabel(se.edge.s),
            resolveLabel(se.edge.p),
            resolveLabel(se.edge.o),
          ]);

          let sources: ProvenanceChainItem[] | undefined;
          if (traceProvenance) {
            const chains = await traceEdgeProvenance(se.edge.s, se.edge.p, se.edge.o);
            if (chains.length > 0) {
              sources = chains.map((c) => c.chain).flat();
            }
          }

          return {
            ...se,
            labels: { s: sLabel, p: pLabel, o: oLabel },
            sources,
          };
        })
      );

      return { ...focusEvent, selectedEdges: resolved };
    },
    [resolveLabel, traceProvenance, traceEdgeProvenance]
  );

  /**
   * Process a single explain event
   */
  const processEvent = useCallback(
    async (event: ExplainEvent): Promise<void> => {
      const triples = event.explainTriples ?? [];

      const parsed = parseExplainTriples(event.explainId, event.explainGraph, triples);
      if (!parsed) return;

      if (AGENT_STEP_TYPES.has(parsed.type)) {
        // Agent step — append to timeline
        updateSession((prev) => ({
          ...prev,
          agentSteps: [...(prev.agentSteps || []), parsed],
        }));
      }

      // Graph-RAG fields — populate regardless (agent produces these too)
      switch (parsed.type) {
        case "question":
          updateSession((prev) => ({ ...prev, question: parsed as QuestionEvent }));
          break;
        case "exploration":
          updateSession((prev) => ({ ...prev, exploration: parsed as ExplorationEvent }));
          break;
        case "focus": {
          updateSession((prev) => ({ ...prev, focus: parsed as FocusEvent }));
          // Resolve labels for inline edges, or unpack old-format edges
          const focusEvent = parsed as FocusEvent;
          if (focusEvent.selectedEdges && focusEvent.selectedEdges.length > 0) {
            // New format: edges already extracted, resolve labels
            const resolved = await resolveEdgeLabels(focusEvent);
            updateSession((prev) => ({ ...prev, focus: resolved }));
          } else if (focusEvent.edgeSelectionUris.length > 0) {
            // Old format: unpack edge selection URIs
            const unpacked = await unpackFocusEvent(focusEvent, triples);
            updateSession((prev) => ({ ...prev, focus: unpacked }));
          }
          break;
        }
        case "synthesis":
          updateSession((prev) => ({ ...prev, synthesis: parsed as SynthesisEvent }));
          break;
      }
    },
    [unpackFocusEvent, resolveEdgeLabels, updateSession]
  );

  /**
   * Process the unpack queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (unpackQueueRef.current.length === 0) return;

    isProcessingRef.current = true;
    setIsUnpacking(true);

    try {
      while (unpackQueueRef.current.length > 0) {
        const event = unpackQueueRef.current.shift()!;
        await processEvent(event);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }

    isProcessingRef.current = false;
    setIsUnpacking(false);

    // Check if more events were queued during processing (e.g., after a reset)
    if (unpackQueueRef.current.length > 0) {
      processQueue();
    }
  }, [processEvent]);

  /**
   * Add an explain event — immediately queues and starts processing
   */
  const addEvent = useCallback(
    (event: ExplainEvent) => {
      setEvents((prev) => [...prev, event]);
      unpackQueueRef.current.push(event);
      processQueue();
    },
    [processQueue]
  );

  /**
   * Reset the session
   */
  const reset = useCallback(() => {
    setEvents([]);
    setSession({});
    sessionRef.current = {};
    setError(null);
    unpackQueueRef.current = [];
  }, []);

  return {
    addEvent,
    session,
    sessionRef,
    events,
    isUnpacking,
    isProcessingRef,
    error,
    reset,
  };
};

// Re-export types for convenience
export type {
  ExplainabilitySession,
  ExplainEventType,
  StructuredExplainEvent,
  QuestionEvent,
  ExplorationEvent,
  FocusEvent,
  SynthesisEvent,
  SelectedEdge,
  ProvenanceChain,
  ProvenanceChainItem,
  AgentQuestionEvent,
  DecompositionEvent,
  AnalysisEvent,
  ReflectionEvent,
  ConclusionEvent,
  GroundingEvent,
} from "../utils/explainability";
