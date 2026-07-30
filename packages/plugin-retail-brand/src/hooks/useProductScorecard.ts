import { useState, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useSettings } from "@trustgraph/react-state";

const IX = "http://trustgraph.ai/ontology/interaction#";
const RT = "http://trustgraph.ai/ontology/retail#";

export interface ProductScorecardData {
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  winReasons: string[];
  lossReasons: { reasoning: string; winnerName: string }[];
  budgetCohort: string | null;
  topCompetitor: { name: string; losses: number } | null;
  attachHero: { name: string; count: number } | null;
  isLoading: boolean;
}

const EMPTY: ProductScorecardData = {
  price: null, rating: null, reviewCount: null,
  winReasons: [], lossReasons: [],
  budgetCohort: null, topCompetitor: null, attachHero: null,
  isLoading: true,
};

function basicsQuery(uri: string): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?price ?rating ?reviewCount WHERE {
  <${uri}> rt:price ?price .
  OPTIONAL { <${uri}> rt:rating ?rating }
  OPTIONAL { <${uri}> rt:reviewCount ?reviewCount }
} LIMIT 1`;
}

function winReasonsQuery(uri: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT DISTINCT ?reasoning WHERE {
  ?event rdf:type ix:DecisionPoint ;
         ix:selectedOption <${uri}> ;
         ix:decisionReasoning ?reasoning .
} LIMIT 3`;
}

function lossReasonsQuery(uri: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?reasoning ?winnerName WHERE {
  ?event rdf:type ix:DecisionPoint ;
         ix:rejectedOption <${uri}> ;
         ix:selectedOption ?winner ;
         ix:decisionReasoning ?reasoning .
  ?winner rdfs:label ?winnerName .
} LIMIT 3`;
}

function budgetCohortQuery(uri: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?budget WHERE {
  ?event rdf:type ix:DecisionPoint ;
         ix:selectedOption <${uri}> ;
         ix:inSession ?session .
  ?bEvent rdf:type ix:BudgetSignal ;
          ix:inSession ?session ;
          ix:statedBudget ?budget .
}`;
}

function topCompetitorQuery(uri: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?winnerName (COUNT(*) AS ?losses) WHERE {
  ?event rdf:type ix:DecisionPoint ;
         ix:rejectedOption <${uri}> ;
         ix:selectedOption ?winner .
  ?winner rdfs:label ?winnerName .
}
GROUP BY ?winnerName
ORDER BY DESC(?losses)
LIMIT 1`;
}

function attachHeroQuery(uri: string): string {
  return `
PREFIX ix: <${IX}>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?crossSellName (COUNT(DISTINCT ?session) AS ?cnt) WHERE {
  ?dEvent rdf:type ix:DecisionPoint ;
          ix:selectedOption <${uri}> ;
          ix:inSession ?session .
  ?xEvent rdf:type ix:CrossSellAccepted ;
          ix:acceptedProduct ?crossSell ;
          ix:inSession ?session .
  ?crossSell rdfs:label ?crossSellName .
}
GROUP BY ?crossSellName
ORDER BY DESC(?cnt)
LIMIT 1`;
}

function toBudgetTier(budgets: number[]): string | null {
  if (budgets.length === 0) return null;
  const avg = budgets.reduce((a, b) => a + b, 0) / budgets.length;
  if (avg < 1000) return "Under $1,000";
  if (avg < 1500) return "$1,000\u2013$1,500";
  if (avg < 2000) return "$1,500\u2013$2,000";
  return "Over $2,000";
}

export function useProductScorecard() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const { settings } = useSettings();
  const collection = settings.collection;
  const [data, setData] = useState<ProductScorecardData>(EMPTY);
  const cacheRef = useRef(new Map<string, ProductScorecardData>());

  const fetch = useCallback(async (productUri: string) => {
    const cached = cacheRef.current.get(productUri);
    if (cached) {
      setData(cached);
      return;
    }

    setData(EMPTY);
    const api = socket.flow(flowId);

    try {
      const [basics, wins, losses, budgets, competitor, attach] = await Promise.all([
        api.sparqlQuery(basicsQuery(productUri), collection).catch(() => ({ rows: [] })),
        api.sparqlQuery(winReasonsQuery(productUri), collection).catch(() => ({ rows: [] })),
        api.sparqlQuery(lossReasonsQuery(productUri), collection).catch(() => ({ rows: [] })),
        api.sparqlQuery(budgetCohortQuery(productUri), collection).catch(() => ({ rows: [] })),
        api.sparqlQuery(topCompetitorQuery(productUri), collection).catch(() => ({ rows: [] })),
        api.sparqlQuery(attachHeroQuery(productUri), collection).catch(() => ({ rows: [] })),
      ]);

      const b = (basics.rows as Record<string, string>[])[0];
      const compRow = (competitor.rows as Record<string, string>[])[0];
      const attachRow = (attach.rows as Record<string, string>[])[0];
      const budgetValues = (budgets.rows as Record<string, string>[]).map((r) => parseFloat(r.budget)).filter(Boolean);

      const result: ProductScorecardData = {
        price: b ? parseFloat(b.price) || null : null,
        rating: b?.rating ? parseFloat(b.rating) : null,
        reviewCount: b?.reviewCount ? parseInt(b.reviewCount) : null,
        winReasons: (wins.rows as Record<string, string>[]).map((r) => r.reasoning),
        lossReasons: (losses.rows as Record<string, string>[]).map((r) => ({
          reasoning: r.reasoning,
          winnerName: r.winnerName,
        })),
        budgetCohort: toBudgetTier(budgetValues),
        topCompetitor: compRow ? { name: compRow.winnerName, losses: parseInt(compRow.losses) || 0 } : null,
        attachHero: attachRow ? { name: attachRow.crossSellName, count: parseInt(attachRow.cnt) || 0 } : null,
        isLoading: false,
      };

      cacheRef.current.set(productUri, result);
      setData(result);
    } catch {
      setData({ ...EMPTY, isLoading: false });
    }
  }, [socket, flowId, collection]);

  const clear = useCallback(() => setData(EMPTY), []);

  return { data, fetch, clear };
}
