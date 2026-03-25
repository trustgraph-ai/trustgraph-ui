import { useState, useCallback } from "react";

export interface ExplainNode {
  explainId: string;
  explainGraph: string;
  eventType: string;
  data?: unknown;
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

  const addEvent = useCallback((event: { explainId: string; explainGraph: string }) => {
    setEvents(prev => {
      if (prev.some(n => n.explainId === event.explainId)) return prev;
      return [...prev, {
        explainId: event.explainId,
        explainGraph: event.explainGraph,
        eventType: "unknown",
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
