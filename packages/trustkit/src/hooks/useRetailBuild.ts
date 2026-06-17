import { useState, useCallback, useRef, useEffect } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";
import { useRetailPrompt, buildRetailTerms } from "./useRetailPrompt";
import type {
  BuildState,
  BuildPhase,
  SlotState,
  HistoryEntry,
  RetailAction,
  RetailLLMResponse,
  DisplayedProduct,
} from "./useRetailPrompt";

export type { BuildState, BuildPhase, SlotState, HistoryEntry };

const RT = "http://trustgraph.ai/ontology/retail#";

const PHASE_ORDER: BuildPhase[] = ["configure", "recommend", "refine", "complete"];

const SLOT_TO_CLASS: Record<string, string> = {
  cpu: "CPU",
  gpu: "GPU",
  motherboard: "Motherboard",
  ram: "RAM",
  storage: "Storage",
  psu: "PSU",
  case: "Case",
  cooler: "Cooling",
  monitor: "Monitor",
  keyboard: "Keyboard",
  mouse: "Mouse",
  headset: "Headset",
};

const CATEGORY_MAP: Record<string, string> = {
  GraphicsCard: "GraphicsCardCategory",
  Processor: "ProcessorCategory",
  Motherboard: "MotherboardCategory",
  Memory: "MemoryCategory",
  Storage: "StorageCategory",
  PowerSupply: "PowerSupplyCategory",
  Case: "CaseCategory",
  Cooling: "CoolingCategory",
  Audio: "AudioCategory",
  StreamingGear: "StreamingCategory",
  Electronics: "Electronics",
  OutdoorGear: "OutdoorGear",
};

const TIER_MAP: Record<string, string> = {
  "Entry": "EntryTier",
  "Mid-range": "MidTier",
  "High-end": "HighTier",
  "Enthusiast": "EnthusiastTier",
};

const SORT_MAP: Record<string, string> = {
  "performance-desc": "DESC(?performanceScore)",
  "price-asc": "ASC(?price)",
  "price-desc": "DESC(?price)",
  "rating-desc": "DESC(?rating)",
};

export interface RecommendedProduct {
  uri: string;
  name: string;
  price: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  performanceTier?: string;
  imageUrl?: string;
  specs: Record<string, string>;
}

export interface RetailBuildState {
  build: BuildState;
  history: HistoryEntry[];
  recommendations: RecommendedProduct[];
  activeSlot: string | null;
  lastMessage: string | null;
  isThinking: boolean;
  isQuerying: boolean;
  error: string | null;
  send: (userText: string) => void;
  sendDirect: (userText: string, seedHistory?: HistoryEntry[]) => void;
  selectProduct: (slot: string, product: RecommendedProduct) => void;
  reset: () => void;
}

function emptyBuild(): BuildState {
  return {
    phase: "configure",
    activity: null,
    budget: null,
    target: null,
    constraints: [],
    slots: {},
    total: 0,
    overBudget: 0,
    allConstraintsPass: true,
  };
}

function recalcTotals(build: BuildState): BuildState {
  const total = Object.values(build.slots).reduce(
    (sum, s) => sum + (s.price ?? 0),
    0,
  );
  const overBudget = build.budget ? Math.max(0, total - build.budget) : 0;
  return { ...build, total, overBudget };
}

function applyStateAction(build: BuildState, action: RetailAction): BuildState {
  switch (action.action) {
    case "set-activity":
      return { ...build, activity: String(action.value ?? "") };
    case "set-budget":
      return { ...build, budget: Number(action.value) || null };
    case "set-target":
      return { ...build, target: String(action.value ?? "") };
    case "set-constraint": {
      const v = String(action.value ?? "");
      if (v && !build.constraints.includes(v)) {
        return { ...build, constraints: [...build.constraints, v] };
      }
      return build;
    }
    case "lock-slot": {
      const slot = action.slot;
      if (slot && build.slots[slot]) {
        return {
          ...build,
          slots: { ...build.slots, [slot]: { ...build.slots[slot], locked: true } },
        };
      }
      return build;
    }
    case "clear-slot": {
      const slot = action.slot;
      if (slot && build.slots[slot]) {
        const { [slot]: _, ...rest } = build.slots;
        return { ...build, slots: rest };
      }
      return build;
    }
    case "advance-phase": {
      const idx = PHASE_ORDER.indexOf(build.phase);
      if (idx < PHASE_ORDER.length - 1) {
        return { ...build, phase: PHASE_ORDER[idx + 1] };
      }
      return build;
    }
    default:
      return build;
  }
}

