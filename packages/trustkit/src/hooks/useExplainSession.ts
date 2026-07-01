import { useState, useCallback } from "react";
import type { Triple } from "@trustgraph/react-state";

export interface ExplainNode {
  explainId: string;
  explainGraph: string;
  eventType: string;
  label?: string;
  data?: unknown;
  /** URIs this event was derived from (prov:wasDerivedFrom) */
  derivedFrom?: string[];
  /** Inline triples delivered with the explain event (avoids graph round-trip) */
  inlineTriples?: Triple[];
  fetched: boolean;
  fetching: boolean;
  error?: string;
}

/**
 * Manages a stream of explain events for a single query.
 * Handles event arrival, deduplication, and ordering.
 */
export function useExplainSession() {
  const [events, setEvents] = useState<ExplainNode[]>([]);
  const [isActive, setIsActive] = useState(false);

  const addEvent = useCallback((event: { explainId: string; explainGraph: string; explainTriples?: Triple[] }) => {
    setEvents(prev => {
      if (prev.some(n => n.explainId === event.explainId)) return prev;
      return [...prev, {
        explainId: event.explainId,
        explainGraph: event.explainGraph,
        eventType: "unknown",
        inlineTriples: event.explainTriples,
        fetched: false,
        fetching: false,
      }];
    });
  }, []);

  const updateEvent = useCallback((explainId: string, updates: Partial<ExplainNode>) => {
    setEvents(prev => prev.map(n =>
      n.explainId === explainId ? { ...n, ...updates } : n
    ));
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setIsActive(false);
  }, []);

  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  return { events, addEvent, updateEvent, reset, start, stop, isActive };
}
