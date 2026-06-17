import { useState, useCallback, useEffect } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";

const IX = "http://trustgraph.ai/ontology/interaction#";

export interface CompetitorEntry {
  uri: string;
  name: string;
  wins: number;
  losses: number;
  winRate: number;
}

export interface CategoryCompetition {
  slot: string;
  competitors: CompetitorEntry[];
}

export interface HeadToHead {
  slot: string;
  winnerUri: string;
  winnerName: string;
  loserUri: string;
  loserName: string;
  encounters: number;
}

export interface FunnelEntry {
  uri: string;
  name: string;
  slot: string;
  shown: number;
  selected: number;
  purchased: number;
}

export interface AnchorAttachment {
  anchorUri: string;
  anchorName: string;
  attachUri: string;
  attachName: string;
  coSessions: number;
  totalAnchorSessions: number;
  attachRate: number;
}

export interface BudgetTierDef {
  label: string;
  min?: number;
  max?: number;
}

export const BUDGET_TIERS: BudgetTierDef[] = [
  { label: "All Budgets" },
  { label: "Under $1K", max: 1000 },
  { label: "$1K\u2013$1.5K", min: 1000, max: 1500 },
  { label: "$1.5K\u2013$2K", min: 1500, max: 2000 },
  { label: "Over $2K", min: 2000 },
];

export interface BrandAnalyticsData {
  competition: CategoryCompetition[];
  headToHead: HeadToHead[];
  funnel: FunnelEntry[];
  anchorBasket: AnchorAttachment[];
  categories: string[];
  budgetTierIndex: number;
  setBudgetTier: (index: number) => void;
  categoryFilter: string | null;
  setCategoryFilter: (cat: string | null) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const SLOT_LABELS: Record<string, string> = {
  cpu: "CPU", gpu: "GPU", ram: "RAM", psu: "PSU",
  motherboard: "Motherboard", storage: "Storage", case: "Case", cooler: "Cooler",
};

function slotDisplayName(uri: string): string {
  const local = uri.split("#").pop() || "";
  return SLOT_LABELS[local] || local.charAt(0).toUpperCase() + local.slice(1);
}

function makeEventSessionFilter(uris: string[] | null): string {
  if (!uris) return "";
  if (uris.length === 0) return "FILTER(false)";
  return `?event ix:inSession ?_fs .\n    VALUES ?_fs { ${uris.map((s) => `<${s}>`).join(" ")} }`;
}

function makeSessionValues(uris: string[] | null): string {
  if (!uris) return "";
  if (uris.length === 0) return "FILTER(false)";
  return `VALUES ?session { ${uris.map((s) => `<${s}>`).join(" ")} }`;
}

function sessionBudgetsQuery(): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?session (MAX(?b) AS ?budget)
WHERE {
  ?event rdf:type ix:BudgetSignal ;
         ix:inSession ?session ;
         ix:statedBudget ?b .
}
GROUP BY ?session`;
}

function competitionQuery(sf: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?slot ?product ?name (SUM(?w) AS ?wins) (SUM(?l) AS ?losses)
WHERE {
  {
    ?event rdf:type ix:DecisionPoint ;
           ix:selectedOption ?product ;
           ix:involvedCategory ?slot .
    ${sf}
    ?product rdfs:label ?name .
    BIND(1 AS ?w) BIND(0 AS ?l)
  }
  UNION
  {
    ?event rdf:type ix:DecisionPoint ;
           ix:rejectedOption ?product ;
           ix:involvedCategory ?slot .
    ${sf}
    ?product rdfs:label ?name .
    BIND(0 AS ?w) BIND(1 AS ?l)
  }
}
GROUP BY ?slot ?product ?name
ORDER BY ?slot DESC(?wins)`;
}

function headToHeadQuery(sf: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?slot ?winner ?winnerName ?loser ?loserName (COUNT(*) AS ?encounters)
WHERE {
  ?event rdf:type ix:DecisionPoint ;
         ix:selectedOption ?winner ;
         ix:rejectedOption ?loser ;
         ix:involvedCategory ?slot .
  ${sf}
  ?winner rdfs:label ?winnerName .
  ?loser rdfs:label ?loserName .
}
GROUP BY ?slot ?winner ?winnerName ?loser ?loserName
ORDER BY ?slot DESC(?encounters)`;
}

function purchasedQuery(sf: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?product ?name (COUNT(*) AS ?purchased)
WHERE {
  ?event rdf:type ix:CheckoutCompleted ;
         ix:purchasedProduct ?product .
  ${sf}
  ?product rdfs:label ?name .
}
GROUP BY ?product ?name`;
}

function anchorBasketQuery(sv: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?anchor ?anchorName ?crossSell ?crossSellName (COUNT(DISTINCT ?session) AS ?coSessions)
WHERE {
  ?dEvent rdf:type ix:DecisionPoint ;
          ix:selectedOption ?anchor ;
          ix:inSession ?session .
  ?xEvent rdf:type ix:CrossSellAccepted ;
          ix:acceptedProduct ?crossSell ;
          ix:inSession ?session .
  ${sv}
  ?anchor rdfs:label ?anchorName .
  ?crossSell rdfs:label ?crossSellName .
}
GROUP BY ?anchor ?anchorName ?crossSell ?crossSellName
ORDER BY ?anchor DESC(?coSessions)`;
}

function anchorTotalSessionsQuery(sv: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?product (COUNT(DISTINCT ?session) AS ?totalSessions)
WHERE {
  ?event rdf:type ix:DecisionPoint ;
         ix:selectedOption ?product ;
         ix:inSession ?session .
  ${sv}
}
GROUP BY ?product`;
}

