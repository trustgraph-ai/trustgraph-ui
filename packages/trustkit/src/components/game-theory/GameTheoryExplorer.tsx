import { useState, useMemo, useCallback } from "react";
import { useGameTheoryData } from "../../hooks/useGameTheoryData";
import type { GTNode } from "../../hooks/useGameTheoryData";
import { text, border, palette } from "../../theme";
import { LoadingState } from "../common";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ExplorerMode = "tree" | "matrix" | "sandbox";

export interface GameTheoryExplorerProps {}

interface TreeLayoutNode {
  id: string;
  uri: string;
  kind: "DecisionNode" | "ChanceNode" | "OutcomeNode";
  playerUri?: string;
  children: { action: string; actionUri: string; probability?: number; child: TreeLayoutNode }[];
  depth: number;
  y: number;
}

interface BackwardResult {
  payoffs: Map<string, number>; // playerUri -> expected value
  bestActionUri?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PLAYER_COLORS = [
  palette.cyan, palette.amber, palette.rose, palette.emerald,
  palette.purple, palette.pink, palette.blue, palette.orange,
];

const LEVEL_WIDTH = 220;
const NODE_SPACING = 100;
const PADDING = 80;
const NODE_SIZE = 30;

/* ------------------------------------------------------------------ */
/*  Helper: Section header                                             */
/* ------------------------------------------------------------------ */

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 8, color, fontFamily: "'IBM Plex Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: 6, paddingBottom: 4,
        borderBottom: `1px solid ${color}22`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function GameTheoryExplorer(_props: GameTheoryExplorerProps) {
  const data = useGameTheoryData();
  const [mode, setMode] = useState<ExplorerMode>("tree");
  const [selectedGameUri, setSelectedGameUri] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Sandbox overrides
  const [probOverrides, setProbOverrides] = useState<Map<string, number>>(new Map());
  const [utilOverrides, setUtilOverrides] = useState<Map<string, number>>(new Map());

  /* ---- Derived data ------------------------------------------------ */

  const games = useMemo(() => {
    const result: GTNode[] = [];
    for (const n of data.nodes.values()) {
      if (n.kind === "Game") result.push(n);
    }
    return result;
  }, [data.nodes]);

  const activeGameUri = selectedGameUri ?? (games.length > 0 ? games[0].uri : null);

  const players = useMemo(() => {
    const result: GTNode[] = [];
    for (const n of data.nodes.values()) {
      if (n.kind === "Player") result.push(n);
    }
    return result;
  }, [data.nodes]);

  const playerColorMap = useMemo(() => {
    const m = new Map<string, string>();
    players.forEach((p, i) => m.set(p.uri, PLAYER_COLORS[i % PLAYER_COLORS.length]));
    return m;
  }, [players]);

  const playerLabel = useCallback((uri: string): string => {
    const n = data.nodes.get(uri);
    return n ? n.label : uri.split("/").pop() || uri;
  }, [data.nodes]);

  const nodeLabel = useCallback((uri: string): string => {
    const n = data.nodes.get(uri);
    return n ? n.label : uri.split("/").pop() || uri;
  }, [data.nodes]);

  const getActionLabel = useCallback((actionUri: string): string => {
    const al = data.actionLabels.get(actionUri);
    if (al) return al;
    const n = data.nodes.get(actionUri);
    return n ? n.label : actionUri.split("/").pop() || actionUri;
  }, [data.actionLabels, data.nodes]);

  /* ---- Effective probabilities / utilities (for sandbox) ----------- */

  const effectiveProb = useCallback((actionUri: string): number | undefined => {
    const ov = probOverrides.get(actionUri);
    if (ov !== undefined) return ov;
    return data.probabilities.get(actionUri);
  }, [probOverrides, data.probabilities]);

  const effectiveUtil = useCallback((payoffUri: string): number => {
    const ov = utilOverrides.get(payoffUri);
    if (ov !== undefined) return ov;
    return data.utilities.get(payoffUri) ?? 0;
  }, [utilOverrides, data.utilities]);

  /* ---- Build layout tree ------------------------------------------- */

  const buildLayoutTree = useCallback((
    rootUri: string,
    useSandbox: boolean,
  ): TreeLayoutNode | null => {
    const getProb = useSandbox ? effectiveProb : (uri: string) => data.probabilities.get(uri);

    let leafCounter = 0;

    function recurse(uri: string, depth: number, pathId: string): TreeLayoutNode | null {
      const node = data.nodes.get(uri);
      if (!node) return null;
      if (node.kind !== "DecisionNode" && node.kind !== "ChanceNode" && node.kind !== "OutcomeNode") return null;

      const layoutNode: TreeLayoutNode = {
        id: pathId,
        uri,
        kind: node.kind as "DecisionNode" | "ChanceNode" | "OutcomeNode",
        playerUri: data.nodePlayer.get(uri),
        children: [],
        depth,
        y: 0,
      };

      if (node.kind === "OutcomeNode") {
        layoutNode.y = leafCounter * NODE_SPACING;
        leafCounter++;
        return layoutNode;
      }

      const actionUris = data.nodeActions.get(uri) || [];
      for (let i = 0; i < actionUris.length; i++) {
        const actionUri = actionUris[i];
        const targetUri = data.actionTarget.get(actionUri);
        if (!targetUri) continue;

        const child = recurse(targetUri, depth + 1, `${pathId}-${i}`);
        if (!child) continue;

        const prob = getProb(actionUri);
        layoutNode.children.push({
          action: getActionLabel(actionUri),
          actionUri,
          probability: prob,
          child,
        });
      }

      if (layoutNode.children.length > 0) {
        const sum = layoutNode.children.reduce((s, c) => s + c.child.y, 0);
        layoutNode.y = sum / layoutNode.children.length;
      } else {
        layoutNode.y = leafCounter * NODE_SPACING;
        leafCounter++;
      }

      return layoutNode;
    }

    return recurse(rootUri, 0, "n");
  }, [data.nodes, data.nodePlayer, data.nodeActions, data.actionTarget, data.probabilities, effectiveProb, getActionLabel]);

  const layoutTree = useMemo(() => {
    if (!activeGameUri) return null;
    const rootUri = data.gameRoots.get(activeGameUri);
    if (!rootUri) return null;
    return buildLayoutTree(rootUri, false);
  }, [activeGameUri, data.gameRoots, buildLayoutTree]);

  const sandboxTree = useMemo(() => {
    if (!activeGameUri) return null;
    const rootUri = data.gameRoots.get(activeGameUri);
    if (!rootUri) return null;
    return buildLayoutTree(rootUri, true);
  }, [activeGameUri, data.gameRoots, buildLayoutTree]);

  /* ---- Backward induction ------------------------------------------ */

  const computeBackwardInduction = useCallback((
    tree: TreeLayoutNode | null,
    useSandbox: boolean,
  ): Map<string, BackwardResult> => {
    const results = new Map<string, BackwardResult>();
    if (!tree) return results;

    const getProb = useSandbox ? effectiveProb : (uri: string) => data.probabilities.get(uri);
    const getUtil = useSandbox ? effectiveUtil : (uri: string) => data.utilities.get(uri) ?? 0;

    function recurse(node: TreeLayoutNode): Map<string, number> {
      if (node.kind === "OutcomeNode") {
        const payoffs = new Map<string, number>();
        const payoffUris = data.outcomePayoffs.get(node.uri) || [];
        for (const pu of payoffUris) {
          const playerUri = data.payoffPlayer.get(pu);
          if (playerUri) {
            payoffs.set(playerUri, getUtil(pu));
          }
        }
        results.set(node.id, { payoffs });
        return payoffs;
      }

      if (node.kind === "ChanceNode") {
        const expectedPayoffs = new Map<string, number>();
        for (const edge of node.children) {
          const childPayoffs = recurse(edge.child);
          const prob = getProb(edge.actionUri) ?? (1 / node.children.length);
          for (const [pUri, val] of childPayoffs) {
            expectedPayoffs.set(pUri, (expectedPayoffs.get(pUri) ?? 0) + prob * val);
          }
        }
        results.set(node.id, { payoffs: expectedPayoffs });
        return expectedPayoffs;
      }

      // DecisionNode
      const controllingPlayer = node.playerUri;
      let bestPayoffs: Map<string, number> | null = null;
      let bestActionUri: string | undefined;
      let bestValue = -Infinity;

      for (const edge of node.children) {
        const childPayoffs = recurse(edge.child);
        const playerVal = controllingPlayer ? (childPayoffs.get(controllingPlayer) ?? 0) : 0;
        if (playerVal > bestValue || bestPayoffs === null) {
          bestValue = playerVal;
          bestPayoffs = childPayoffs;
          bestActionUri = edge.actionUri;
        }
      }

      const finalPayoffs = bestPayoffs ?? new Map<string, number>();
      results.set(node.id, { payoffs: finalPayoffs, bestActionUri });
      return finalPayoffs;
    }

    recurse(tree);
    return results;
  }, [data.outcomePayoffs, data.payoffPlayer, data.probabilities, effectiveProb, effectiveUtil]);

  const backwardResults = useMemo(
    () => computeBackwardInduction(layoutTree, false),
    [layoutTree, computeBackwardInduction],
  );

  const sandboxBackwardResults = useMemo(
    () => computeBackwardInduction(sandboxTree, true),
    [sandboxTree, computeBackwardInduction],
  );

  /* ---- Optimal path set -------------------------------------------- */

  const buildOptimalSet = useCallback((
    tree: TreeLayoutNode | null,
    results: Map<string, BackwardResult>,
  ): Set<string> => {
    const optEdges = new Set<string>();
    if (!tree) return optEdges;

    function walk(node: TreeLayoutNode) {
      const res = results.get(node.id);
      if (!res) return;

      if (node.kind === "DecisionNode" && res.bestActionUri) {
        for (const edge of node.children) {
          if (edge.actionUri === res.bestActionUri) {
            optEdges.add(`${node.id}->${edge.child.id}`);
            walk(edge.child);
            break;
          }
        }
      } else if (node.kind === "ChanceNode") {
        for (const edge of node.children) {
          optEdges.add(`${node.id}->${edge.child.id}`);
          walk(edge.child);
        }
      }
    }

    walk(tree);
    return optEdges;
  }, []);

  const optimalEdges = useMemo(
    () => buildOptimalSet(layoutTree, backwardResults),
    [layoutTree, backwardResults, buildOptimalSet],
  );

  const sandboxOptimalEdges = useMemo(
    () => buildOptimalSet(sandboxTree, sandboxBackwardResults),
    [sandboxTree, sandboxBackwardResults, buildOptimalSet],
  );

  /* ---- Collect all layout nodes for click selection ----------------- */

  const collectNodes = useCallback((tree: TreeLayoutNode | null): Map<string, TreeLayoutNode> => {
    const m = new Map<string, TreeLayoutNode>();
    if (!tree) return m;
    function walk(node: TreeLayoutNode) {
      m.set(node.id, node);
      for (const edge of node.children) walk(edge.child);
    }
    walk(tree);
    return m;
  }, []);

  const allTreeNodes = useMemo(() => collectNodes(layoutTree), [layoutTree, collectNodes]);

  /* ---- Payoff matrix computation ----------------------------------- */

  const computeMatrix = useCallback((
    tree: TreeLayoutNode | null,
    useSandbox: boolean,
  ) => {
    if (!tree) return { profiles: [] as { stratLabel: Map<string, string>; payoffs: Map<string, number> }[], playerUris: [] as string[] };

    const getProb = useSandbox ? effectiveProb : (uri: string) => data.probabilities.get(uri);
    const getUtil = useSandbox ? effectiveUtil : (uri: string) => data.utilities.get(uri) ?? 0;

    // Collect decision nodes per player
    const decisionNodesByPlayer = new Map<string, { nodeId: string; uri: string; actions: { actionUri: string; label: string }[] }[]>();

    function collectDecisionNodes(node: TreeLayoutNode) {
      if (node.kind === "DecisionNode" && node.playerUri) {
        const list = decisionNodesByPlayer.get(node.playerUri) || [];
        // Avoid duplicates by URI within same player
        if (!list.find(d => d.uri === node.uri)) {
          const actionUris = data.nodeActions.get(node.uri) || [];
          const actions = actionUris.map(au => ({
            actionUri: au,
            label: getActionLabel(au),
          }));
          list.push({ nodeId: node.id, uri: node.uri, actions });
          decisionNodesByPlayer.set(node.playerUri, list);
        }
      }
      for (const edge of node.children) collectDecisionNodes(edge.child);
    }
    collectDecisionNodes(tree);

    const playerUris = [...decisionNodesByPlayer.keys()];

    // Build strategy sets per player (cartesian product of actions across decision nodes)
    function buildStrategies(playerUri: string): { plan: Map<string, string>; label: string }[] {
      const dnodes = decisionNodesByPlayer.get(playerUri) || [];
      if (dnodes.length === 0) return [{ plan: new Map(), label: "---" }];

      let combos: { plan: Map<string, string>; labels: string[] }[] = [{ plan: new Map(), labels: [] }];
      for (const dn of dnodes) {
        const next: typeof combos = [];
        for (const combo of combos) {
          for (const act of dn.actions) {
            const newPlan = new Map(combo.plan);
            newPlan.set(dn.uri, act.actionUri);
            next.push({ plan: newPlan, labels: [...combo.labels, act.label] });
          }
        }
        combos = next;
      }
      return combos.map(c => ({ plan: c.plan, label: c.labels.join(", ") }));
    }

    const strategySets = new Map<string, { plan: Map<string, string>; label: string }[]>();
    for (const pu of playerUris) {
      strategySets.set(pu, buildStrategies(pu));
    }

    // Enumerate all strategy profiles (cartesian product across players)
    function cartesian(pUris: string[], idx: number): { stratLabel: Map<string, string>; strategies: Map<string, Map<string, string>> }[] {
      if (idx >= pUris.length) return [{ stratLabel: new Map(), strategies: new Map() }];
      const rest = cartesian(pUris, idx + 1);
      const result: typeof rest = [];
      const pu = pUris[idx];
      const strats = strategySets.get(pu) || [];
      for (const s of strats) {
        for (const r of rest) {
          const sl = new Map(r.stratLabel);
          sl.set(pu, s.label);
          const st = new Map(r.strategies);
          st.set(pu, s.plan);
          result.push({ stratLabel: sl, strategies: st });
        }
      }
      return result;
    }

    const allProfiles = cartesian(playerUris, 0);

    // Evaluate each profile
    function evaluate(
      node: TreeLayoutNode,
      strategies: Map<string, Map<string, string>>,
    ): Map<string, number> {
      if (node.kind === "OutcomeNode") {
        const payoffs = new Map<string, number>();
        const payoffUris = data.outcomePayoffs.get(node.uri) || [];
        for (const pu of payoffUris) {
          const playerUri = data.payoffPlayer.get(pu);
          if (playerUri) payoffs.set(playerUri, getUtil(pu));
        }
        return payoffs;
      }

      if (node.kind === "ChanceNode") {
        const expected = new Map<string, number>();
        for (const edge of node.children) {
          const childPayoffs = evaluate(edge.child, strategies);
          const prob = getProb(edge.actionUri) ?? (1 / node.children.length);
          for (const [p, v] of childPayoffs) {
            expected.set(p, (expected.get(p) ?? 0) + prob * v);
          }
        }
        return expected;
      }

      // DecisionNode - follow the strategy
      if (node.playerUri) {
        const plan = strategies.get(node.playerUri);
        if (plan) {
          const chosenAction = plan.get(node.uri);
          if (chosenAction) {
            for (const edge of node.children) {
              if (edge.actionUri === chosenAction) {
                return evaluate(edge.child, strategies);
              }
            }
          }
        }
      }

      // Fallback: first action
      if (node.children.length > 0) {
        return evaluate(node.children[0].child, strategies);
      }
      return new Map();
    }

    const profiles = allProfiles.map(p => ({
      stratLabel: p.stratLabel,
      payoffs: evaluate(tree, p.strategies),
      strategies: p.strategies,
    }));

    return { profiles, playerUris, strategySets };
  }, [data.nodeActions, data.outcomePayoffs, data.payoffPlayer, data.probabilities, effectiveProb, effectiveUtil, getActionLabel]);

  const matrixData = useMemo(() => computeMatrix(layoutTree, false), [layoutTree, computeMatrix]);
  const sandboxMatrixData = useMemo(() => computeMatrix(sandboxTree, true), [sandboxTree, computeMatrix]);

  /* ---- Nash Equilibrium detection ---------------------------------- */

  const findNashEquilibria = useCallback((
    profiles: { stratLabel: Map<string, string>; payoffs: Map<string, number>; strategies: Map<string, Map<string, string>> }[],
    playerUris: string[],
    strategySets: Map<string, { plan: Map<string, string>; label: string }[]> | undefined,
  ): Set<number> => {
    const neIndices = new Set<number>();
    if (!strategySets) return neIndices;

    for (let pi = 0; pi < profiles.length; pi++) {
      const profile = profiles[pi];
      let isNE = true;

      for (const pu of playerUris) {
        const currentPayoff = profile.payoffs.get(pu) ?? 0;
        const currentStrat = profile.stratLabel.get(pu);
        const altStrats = strategySets.get(pu) || [];

        for (const alt of altStrats) {
          if (alt.label === currentStrat) continue;

          // Find the profile with this player deviating
          const devProfile = profiles.find(p => {
            if (p.stratLabel.get(pu) !== alt.label) return false;
            for (const otherPu of playerUris) {
              if (otherPu === pu) continue;
              if (p.stratLabel.get(otherPu) !== profile.stratLabel.get(otherPu)) return false;
            }
            return true;
          });

          if (devProfile) {
            const devPayoff = devProfile.payoffs.get(pu) ?? 0;
            if (devPayoff > currentPayoff + 1e-9) {
              isNE = false;
              break;
            }
          }
        }
        if (!isNE) break;
      }

      if (isNE) neIndices.add(pi);
    }

    return neIndices;
  }, []);

  const nashEquilibria = useMemo(() => {
    const md = matrixData as ReturnType<typeof computeMatrix>;
    return findNashEquilibria(
      (md.profiles as any) || [],
      md.playerUris || [],
      (md as any).strategySets,
    );
  }, [matrixData, findNashEquilibria]);

  const sandboxNashEquilibria = useMemo(() => {
    const md = sandboxMatrixData as ReturnType<typeof computeMatrix>;
    return findNashEquilibria(
      (md.profiles as any) || [],
      md.playerUris || [],
      (md as any).strategySets,
    );
  }, [sandboxMatrixData, findNashEquilibria]);

  /* ---- Sandbox sliders data ---------------------------------------- */

  const chanceActions = useMemo(() => {
    const result: { actionUri: string; label: string; nodeUri: string; siblings: string[] }[] = [];
    const visited = new Set<string>();

    function walk(node: TreeLayoutNode) {
      if (node.kind === "ChanceNode" && !visited.has(node.uri)) {
        visited.add(node.uri);
        const siblingUris = node.children.map(e => e.actionUri);
        for (const edge of node.children) {
          result.push({
            actionUri: edge.actionUri,
            label: edge.action,
            nodeUri: node.uri,
            siblings: siblingUris.filter(s => s !== edge.actionUri),
          });
        }
      }
      for (const edge of node.children) walk(edge.child);
    }

    if (layoutTree) walk(layoutTree);
    return result;
  }, [layoutTree]);

  const payoffEntries = useMemo(() => {
    const result: { payoffUri: string; playerUri: string; outcomeUri: string; label: string }[] = [];
    const visited = new Set<string>();

    function walk(node: TreeLayoutNode) {
      if (node.kind === "OutcomeNode" && !visited.has(node.uri)) {
        visited.add(node.uri);
        const payoffUris = data.outcomePayoffs.get(node.uri) || [];
        for (const pu of payoffUris) {
          const plUri = data.payoffPlayer.get(pu);
          if (plUri) {
            result.push({
              payoffUri: pu,
              playerUri: plUri,
              outcomeUri: node.uri,
              label: `${playerLabel(plUri)} @ ${nodeLabel(node.uri)}`,
            });
          }
        }
      }
      for (const edge of node.children) walk(edge.child);
    }

    if (layoutTree) walk(layoutTree);
    return result;
  }, [layoutTree, data.outcomePayoffs, data.payoffPlayer, playerLabel, nodeLabel]);

  /* ---- Sandbox handlers -------------------------------------------- */

  const handleProbChange = useCallback((actionUri: string, value: number, siblings: string[]) => {
    setProbOverrides(prev => {
      const next = new Map(prev);
      next.set(actionUri, value);
      // Distribute remainder among siblings
      const remainder = 1 - value;
      const sibCount = siblings.length;
      if (sibCount > 0) {
        // Get current sibling values
        const currentSibValues = siblings.map(s => {
          const ov = next.get(s);
          return ov !== undefined ? ov : (data.probabilities.get(s) ?? (1 / (sibCount + 1)));
        });
        const sibSum = currentSibValues.reduce((a, b) => a + b, 0);
        for (let i = 0; i < siblings.length; i++) {
          if (sibSum > 0) {
            next.set(siblings[i], (currentSibValues[i] / sibSum) * remainder);
          } else {
            next.set(siblings[i], remainder / sibCount);
          }
        }
      }
      return next;
    });
  }, [data.probabilities]);

  const handleUtilChange = useCallback((payoffUri: string, value: number) => {
    setUtilOverrides(prev => {
      const next = new Map(prev);
      next.set(payoffUri, value);
      return next;
    });
  }, []);

  const resetOverrides = useCallback(() => {
    setProbOverrides(new Map());
    setUtilOverrides(new Map());
  }, []);

  /* ---- SVG tree renderer ------------------------------------------- */

  const renderSvgTree = useCallback((
    tree: TreeLayoutNode | null,
    optimal: Set<string>,
    _biResults: Map<string, BackwardResult>,
    onClickNode?: (id: string) => void,
    mini?: boolean,
  ) => {
    if (!tree) return <div style={{ padding: 24, color: text.muted, fontSize: 11 }}>No tree data available.</div>;

    // Compute SVG dimensions
    let maxDepth = 0;
    let maxY = 0;
    function measure(node: TreeLayoutNode) {
      if (node.depth > maxDepth) maxDepth = node.depth;
      if (node.y > maxY) maxY = node.y;
      for (const edge of node.children) measure(edge.child);
    }
    measure(tree);

    const svgW = (maxDepth + 1) * LEVEL_WIDTH + PADDING * 2;
    const svgH = maxY + PADDING * 2 + NODE_SIZE;
    const scale = mini ? 0.6 : 1;

    function nodeX(depth: number) { return PADDING + depth * LEVEL_WIDTH; }
    function nodeY(y: number) { return PADDING + y; }

    const edges: React.ReactNode[] = [];
    const nodes: React.ReactNode[] = [];

    function renderNode(node: TreeLayoutNode) {
      const cx = nodeX(node.depth);
      const cy = nodeY(node.y);

      // Render edges to children
      for (const edge of node.children) {
        const childCx = nodeX(edge.child.depth);
        const childCy = nodeY(edge.child.y);

        const edgeKey = `${node.id}->${edge.child.id}`;
        const isOptimal = optimal.has(edgeKey);

        // Cubic bezier
        const midX = (cx + childCx) / 2;
        const pathD = `M ${cx + NODE_SIZE / 2} ${cy} C ${midX} ${cy}, ${midX} ${childCy}, ${childCx - NODE_SIZE / 2} ${childCy}`;

        edges.push(
          <path
            key={`edge-${edgeKey}`}
            d={pathD}
            fill="none"
            stroke={isOptimal ? palette.emerald : "rgba(255,255,255,0.35)"}
            strokeWidth={isOptimal ? 2.5 : 1.5}
            opacity={isOptimal ? 0.9 : 0.8}
          />,
        );

        // Edge label
        const labelX = (cx + childCx) / 2;
        const labelY = (cy + childCy) / 2 - 8;
        edges.push(
          <text
            key={`elabel-${edgeKey}`}
            x={labelX}
            y={labelY}
            fill={isOptimal ? palette.emerald : text.muted}
            fontSize={mini ? 7 : 9}
            fontFamily="'IBM Plex Mono', monospace"
            textAnchor="middle"
          >
            {edge.action}
          </text>,
        );

        // Probability badge for chance edges
        if (edge.probability !== undefined) {
          edges.push(
            <text
              key={`prob-${edgeKey}`}
              x={labelX}
              y={labelY + (mini ? 10 : 12)}
              fill={text.subtle}
              fontSize={mini ? 6 : 8}
              fontFamily="'IBM Plex Mono', monospace"
              textAnchor="middle"
            >
              {(edge.probability * 100).toFixed(0)}%
            </text>,
          );
        }

        renderNode(edge.child);
      }

      // Render node shape
      const pColor = node.playerUri ? (playerColorMap.get(node.playerUri) || text.muted) : text.muted;

      if (node.kind === "DecisionNode") {
        nodes.push(
          <g key={`node-${node.id}`}
            onClick={() => onClickNode?.(node.id)}
            style={{ cursor: onClickNode ? "pointer" : "default" }}
          >
            <rect
              x={cx - NODE_SIZE / 2}
              y={cy - NODE_SIZE / 2}
              width={NODE_SIZE}
              height={NODE_SIZE}
              rx={4}
              fill={`${pColor}33`}
              stroke={pColor}
              strokeWidth={1.5}
            />
            <text
              x={cx}
              y={cy - NODE_SIZE / 2 - 6}
              fill={pColor}
              fontSize={mini ? 7 : 10}
              fontFamily="'IBM Plex Mono', monospace"
              textAnchor="middle"
              fontWeight={600}
            >
              {playerLabel(node.playerUri || "")}
            </text>
          </g>,
        );
      } else if (node.kind === "ChanceNode") {
        nodes.push(
          <g key={`node-${node.id}`}
            onClick={() => onClickNode?.(node.id)}
            style={{ cursor: onClickNode ? "pointer" : "default" }}
          >
            <circle
              cx={cx}
              cy={cy}
              r={NODE_SIZE / 2}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <text
              x={cx}
              y={cy + 3}
              fill={text.muted}
              fontSize={mini ? 7 : 9}
              fontFamily="'IBM Plex Mono', monospace"
              textAnchor="middle"
            >
              C
            </text>
            <text
              x={cx}
              y={cy - NODE_SIZE / 2 - 6}
              fill={text.secondary}
              fontSize={mini ? 7 : 10}
              fontFamily="'IBM Plex Mono', monospace"
              textAnchor="middle"
              fontWeight={600}
            >
              {nodeLabel(node.uri)}
            </text>
          </g>,
        );
      } else if (node.kind === "OutcomeNode") {
        // Diamond shape
        const s = NODE_SIZE / 2;
        const diamond = `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;

        // Determine best payoff color
        const payoffUris = data.outcomePayoffs.get(node.uri) || [];
        let bestColor = "rgba(255,255,255,0.06)";
        let bestVal = -Infinity;
        for (const pu of payoffUris) {
          const plUri = data.payoffPlayer.get(pu);
          const val = data.utilities.get(pu) ?? 0;
          if (plUri && val > bestVal) {
            bestVal = val;
            bestColor = playerColorMap.get(plUri) || bestColor;
          }
        }

        nodes.push(
          <g key={`node-${node.id}`}
            onClick={() => onClickNode?.(node.id)}
            style={{ cursor: onClickNode ? "pointer" : "default" }}
          >
            <path
              d={diamond}
              fill={`${bestColor}22`}
              stroke={bestColor}
              strokeWidth={1}
            />
            <text
              x={cx}
              y={cy - NODE_SIZE / 2 - 6}
              fill={text.secondary}
              fontSize={mini ? 7 : 10}
              fontFamily="'IBM Plex Mono', monospace"
              textAnchor="middle"
              fontWeight={600}
            >
              {nodeLabel(node.uri)}
            </text>
          </g>,
        );

        // Payoff badges below the diamond
        if (!mini) {
          let badgeIdx = 0;
          for (const pu of payoffUris) {
            const plUri = data.payoffPlayer.get(pu);
            const val = data.utilities.get(pu) ?? 0;
            if (!plUri) continue;
            const col = playerColorMap.get(plUri) || text.muted;
            const pName = playerLabel(plUri);
            const shortName = pName.length > 12 ? pName.substring(0, 12) + "…" : pName;
            const badgeText = `${shortName}: ${val}`;
            const badgeW = Math.max(badgeText.length * 5.5 + 12, 50);
            const bx = cx - badgeW / 2;
            const by = cy + NODE_SIZE / 2 + 8 + badgeIdx * 16;

            nodes.push(
              <g key={`payoff-${node.id}-${pu}`}>
                <rect x={bx} y={by - 8} width={badgeW} height={14} rx={3} fill={`${col}22`} stroke={`${col}44`} strokeWidth={0.5} />
                <text x={cx} y={by + 1} fill={col} fontSize={9} fontFamily="'IBM Plex Mono', monospace" textAnchor="middle">
                  {badgeText}
                </text>
              </g>,
            );
            badgeIdx++;
          }
        }
      }
    }

    renderNode(tree);

    return (
      <div style={{ overflow: "auto", flex: 1 }}>
        <svg
          width={svgW * scale}
          height={svgH * scale}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: "block" }}
        >
          {edges}
          {nodes}
        </svg>
      </div>
    );
  }, [playerColorMap, playerLabel, data.outcomePayoffs, data.payoffPlayer, data.utilities]);

  /* ---- Payoff matrix renderer -------------------------------------- */

  const renderPayoffMatrix = useCallback((
    md: ReturnType<typeof computeMatrix>,
    neSet: Set<number>,
    mini?: boolean,
  ) => {
    const { profiles, playerUris } = md;
    const strategySets = (md as any).strategySets as Map<string, { plan: Map<string, string>; label: string }[]> | undefined;
    if (!profiles || profiles.length === 0) {
      return <div style={{ padding: 24, color: text.muted, fontSize: 11 }}>No strategy profiles available.</div>;
    }

    const fs = mini ? 9 : 11;
    const cellPad = mini ? "4px 6px" : "8px 12px";

    // 2-player matrix layout
    if (playerUris.length === 2 && strategySets) {
      const rowPlayer = playerUris[0];
      const colPlayer = playerUris[1];
      const rowStrats = strategySets.get(rowPlayer) || [];
      const colStrats = strategySets.get(colPlayer) || [];
      const rowColor = playerColorMap.get(rowPlayer) || text.muted;
      const colColor = playerColorMap.get(colPlayer) || text.muted;

      // Build lookup: (rowLabel, colLabel) -> profile index
      const lookup = new Map<string, number>();
      for (let pi = 0; pi < profiles.length; pi++) {
        const rl = profiles[pi].stratLabel.get(rowPlayer) || "";
        const cl = profiles[pi].stratLabel.get(colPlayer) || "";
        lookup.set(`${rl}|${cl}`, pi);
      }

      return (
        <div style={{ overflow: "auto", padding: mini ? 8 : 16 }}>
          <table style={{
            borderCollapse: "collapse",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: fs,
          }}>
            <thead>
              <tr>
                <th style={{
                  padding: cellPad,
                  borderBottom: `1px solid ${border.medium}`,
                  borderRight: `1px solid ${border.medium}`,
                  color: text.subtle,
                }}>
                  {playerLabel(rowPlayer)} \ {playerLabel(colPlayer)}
                </th>
                {colStrats.map((cs, ci) => (
                  <th key={ci} style={{
                    padding: cellPad,
                    borderBottom: `1px solid ${border.medium}`,
                    color: colColor,
                    fontWeight: 600,
                    textAlign: "center",
                  }}>
                    {cs.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowStrats.map((rs, ri) => (
                <tr key={ri}>
                  <td style={{
                    padding: cellPad,
                    borderRight: `1px solid ${border.medium}`,
                    color: rowColor,
                    fontWeight: 600,
                  }}>
                    {rs.label}
                  </td>
                  {colStrats.map((cs, ci) => {
                    const pi = lookup.get(`${rs.label}|${cs.label}`);
                    const profile = pi !== undefined ? profiles[pi] : undefined;
                    const isNE = pi !== undefined && neSet.has(pi);
                    const rp = profile?.payoffs.get(rowPlayer) ?? 0;
                    const cp = profile?.payoffs.get(colPlayer) ?? 0;

                    return (
                      <td key={ci} style={{
                        padding: cellPad,
                        textAlign: "center",
                        border: `1px solid ${border.subtle}`,
                        background: isNE ? `${palette.emerald}11` : "transparent",
                        boxShadow: isNE ? `inset 0 0 0 1.5px ${palette.emerald}88` : "none",
                      }}>
                        <span style={{ color: rowColor }}>{rp.toFixed(1)}</span>
                        <span style={{ color: text.faint }}>{", "}</span>
                        <span style={{ color: colColor }}>{cp.toFixed(1)}</span>
                        {isNE && !mini && (
                          <div style={{
                            fontSize: 7, color: palette.emerald, marginTop: 2,
                            fontWeight: 600,
                          }}>
                            NE
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // N-player table layout
    return (
      <div style={{ overflow: "auto", padding: mini ? 8 : 16 }}>
        <table style={{
          borderCollapse: "collapse",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: fs,
        }}>
          <thead>
            <tr>
              {playerUris.map(pu => (
                <th key={`strat-${pu}`} style={{
                  padding: cellPad,
                  borderBottom: `1px solid ${border.medium}`,
                  color: playerColorMap.get(pu) || text.muted,
                  fontWeight: 600,
                }}>
                  {playerLabel(pu)} Strategy
                </th>
              ))}
              {playerUris.map(pu => (
                <th key={`pay-${pu}`} style={{
                  padding: cellPad,
                  borderBottom: `1px solid ${border.medium}`,
                  color: playerColorMap.get(pu) || text.muted,
                  fontWeight: 600,
                }}>
                  {playerLabel(pu)} Payoff
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, pi) => {
              const isNE = neSet.has(pi);
              return (
                <tr key={pi} style={{
                  background: isNE ? `${palette.emerald}11` : "transparent",
                  boxShadow: isNE ? `inset 0 0 0 1.5px ${palette.emerald}88` : "none",
                }}>
                  {playerUris.map(pu => (
                    <td key={`s-${pu}`} style={{
                      padding: cellPad,
                      borderBottom: `1px solid ${border.subtle}`,
                      color: text.secondary,
                    }}>
                      {p.stratLabel.get(pu) || "---"}
                    </td>
                  ))}
                  {playerUris.map(pu => (
                    <td key={`p-${pu}`} style={{
                      padding: cellPad,
                      borderBottom: `1px solid ${border.subtle}`,
                      color: playerColorMap.get(pu) || text.muted,
                      fontWeight: 500,
                    }}>
                      {(p.payoffs.get(pu) ?? 0).toFixed(1)}
                      {isNE && pu === playerUris[playerUris.length - 1] && !mini && (
                        <span style={{ marginLeft: 8, fontSize: 7, color: palette.emerald, fontWeight: 600 }}>NE</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [playerColorMap, playerLabel]);

  /* ---- Node detail panel ------------------------------------------- */

  const renderNodeDetail = useCallback((nodeId: string) => {
    const layoutNode = allTreeNodes.get(nodeId);
    if (!layoutNode) return null;

    const node = data.nodes.get(layoutNode.uri);
    if (!node) return null;

    const desc = data.descriptions.get(layoutNode.uri);
    const pColor = layoutNode.playerUri ? (playerColorMap.get(layoutNode.playerUri) || text.muted) : text.muted;
    const actions = data.nodeActions.get(layoutNode.uri) || [];
    const payoffUris = data.outcomePayoffs.get(layoutNode.uri) || [];

    return (
      <div style={{
        padding: 12, borderTop: `1px solid ${border.subtle}`,
        fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
        background: "rgba(255,255,255,0.02)",
        maxHeight: 180, overflow: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ color: text.primary, fontWeight: 600, fontSize: 13 }}>
            {node.label}
          </span>
          <span style={{
            padding: "1px 6px", borderRadius: 3, fontSize: 9,
            background: `${pColor}22`, color: pColor, border: `1px solid ${pColor}44`,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {layoutNode.kind}
          </span>
        </div>
        {desc && (
          <div style={{ color: text.muted, fontSize: 11, marginBottom: 6 }}>{desc}</div>
        )}
        {layoutNode.playerUri && (
          <div style={{ fontSize: 11, color: pColor, marginBottom: 6 }}>
            Player: {playerLabel(layoutNode.playerUri)}
          </div>
        )}
        {actions.length > 0 && (
          <Section title="Actions" color={text.subtle}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {actions.map(au => (
                <span key={au} style={{
                  padding: "2px 8px", borderRadius: 3, fontSize: 10,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${border.medium}`,
                  color: text.secondary, fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {getActionLabel(au)}
                </span>
              ))}
            </div>
          </Section>
        )}
        {payoffUris.length > 0 && (
          <Section title="Payoffs" color={text.subtle}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {payoffUris.map(pu => {
                const plUri = data.payoffPlayer.get(pu);
                const val = data.utilities.get(pu) ?? 0;
                const col = plUri ? (playerColorMap.get(plUri) || text.muted) : text.muted;
                return (
                  <span key={pu} style={{
                    padding: "2px 8px", borderRadius: 3, fontSize: 10,
                    background: `${col}11`, border: `1px solid ${col}33`, color: col,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {plUri ? playerLabel(plUri) : "?"}: {val}
                  </span>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    );
  }, [allTreeNodes, data.nodes, data.descriptions, data.nodeActions, data.outcomePayoffs, data.payoffPlayer, data.utilities, playerColorMap, playerLabel, getActionLabel]);

  /* ---- Player legend ----------------------------------------------- */

  const renderPlayerLegend = useCallback(() => {
    if (players.length === 0) return null;
    return (
      <div style={{
        display: "flex", gap: 12, padding: "4px 16px",
        borderBottom: `1px solid ${border.subtle}`,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
        alignItems: "center",
      }}>
        {players.map(p => {
          const col = playerColorMap.get(p.uri) || text.muted;
          return (
            <div key={p.uri} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: col,
              }} />
              <span style={{ color: col }}>{p.label}</span>
            </div>
          );
        })}
      </div>
    );
  }, [players, playerColorMap]);

  /* ---- Loading / Error states -------------------------------------- */

  if (data.isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <LoadingState message="Loading game theory data..." />
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: palette.rose }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Failed to load data</div>
        <div style={{ fontSize: 11, color: text.muted }}>{data.error.message}</div>
      </div>
    );
  }

  /* ---- Render ------------------------------------------------------- */

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden",
      borderTop: `1px solid ${border.default}`,
    }}>
      {/* Mode toggle + game selector */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 16px",
        borderBottom: `1px solid ${border.subtle}`,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
        alignItems: "center",
      }}>
        {([["tree", "\u229E Game Tree"], ["matrix", "\u229E Payoff Matrix"], ["sandbox", "\u229E Sandbox"]] as const).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m as ExplorerMode)}
            style={{
              padding: "5px 14px", borderRadius: 5, border: "none", cursor: "pointer",
              background: mode === m ? "rgba(255,255,255,0.08)" : "transparent",
              color: mode === m ? text.primary : text.faint,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              fontWeight: mode === m ? 600 : 400, transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {games.length > 1 && (
          <select
            value={activeGameUri || ""}
            onChange={e => setSelectedGameUri(e.target.value || null)}
            style={{
              background: "rgba(255,255,255,0.04)", border: `1px solid ${border.medium}`,
              borderRadius: 4, padding: "3px 8px", color: text.secondary,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              outline: "none",
            }}
          >
            {games.map(g => (
              <option key={g.uri} value={g.uri}>{g.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Player legend */}
      {renderPlayerLegend()}

      {/* Mode content */}
      {mode === "tree" ? (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {renderSvgTree(layoutTree, optimalEdges, backwardResults, (id) => setSelectedNodeId(id))}
          {selectedNodeId && renderNodeDetail(selectedNodeId)}
        </div>
      ) : mode === "matrix" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "12px 16px" }}>
            <div style={{
              fontSize: 8, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: 8, paddingBottom: 4,
              borderBottom: `1px solid ${text.subtle}22`,
            }}>
              Normal-Form Payoff Matrix
            </div>
          </div>
          {renderPayoffMatrix(matrixData, nashEquilibria)}
          {nashEquilibria.size > 0 && (
            <div style={{
              padding: "8px 16px", fontSize: 10, color: palette.emerald,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {nashEquilibria.size} Nash Equilibri{nashEquilibria.size === 1 ? "um" : "a"} found (highlighted)
            </div>
          )}
        </div>
      ) : (
        /* Sandbox mode */
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: sliders */}
          <div style={{
            width: 320, minWidth: 280, overflow: "auto",
            borderRight: `1px solid ${border.subtle}`,
            padding: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{
                fontSize: 8, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Parameter Sandbox
              </div>
              <button
                onClick={resetOverrides}
                style={{
                  padding: "2px 8px", borderRadius: 3, border: `1px solid ${border.medium}`,
                  background: "rgba(255,255,255,0.04)", color: text.muted,
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>

            {/* Probability sliders */}
            {chanceActions.length > 0 && (
              <Section title="Probabilities" color={palette.cyan}>
                {chanceActions.map(ca => {
                  const val = probOverrides.get(ca.actionUri) ?? data.probabilities.get(ca.actionUri) ?? 0;
                  return (
                    <div key={ca.actionUri} style={{ marginBottom: 10 }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: 10, color: text.secondary, marginBottom: 2,
                      }}>
                        <span>{ca.label}</span>
                        <span style={{ color: palette.cyan, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {val.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0} max={1} step={0.01}
                        value={val}
                        onChange={e => handleProbChange(ca.actionUri, parseFloat(e.target.value), ca.siblings)}
                        style={{
                          width: "100%", height: 4,
                          accentColor: palette.cyan,
                        }}
                      />
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Payoff sliders */}
            {payoffEntries.length > 0 && (
              <Section title="Payoffs" color={palette.amber}>
                {payoffEntries.map(pe => {
                  const val = utilOverrides.get(pe.payoffUri) ?? data.utilities.get(pe.payoffUri) ?? 0;
                  const col = playerColorMap.get(pe.playerUri) || text.muted;
                  return (
                    <div key={pe.payoffUri} style={{ marginBottom: 10 }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: 10, color: text.secondary, marginBottom: 2,
                      }}>
                        <span>{pe.label}</span>
                        <span style={{ color: col, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {val}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-10} max={10} step={1}
                        value={val}
                        onChange={e => handleUtilChange(pe.payoffUri, parseInt(e.target.value, 10))}
                        style={{
                          width: "100%", height: 4,
                          accentColor: col,
                        }}
                      />
                    </div>
                  );
                })}
              </Section>
            )}
          </div>

          {/* Right: mini tree + mini matrix */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{
              flex: 1, minHeight: 200, overflow: "auto",
              borderBottom: `1px solid ${border.subtle}`,
            }}>
              <div style={{
                fontSize: 8, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace",
                textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "8px 12px", borderBottom: `1px solid ${text.subtle}22`,
              }}>
                Game Tree (Live)
              </div>
              {renderSvgTree(sandboxTree, sandboxOptimalEdges, sandboxBackwardResults, undefined, true)}
            </div>
            <div style={{ flex: 1, minHeight: 160, overflow: "auto" }}>
              <div style={{
                fontSize: 8, color: text.subtle, fontFamily: "'IBM Plex Mono', monospace",
                textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "8px 12px", borderBottom: `1px solid ${text.subtle}22`,
              }}>
                Payoff Matrix (Live)
              </div>
              {renderPayoffMatrix(sandboxMatrixData, sandboxNashEquilibria, true)}
              {sandboxNashEquilibria.size > 0 && (
                <div style={{
                  padding: "4px 12px", fontSize: 9, color: palette.emerald,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {sandboxNashEquilibria.size} NE
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
