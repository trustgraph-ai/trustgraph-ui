import { useMemo } from "react";
import type { ExplainGraphNode, ExplainGraphEdge } from "../components/graph/ExplainGraph";
import type { ExplainNode } from "./useExplainSession";
import { useTheme } from "../theme/ThemeContext";

/**
 * Derives graph visualization data (nodes and edges) from explain events.
 */
export function useExplainGraph(events: ExplainNode[]) {
  const { theme } = useTheme();
  return useMemo(() => {
    const nodeMap = new Map<string, ExplainGraphNode>();
    const edgeList: ExplainGraphEdge[] = [];

    for (const node of events) {
      if (!node.fetched || !node.data) continue;
      const d = node.data as Record<string, unknown>;

      if (node.eventType === "exploration") {
        const entities = (d.entities as string[]) || [];
        const labels = (d.entityLabels as string[]) || [];
        entities.forEach((uri, i) => {
          if (!nodeMap.has(uri)) {
            const shortLabel = labels[i] || uri.split(/[/#]/).pop() || uri;
            nodeMap.set(uri, { id: uri, label: shortLabel, color: theme.palette.blue });
          }
        });
      }

      if (node.eventType === "focus") {
        const edgeSelections = (d.edgeSelections as Array<{
          edgeUri: string;
          edge?: { s: string; p: string; o: string };
          edgeLabels?: { s: string; p: string; o: string };
          concept?: string;
          score?: number;
        }>) || [];

        for (const sel of edgeSelections) {
          if (!sel.edge) continue;
          const { s, p, o } = sel.edge;
          const sLabel = sel.edgeLabels?.s || s.split(/[/#]/).pop() || s;
          const pLabel = sel.edgeLabels?.p || p.split(/[/#]/).pop() || p;
          const oLabel = sel.edgeLabels?.o || o.split(/[/#]/).pop() || o;

          if (!nodeMap.has(s)) nodeMap.set(s, { id: s, label: sLabel, color: theme.palette.pink });
          if (!nodeMap.has(o)) nodeMap.set(o, { id: o, label: oLabel, color: theme.palette.pink });

          edgeList.push({
            id: sel.edgeUri,
            from: s,
            to: o,
            label: pLabel,
            concept: sel.concept,
            score: sel.score,
          });
        }
      }
    }

    return {
      graphNodes: Array.from(nodeMap.values()),
      graphEdges: edgeList,
    };
  }, [events, theme]);
}
