import { useMemo } from "react";
import type { ExplainNode } from "./useExplainSession";
import { eventTypeColor } from "../components/explain/ExplainEventCard";

export interface DAGNode {
  id: string;
  label: string;
  eventType: string;
  color: string;
  depth: number;
  column: number;
  /** Original explain node reference */
  explainNode: ExplainNode;
}

export interface DAGEdge {
  from: string;
  to: string;
}

export interface DAGLayout {
  nodes: DAGNode[];
  edges: DAGEdge[];
  maxDepth: number;
  maxColumns: number;
}

/**
 * Derives a DAG layout from explain events using their derivation links.
 * Positions nodes by depth (topological sort from roots) and assigns
 * columns to nodes at the same depth.
 */
export function useExplainDAG(events: ExplainNode[]): DAGLayout {
  return useMemo(() => {
    const fetchedEvents = events.filter(e => e.fetched);
    if (fetchedEvents.length === 0) {
      return { nodes: [], edges: [], maxDepth: 0, maxColumns: 0 };
    }

    const eventById = new Map<string, ExplainNode>();
    for (const e of fetchedEvents) {
      eventById.set(e.explainId, e);
    }

    // Build edges from derivation links
    const edges: DAGEdge[] = [];
    const childrenOf = new Map<string, string[]>();
    const parentsOf = new Map<string, string[]>();

    for (const e of fetchedEvents) {
      if (!e.derivedFrom) continue;
      for (const parentId of e.derivedFrom) {
        // Only include edges where both endpoints are in our event set
        if (eventById.has(parentId)) {
          edges.push({ from: parentId, to: e.explainId });
          if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
          childrenOf.get(parentId)!.push(e.explainId);
          if (!parentsOf.has(e.explainId)) parentsOf.set(e.explainId, []);
          parentsOf.get(e.explainId)!.push(parentId);
        }
      }
    }

    // Find roots (events with no parents in our set)
    const roots = fetchedEvents.filter(e => !parentsOf.has(e.explainId));

    // BFS to assign depth
    const depthMap = new Map<string, number>();
    const queue: string[] = [];

    for (const root of roots) {
      depthMap.set(root.explainId, 0);
      queue.push(root.explainId);
    }

    // Events not connected to anything get depth 0
    for (const e of fetchedEvents) {
      if (!depthMap.has(e.explainId) && !parentsOf.has(e.explainId)) {
        depthMap.set(e.explainId, 0);
        queue.push(e.explainId);
      }
    }

    while (queue.length > 0) {
      const id = queue.shift()!;
      const depth = depthMap.get(id)!;
      const children = childrenOf.get(id) || [];
      for (const childId of children) {
        const existing = depthMap.get(childId);
        const newDepth = depth + 1;
        // Take the maximum depth (longest path from root)
        if (existing === undefined || newDepth > existing) {
          depthMap.set(childId, newDepth);
          queue.push(childId);
        }
      }
    }

    // Assign columns within each depth level
    const byDepth = new Map<number, ExplainNode[]>();
    let maxDepth = 0;
    for (const e of fetchedEvents) {
      const depth = depthMap.get(e.explainId) ?? 0;
      if (depth > maxDepth) maxDepth = depth;
      if (!byDepth.has(depth)) byDepth.set(depth, []);
      byDepth.get(depth)!.push(e);
    }

    let maxColumns = 0;
    const columnMap = new Map<string, number>();
    for (let d = 0; d <= maxDepth; d++) {
      const nodesAtDepth = byDepth.get(d) || [];
      if (nodesAtDepth.length > maxColumns) maxColumns = nodesAtDepth.length;
      nodesAtDepth.forEach((e, i) => {
        columnMap.set(e.explainId, i);
      });
    }

    // Build DAG nodes
    const nodes: DAGNode[] = fetchedEvents.map(e => ({
      id: e.explainId,
      label: e.label || e.eventType,
      eventType: e.eventType,
      color: eventTypeColor(e.eventType),
      depth: depthMap.get(e.explainId) ?? 0,
      column: columnMap.get(e.explainId) ?? 0,
      explainNode: e,
    }));

    return { nodes, edges, maxDepth, maxColumns: Math.max(maxColumns, 1) };
  }, [events]);
}
