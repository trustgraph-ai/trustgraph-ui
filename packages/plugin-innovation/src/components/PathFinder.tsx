import { useCallback, useMemo } from "react";
import { PathFinder as TrustkitPathFinder, useTheme } from "@trustgraph/trustkit";
import type { PathNode } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import type { IINode } from "../useInnovationData";

interface PathFinderProps {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  adjacency: Map<string, { target: string; label: string }[]>;
  onSelectNode: (uri: string) => void;
}

const NOISY_EDGES = new Set([
  "located in", "location of",
  "within nation", "contains area",
  "scoped to", "scope of",
  "member nation", "member of",
  "operates in sector", "sector contains",
]);

function buildEdgeColors(theme: Theme): Record<string, string> {
  return {
    "delivers capability in": theme.palette.emerald,
    "seeks capability in": theme.palette.rose,
    "sub-organisation of": theme.palette.blue,
    "parent of": theme.palette.blue,
    "member of": theme.palette.cyan,
    "partner": theme.palette.pink,
    "operates framework": theme.palette.purple,
    "listed on framework": theme.palette.purple,
    "provides access to": theme.palette.cyan,
    "holds role at": theme.palette.amber,
    "has expertise in": theme.palette.emerald,
    "sub-domain of": theme.palette.emerald,
    "located in": "#67E8F9",
    "funded by": theme.palette.pink,
    "operates in sector": theme.palette.orange,
    "targets segment": theme.palette.rose,
    "belongs to segment": theme.palette.rose,
    "member nation": theme.palette.cyan,
    "within nation": "#67E8F9",
    "scoped to": theme.palette.cyan,
  };
}

function buildKindColors(theme: Theme): Record<string, string> {
  return {
    GovernmentDepartment: theme.palette.blue, MilitaryCommand: "#5B8DEF",
    Agency: theme.palette.cyan, InnovationHub: theme.palette.emerald,
    PrimeContractor: theme.palette.orange, SME: theme.palette.amber,
    Startup: "#FCD34D", Investor: theme.palette.pink,
    Accelerator: theme.palette.emerald, ResearchOrganisation: theme.palette.purple,
    University: "#C4B5FD", Person: theme.palette.amber,
    CapabilityDomain: theme.palette.emerald, Framework: theme.palette.purple,
    InnovationChallenge: "#C4B5FD", CustomerSegment: theme.palette.rose,
    Nation: theme.palette.cyan, Region: "#67E8F9",
    IndustrySector: theme.palette.orange,
  };
}

export function PathFinder({ nodes, abbreviations, adjacency, onSelectNode }: PathFinderProps) {
  const { theme } = useTheme();

  const pathNodes = useMemo(() => {
    const m = new Map<string, PathNode>();
    for (const [uri, node] of nodes) {
      m.set(uri, { uri, label: node.label, kind: node.kind });
    }
    return m;
  }, [nodes]);

  const kindColors = useMemo(() => buildKindColors(theme), [theme]);
  const edgeColors = useMemo(() => buildEdgeColors(theme), [theme]);

  const nodeColor = useCallback((uri: string): string => {
    const n = nodes.get(uri);
    if (!n) return theme.text.muted;
    return kindColors[n.kind] || theme.text.muted;
  }, [nodes, kindColors, theme.text.muted]);

  const edgeColor = useCallback((label: string): string => {
    return edgeColors[label] || theme.text.faint;
  }, [edgeColors, theme.text.faint]);

  return (
    <TrustkitPathFinder
      nodes={pathNodes}
      adjacency={adjacency}
      onSelectNode={onSelectNode}
      abbreviations={abbreviations}
      nodeColor={nodeColor}
      edgeColor={edgeColor}
      defaultExcludedEdges={NOISY_EDGES}
      title="Pathway Finder"
      description="Find connection paths between any two entities in the ecosystem. Discover how organisations, capabilities, procurement routes, and people are linked."
    />
  );
}