export function useBrandAnalytics(): BrandAnalyticsData {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);

  const [competition, setCompetition] = useState<CategoryCompetition[]>([]);
  const [headToHead, setHeadToHead] = useState<HeadToHead[]>([]);
  const [funnel, setFunnel] = useState<FunnelEntry[]>([]);
  const [anchorBasket, setAnchorBasket] = useState<AnchorAttachment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [budgetTierIndex, setBudgetTierIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const api = socket.flow(flowId);

    try {
      const budgetResult = await api.sparqlQuery(sessionBudgetsQuery()).catch(() => ({ rows: [] }));
      const budgetMap = new Map<string, number>();
      for (const r of budgetResult.rows as Record<string, string>[]) {
        budgetMap.set(r.session, parseFloat(r.budget) || 0);
      }

      const tier = BUDGET_TIERS[budgetTierIndex];
      let matchingSessions: string[] | null = null;
      if (tier.min !== undefined || tier.max !== undefined) {
        matchingSessions = [];
        for (const [uri, budget] of budgetMap) {
          if (tier.min !== undefined && budget < tier.min) continue;
          if (tier.max !== undefined && budget >= tier.max) continue;
          matchingSessions.push(uri);
        }
      }

      const sf = makeEventSessionFilter(matchingSessions);
      const sv = makeSessionValues(matchingSessions);

      const [compResult, h2hResult, purResult, basketResult, totalSessResult] =
        await Promise.all([
          api.sparqlQuery(competitionQuery(sf)).catch(() => ({ rows: [] })),
          api.sparqlQuery(headToHeadQuery(sf)).catch(() => ({ rows: [] })),
          api.sparqlQuery(purchasedQuery(sf)).catch(() => ({ rows: [] })),
          api.sparqlQuery(anchorBasketQuery(sv)).catch(() => ({ rows: [] })),
          api.sparqlQuery(anchorTotalSessionsQuery(sv)).catch(() => ({ rows: [] })),
        ]);

      const compRows = compResult.rows as Record<string, string>[];
      const slotMap = new Map<string, CompetitorEntry[]>();
      const allCategories = new Set<string>();
      for (const r of compRows) {
        const slot = slotDisplayName(r.slot);
        allCategories.add(slot);
        const wins = parseInt(r.wins) || 0;
        const losses = parseInt(r.losses) || 0;
        const total = wins + losses;
        if (!slotMap.has(slot)) slotMap.set(slot, []);
        slotMap.get(slot)!.push({
          uri: r.product,
          name: r.name,
          wins,
          losses,
          winRate: total > 0 ? wins / total : 0,
        });
      }
      const comp: CategoryCompetition[] = [];
      for (const [slot, competitors] of slotMap) {
        competitors.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
        comp.push({ slot, competitors });
      }
      setCompetition(comp);
      setCategories(Array.from(allCategories).sort());

      setHeadToHead(
        (h2hResult.rows as Record<string, string>[]).map((r) => ({
          slot: slotDisplayName(r.slot),
          winnerUri: r.winner,
          winnerName: r.winnerName,
          loserUri: r.loser,
          loserName: r.loserName,
          encounters: parseInt(r.encounters) || 0,
        })),
      );

      const purchasedMap = new Map<string, number>();
      for (const r of purResult.rows as Record<string, string>[]) {
        purchasedMap.set(r.product, parseInt(r.purchased) || 0);
      }
      const funnelEntries: FunnelEntry[] = compRows.map((r) => {
        const wins = parseInt(r.wins) || 0;
        const losses = parseInt(r.losses) || 0;
        return {
          uri: r.product,
          name: r.name,
          slot: slotDisplayName(r.slot),
          shown: wins + losses,
          selected: wins,
          purchased: purchasedMap.get(r.product) || 0,
        };
      });
      funnelEntries.sort((a, b) => b.shown - a.shown);
      setFunnel(funnelEntries);

      const totalMap = new Map<string, number>();
      for (const r of totalSessResult.rows as Record<string, string>[]) {
        totalMap.set(r.product, parseInt(r.totalSessions) || 0);
      }
      setAnchorBasket(
        (basketResult.rows as Record<string, string>[]).map((r) => {
          const coSessions = parseInt(r.coSessions) || 0;
          const totalSess = totalMap.get(r.anchor) || 0;
          return {
            anchorUri: r.anchor,
            anchorName: r.anchorName,
            attachUri: r.crossSell,
            attachName: r.crossSellName,
            coSessions,
            totalAnchorSessions: totalSess,
            attachRate: totalSess > 0 ? coSessions / totalSess : 0,
          };
        }),
      );
    } catch (err) {
      setError(`Failed to load analytics: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [socket, flowId, budgetTierIndex]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    competition,
    headToHead,
    funnel,
    anchorBasket,
    categories,
    budgetTierIndex,
    setBudgetTier: setBudgetTierIndex,
    categoryFilter,
    setCategoryFilter,
    isLoading,
    error,
    refresh,
  };
}