function buildRecommendQuery(
  slot: string,
  params: Record<string, unknown>,
): string {
  const rdfClass = SLOT_TO_CLASS[slot] || slot;
  const hasClassMapping = slot in SLOT_TO_CLASS;

  const category = (!hasClassMapping && params.category)
    ? CATEGORY_MAP[String(params.category)] || String(params.category)
    : null;

  const tierParam = params["min-performance-tier"];
  const tier = tierParam ? TIER_MAP[String(tierParam)] || String(tierParam) : null;

  const sortParam = params.sort;
  const orderBy = sortParam ? SORT_MAP[String(sortParam)] || "ASC(?price)" : "ASC(?price)";

  const filters: string[] = [];
  if (params["max-price"]) filters.push(`FILTER(?price <= ${Number(params["max-price"])})`);
  if (params["min-price"]) filters.push(`FILTER(?price >= ${Number(params["min-price"])})`);

  const tierClause = tier
    ? `?product rt:hasPerformanceTier rt:${tier} .`
    : "OPTIONAL { ?product rt:hasPerformanceTier ?tierNode . ?tierNode rdfs:label ?tier }";

  const categoryClause = category
    ? `?product rt:hasSubcategory rt:${category} .`
    : "";

  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <https://schema.org/>

SELECT ?product ?name ?price ?rating ?reviewCount ?inStock ?tier ?image
WHERE {
  ?product a rt:${rdfClass} ;
           rdfs:label ?name ;
           rt:price ?price ;
           rt:inStock ?inStock .
  ${categoryClause}
  ${tierClause}
  OPTIONAL { ?product rt:rating ?rating }
  OPTIONAL { ?product rt:reviewCount ?reviewCount }
  OPTIONAL { ?product schema:image ?image }
  ${filters.join("\n  ")}
}
ORDER BY ${orderBy}
LIMIT 6`;
}

function buildProductSpecsQuery(productUri: string, rdfClass: string): string {
  const specProps: Record<string, string[]> = {
    CPU: ["coreCount", "threadCount", "baseClock", "boostClock", "tdp"],
    GPU: ["vram", "gpuLength", "tdp", "performanceScore", "minPSUWattage"],
    Motherboard: ["maxRAMSlots", "maxRAMSpeed", "nvmeSlots", "sataPorts"],
    RAM: ["ramSpeed", "ramCapacity", "ramModules"],
    Storage: ["storageCapacity", "readSpeed", "writeSpeed"],
    PSU: ["psuWattage"],
    Case: ["maxGPULength", "maxCoolerHeight"],
    Cooling: ["coolingCapacity", "coolerHeight"],
  };

  const props = specProps[rdfClass] || [];
  if (props.length === 0) return "";

  const optionals = props
    .map((p) => `OPTIONAL { <${productUri}> rt:${p} ?${p} }`)
    .join("\n  ");
  const selects = props.map((p) => `?${p}`).join(" ");

  return `
PREFIX rt: <${RT}>
SELECT ${selects}
WHERE {
  ${optionals}
}`;
}

function parseProducts(rows: Record<string, string>[]): RecommendedProduct[] {
  return rows.map((row) => ({
    uri: row.product,
    name: row.name,
    price: parseFloat(row.price) || 0,
    rating: parseFloat(row.rating) || 0,
    reviewCount: parseInt(row.reviewCount) || 0,
    inStock: row.inStock === "true",
    performanceTier: row.tier || undefined,
    imageUrl: row.image || undefined,
    specs: {},
  }));
}

export function useRetailBuild(): RetailBuildState {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const prompt = useRetailPrompt("retail-assistant");

  const [build, setBuild] = useState<BuildState>(emptyBuild);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRef = useRef(build);
  buildRef.current = build;
  const historyRef = useRef(history);
  historyRef.current = history;
  const recsRef = useRef(recommendations);
  recsRef.current = recommendations;

  const executeActions = useCallback(
    async (actions: RetailAction[], currentBuild: BuildState) => {
      let b = currentBuild;

      for (const action of actions) {
        b = applyStateAction(b, action);
      }
      b = recalcTotals(b);
      setBuild(b);
      buildRef.current = b;

      const recommendAction = actions.find((a) => a.action === "recommend");
      if (recommendAction?.slot && recommendAction.parameters) {
        setActiveSlot(recommendAction.slot);
        setIsQuerying(true);
        try {
          const api = socket.flow(flowId);
          const params = recommendAction.parameters as Record<string, unknown>;
          let result = await api.sparqlQuery(buildRecommendQuery(recommendAction.slot, params));

          if (result.rows.length === 0 && params["min-performance-tier"]) {
            const relaxed = { ...params };
            delete relaxed["min-performance-tier"];
            result = await api.sparqlQuery(buildRecommendQuery(recommendAction.slot, relaxed));
          }

          if (result.rows.length === 0 && params["max-price"]) {
            const relaxed = { ...params };
            delete relaxed["min-performance-tier"];
            delete relaxed["max-price"];
            result = await api.sparqlQuery(buildRecommendQuery(recommendAction.slot, relaxed));
          }

          const products = parseProducts(result.rows);

          if (products.length > 0) {
            const rdfClass = SLOT_TO_CLASS[recommendAction.slot] || recommendAction.slot;
            const specResults = await Promise.all(
              products.slice(0, 3).map(async (p) => {
                const specQuery = buildProductSpecsQuery(p.uri, rdfClass);
                if (!specQuery) return {};
                const specResult = await api.sparqlQuery(specQuery);
                const row = specResult.rows[0] || {};
                const specs: Record<string, string> = {};
                for (const [k, v] of Object.entries(row)) {
                  if (v) specs[k] = v;
                }
                return specs;
              }),
            );
            for (let i = 0; i < Math.min(3, products.length); i++) {
              products[i].specs = specResults[i];
            }
          }

          setRecommendations(products);
          if (products.length === 0) {
            setActiveSlot(null);
            const slotLabel = recommendAction.slot.charAt(0).toUpperCase() + recommendAction.slot.slice(1);
            const notice = `[No ${slotLabel} products available in catalog — skip this slot and continue with the next component]`;
            const updatedHistory: HistoryEntry[] = [...historyRef.current, { role: "user", text: notice }];
            setHistory(updatedHistory);
            historyRef.current = updatedHistory;
            const terms = buildRetailTerms(notice, updatedHistory, b);
            prompt.send(terms);
          }
        } catch (err) {
          setError(`Failed to query products: ${err}`);
          setRecommendations([]);
          setActiveSlot(null);
        } finally {
          setIsQuerying(false);
        }
      }
    },
    [socket, flowId, prompt],
  );

  const processedRef = useRef<RetailLLMResponse | null>(null);

  useEffect(() => {
    if (
      prompt.response &&
      !prompt.isStreaming &&
      prompt.response !== processedRef.current
    ) {
      processedRef.current = prompt.response;
      setLastMessage(prompt.response.message);
      setHistory((h) => [...h, { role: "assistant", text: prompt.response!.message }]);
      executeActions(prompt.response.actions, buildRef.current);
    }
  }, [prompt.response, prompt.isStreaming, executeActions]);

  const send = useCallback(
    (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || prompt.isStreaming) return;

      const newHistory: HistoryEntry[] = [...history, { role: "user", text: trimmed }];
      setHistory(newHistory);
      setError(null);

      const displayed: DisplayedProduct[] = recsRef.current.map((r) => ({
        name: r.name,
        price: r.price,
        specs: r.specs,
      }));
      const terms = buildRetailTerms(trimmed, newHistory, buildRef.current, displayed);
      prompt.send(terms);
    },
    [history, prompt],
  );

  const sendDirect = useCallback(
    (userText: string, priorContext?: HistoryEntry[]) => {
      const trimmed = userText.trim();
      if (!trimmed || prompt.isStreaming) return;

      const newHistory: HistoryEntry[] = [{ role: "user", text: trimmed }];
      setHistory(newHistory);
      historyRef.current = newHistory;
      setError(null);

      const promptHistory = priorContext
        ? [...priorContext, { role: "user" as const, text: trimmed }]
        : newHistory;
      const terms = buildRetailTerms(trimmed, promptHistory, buildRef.current);
      prompt.send(terms);
    },
    [prompt],
  );

  const selectProduct = useCallback(
    (slot: string, product: RecommendedProduct) => {
      const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1);
      const selectionNote = `[Selected ${product.name} ($${product.price.toFixed(0)}) for ${slotLabel}]`;

      setBuild((prev) => {
        const updated = {
          ...prev,
          slots: {
            ...prev.slots,
            [slot]: {
              product: product.name,
              uri: product.uri || null,
              price: product.price,
              locked: false,
            } as SlotState,
          },
        };
        const recalced = recalcTotals(updated);
        buildRef.current = recalced;
        return recalced;
      });
      setActiveSlot(null);
      setRecommendations([]);

      const updatedHistory: HistoryEntry[] = [...history, { role: "user", text: selectionNote }];
      setHistory(updatedHistory);

      const terms = buildRetailTerms(selectionNote, updatedHistory, buildRef.current);
      prompt.send(terms);
    },
    [history, prompt],
  );

  const reset = useCallback(() => {
    setBuild(emptyBuild());
    setHistory([]);
    setRecommendations([]);
    setActiveSlot(null);
    setLastMessage(null);
    setError(null);
  }, []);

  return {
    build,
    history,
    recommendations,
    activeSlot,
    lastMessage,
    isThinking: prompt.isStreaming,
    isQuerying,
    error: error || prompt.error,
    send,
    sendDirect,
    selectProduct,
    reset,
  };
}
