import { useState, useCallback, useRef, useEffect } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";
import { useRetailPrompt, buildGenericTerms } from "./useRetailPrompt";
import { useRetailBuild } from "./useRetailBuild";
import { useRetailCart } from "./useRetailCart";
import { useTripleWriter } from "./useTripleWriter";
import type {
  HistoryEntry,
  RetailLLMResponse,
  RetailAction,
} from "./useRetailPrompt";
import type { RecommendedProduct, RetailBuildState } from "./useRetailBuild";
import type { CartState } from "./useRetailCart";
import type { EventContext } from "../utils/interactionEvents";
import {
  createSessionId,
  createJourneyId,
  sessionUri,
  journeyUri,
  sessionStartTriples,
  searchTriples,
  resultsViewedTriples,
  recommendationTriples,
  addedToCartTriples,
  componentSwappedTriples,
  budgetSignalTriples,
  checkoutStartedTriples,
  checkoutCompletedTriples,
  sessionEndedTriples,
} from "../utils/interactionEvents";

export type ActiveFlow = "generic" | "pc-build" | "checkout";

const RT = "http://trustgraph.ai/ontology/retail#";

const BROWSE_CATEGORY_MAP: Record<string, string> = {
  CampComfort: "CampComfortCategory",
  CookingAndFood: "CookingAndFoodCategory",
  LightingAndSafety: "LightingAndSafetyCategory",
  SleepSystem: "SleepSystemCategory",
  Electronics: "Electronics",
  Audio: "AudioCategory",
  StreamingGear: "StreamingCategory",
  OutdoorGear: "OutdoorGear",
  DisplayCategory: "DisplayCategory",
  PeripheralsCategory: "PeripheralsCategory",
};

const SORT_MAP: Record<string, string> = {
  "price-asc": "ASC(?price)",
  "price-desc": "DESC(?price)",
  "rating-desc": "DESC(?rating)",
};

function buildBrowseQuery(category: string, params: Record<string, unknown>): string {
  const rdfCategory = BROWSE_CATEGORY_MAP[category] || category;
  const sortParam = params.sort;
  const orderBy = sortParam ? SORT_MAP[String(sortParam)] || "ASC(?price)" : "ASC(?price)";

  const filters: string[] = [];
  if (params["max-price"]) filters.push(`FILTER(?price <= ${Number(params["max-price"])})`);
  if (params["min-price"]) filters.push(`FILTER(?price >= ${Number(params["min-price"])})`);

  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <https://schema.org/>

SELECT ?product ?name ?price ?rating ?reviewCount ?inStock ?image
WHERE {
  ?product rt:hasSubcategory rt:${rdfCategory} ;
           rdfs:label ?name ;
           rt:price ?price ;
           rt:inStock ?inStock .
  OPTIONAL { ?product rt:rating ?rating }
  OPTIONAL { ?product rt:reviewCount ?reviewCount }
  OPTIONAL { ?product schema:image ?image }
  ${filters.join("\n  ")}
}
ORDER BY ${orderBy}
LIMIT 6`;
}

function buildCrossSellCategoryQuery(activity: string): string {
  return `
PREFIX rt: <${RT}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?categoryName
WHERE {
  rt:${activity} rt:crossSellCategory ?category .
  ?category rdfs:label ?categoryName .
}`;
}

function parseBrowseProducts(rows: Record<string, string>[]): RecommendedProduct[] {
  return rows.map((row) => ({
    uri: row.product,
    name: row.name,
    price: parseFloat(row.price) || 0,
    rating: parseFloat(row.rating) || 0,
    reviewCount: parseInt(row.reviewCount) || 0,
    inStock: row.inStock === "true",
    imageUrl: row.image || undefined,
    specs: {},
  }));
}

function buildCheckoutTerms(
  userText: string,
  history: HistoryEntry[],
  cart: CartState,
  activity: string | null,
  budget: number | null,
  crossSellCategories: string[],
): Record<string, unknown> {
  const buildItems = cart.items
    .filter((i) => !i.isExtra)
    .map((i) => ({ slot: i.slot || "item", name: i.name, price: i.price }));
  const extras = cart.items
    .filter((i) => i.isExtra)
    .map((i) => ({ name: i.name, price: i.price }));

  return {
    user_message: userText,
    messages: history,
    activity: activity || "none",
    budget: budget ?? 0,
    build_items: buildItems,
    build_total: cart.buildTotal,
    extras: extras.length > 0 ? extras : null,
    extras_total: cart.extrasTotal,
    order_total: cart.total,
    cross_sell_categories: crossSellCategories.length > 0 ? crossSellCategories : null,
  };
}

export interface RetailOrchestratorState {
  activeFlow: ActiveFlow;
  genericHistory: HistoryEntry[];
  checkoutHistory: HistoryEntry[];
  browseProducts: RecommendedProduct[];
  build: RetailBuildState;
  cart: CartState;
  checkoutMessage: string | null;
  isThinking: boolean;
  isQuerying: boolean;
  error: string | null;
  send: (text: string) => void;
  selectProduct: (slot: string, product: RecommendedProduct) => void;
  addExtra: (product: RecommendedProduct) => void;
  removeExtra: (name: string) => void;
  reset: () => void;
}

export function useRetailOrchestrator(): RetailOrchestratorState {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const genericPrompt = useRetailPrompt("generic-assistant");
  const checkoutPrompt = useRetailPrompt("checkout-assistant");
  const build = useRetailBuild();
  const cart = useRetailCart();
  const writer = useTripleWriter();

  const sessionIdRef = useRef(createSessionId());
  const journeyIdRef = useRef(createJourneyId());
  const lastEventUriRef = useRef<string | undefined>(undefined);
  const sessionStartedRef = useRef(false);

  const getEventContext = useCallback((): EventContext => ({
    sessionUri: sessionUri(sessionIdRef.current),
    journeyUri: journeyUri(journeyIdRef.current),
    previousEventUri: lastEventUriRef.current,
  }), []);

  const emitEvent = useCallback((result: { triples: import("./useTripleWriter").RawTriple[]; eventUri: string }) => {
    writer.emit(result.triples);
    lastEventUriRef.current = result.eventUri;
  }, [writer]);

  const ensureSessionStarted = useCallback(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    emitEvent(sessionStartTriples(getEventContext()));
  }, [getEventContext, emitEvent]);

  const [activeFlow, setActiveFlow] = useState<ActiveFlow>("generic");
  const [genericHistory, setGenericHistory] = useState<HistoryEntry[]>([]);
  const [checkoutHistory, setCheckoutHistory] = useState<HistoryEntry[]>([]);
  const [browseProducts, setBrowseProducts] = useState<RecommendedProduct[]>([]);
  const [crossSellCategories, setCrossSellCategories] = useState<string[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeFlowRef = useRef(activeFlow);
  activeFlowRef.current = activeFlow;
  const genericHistoryRef = useRef(genericHistory);
  genericHistoryRef.current = genericHistory;
  const checkoutHistoryRef = useRef(checkoutHistory);
  checkoutHistoryRef.current = checkoutHistory;
  const pendingMessageRef = useRef<string | null>(null);
  const checkoutInitRef = useRef(false);

  const executeBrowse = useCallback(
    async (action: RetailAction) => {
      if (!action.category) return;
      setIsQuerying(true);
      try {
        const api = socket.flow(flowId);
        const params = (action.parameters || {}) as Record<string, unknown>;
        const result = await api.sparqlQuery(buildBrowseQuery(action.category, params));
        const products = parseBrowseProducts(result.rows);
        setBrowseProducts(products);

        const productUris = products.map((p) => p.uri).filter(Boolean);
        if (productUris.length > 0) {
          emitEvent(resultsViewedTriples(getEventContext(), productUris));
        }
      } catch (err) {
        setError(`Failed to query products: ${err}`);
        setBrowseProducts([]);
      } finally {
        setIsQuerying(false);
      }
    },
    [socket, flowId, getEventContext, emitEvent],
  );

  // --- Generic prompt response handler ---
  const genericProcessedRef = useRef<RetailLLMResponse | null>(null);

  useEffect(() => {
    if (
      activeFlowRef.current !== "generic" ||
      !genericPrompt.response ||
      genericPrompt.isStreaming ||
      genericPrompt.response === genericProcessedRef.current
    ) return;

    genericProcessedRef.current = genericPrompt.response;
    const { message, actions } = genericPrompt.response;

    const withAssistant = [...genericHistoryRef.current, { role: "assistant" as const, text: message }];
    setGenericHistory(withAssistant);
    genericHistoryRef.current = withAssistant;

    const switchAction = actions.find((a) => a.action === "switch-flow");
    if (switchAction) {
      const flow = String(switchAction.value);
      if (flow === "pc-build") {
        setActiveFlow("pc-build");
        activeFlowRef.current = "pc-build";
        if (pendingMessageRef.current) {
          const msg = pendingMessageRef.current;
          pendingMessageRef.current = null;
          build.sendDirect(msg, withAssistant);
        }
        return;
      }
    }

    const browseAction = actions.find((a) => a.action === "browse");
    if (browseAction) {
      executeBrowse(browseAction);
    }
  }, [genericPrompt.response, genericPrompt.isStreaming, build, executeBrowse]);

  // --- Auto-transition to checkout when build completes ---
  useEffect(() => {
    if (
      activeFlowRef.current === "pc-build" &&
      build.build.phase === "complete" &&
      !checkoutInitRef.current
    ) {
      checkoutInitRef.current = true;
      setActiveFlow("checkout");
      activeFlowRef.current = "checkout";

      const slotProductUris = Object.values(build.build.slots)
        .filter((s) => s.product)
        .map((s) => s.product!);
      if (slotProductUris.length > 0) {
        emitEvent(checkoutStartedTriples(getEventContext(), slotProductUris));
      }

      cart.addBuild(build.build);

      const activity = build.build.activity || "";
      if (activity) {
        const api = socket.flow(flowId);
        api.sparqlQuery(buildCrossSellCategoryQuery(activity))
          .then((result: { rows: Record<string, string>[] }) => {
            const cats = result.rows.map((r) => r.categoryName).filter(Boolean);
            setCrossSellCategories(cats);
          })
          .catch(() => {});
      }

      const initHistory: HistoryEntry[] = [{ role: "user", text: "[Build complete — entering checkout]" }];
      setCheckoutHistory(initHistory);
      checkoutHistoryRef.current = initHistory;

      const terms = buildCheckoutTerms(
        "[Build complete — entering checkout]",
        initHistory,
        { ...cart, items: Object.entries(build.build.slots).filter(([, s]) => s.product).map(([slot, s]) => ({ name: s.product!, price: s.price ?? 0, slot, isExtra: false })), buildTotal: build.build.total, extrasTotal: 0, total: build.build.total, isFinalized: false } as CartState,
        build.build.activity,
        build.build.budget,
        [],
      );
      checkoutPrompt.send(terms);
    }
  }, [build.build.phase, build.build, socket, flowId, cart, checkoutPrompt]);

  // --- Checkout prompt response handler ---
  const checkoutProcessedRef = useRef<RetailLLMResponse | null>(null);

  useEffect(() => {
    if (
      activeFlowRef.current !== "checkout" ||
      !checkoutPrompt.response ||
      checkoutPrompt.isStreaming ||
      checkoutPrompt.response === checkoutProcessedRef.current
    ) return;

    checkoutProcessedRef.current = checkoutPrompt.response;
    const { message, actions } = checkoutPrompt.response;

    setCheckoutMessage(message);
    const withAssistant = [...checkoutHistoryRef.current, { role: "assistant" as const, text: message }];
    setCheckoutHistory(withAssistant);
    checkoutHistoryRef.current = withAssistant;

    const browseAction = actions.find((a) => a.action === "browse");
    if (browseAction) {
      executeBrowse(browseAction);
    }

    const finalizeAction = actions.find((a) => a.action === "finalize");
    if (finalizeAction) {
      const purchasedUris = cart.items.map((i) => i.name);
      emitEvent(checkoutCompletedTriples(getEventContext(), purchasedUris, cart.total));
      cart.finalize();
    }
  }, [checkoutPrompt.response, checkoutPrompt.isStreaming, executeBrowse, cart, getEventContext, emitEvent]);

  // --- Recommendation events ---
  const lastRecsRef = useRef<string>("");
  useEffect(() => {
    const recs = build.recommendations;
    if (recs.length === 0) return;
    const key = recs.map((r) => r.uri).join(",");
    if (key === lastRecsRef.current) return;
    lastRecsRef.current = key;
    const uris = recs.map((r) => r.uri).filter(Boolean);
    if (uris.length > 0) {
      emitEvent(recommendationTriples(getEventContext(), uris, build.activeSlot || undefined));
    }
  }, [build.recommendations, build.activeSlot, getEventContext, emitEvent]);

  // --- Budget signal ---
  const lastBudgetRef = useRef<number | null>(null);
  useEffect(() => {
    const budget = build.build.budget;
    if (budget && budget !== lastBudgetRef.current) {
      lastBudgetRef.current = budget;
      ensureSessionStarted();
      emitEvent(budgetSignalTriples(getEventContext(), budget));
    }
  }, [build.build.budget, ensureSessionStarted, getEventContext, emitEvent]);

  // --- Send ---
  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      ensureSessionStarted();
      emitEvent(searchTriples(getEventContext(), trimmed));

      if (activeFlow === "generic") {
        if (genericPrompt.isStreaming) return;
        pendingMessageRef.current = trimmed;
        const newHistory: HistoryEntry[] = [...genericHistory, { role: "user", text: trimmed }];
        setGenericHistory(newHistory);
        genericHistoryRef.current = newHistory;
        setError(null);
        setBrowseProducts([]);
        const terms = buildGenericTerms(trimmed, newHistory);
        genericPrompt.send(terms);
      } else if (activeFlow === "pc-build") {
        build.send(trimmed);
      } else if (activeFlow === "checkout") {
        if (checkoutPrompt.isStreaming) return;
        const newHistory: HistoryEntry[] = [...checkoutHistory, { role: "user", text: trimmed }];
        setCheckoutHistory(newHistory);
        checkoutHistoryRef.current = newHistory;
        setError(null);
        setBrowseProducts([]);
        const terms = buildCheckoutTerms(
          trimmed,
          newHistory,
          cart,
          build.build.activity,
          build.build.budget,
          crossSellCategories,
        );
        checkoutPrompt.send(terms);
      }
    },
    [activeFlow, genericHistory, genericPrompt, build, checkoutHistory, checkoutPrompt, cart, crossSellCategories],
  );

  const selectProduct = useCallback(
    (slot: string, product: RecommendedProduct) => {
      if (activeFlow === "pc-build") {
        const existingSlot = build.build.slots[slot];
        if (existingSlot?.product && product.uri) {
          emitEvent(componentSwappedTriples(
            getEventContext(),
            existingSlot.product,
            product.uri,
            slot,
          ));
        } else if (product.uri) {
          emitEvent(addedToCartTriples(getEventContext(), product.uri, slot));
        }
        build.selectProduct(slot, product);
      }
    },
    [activeFlow, build, getEventContext, emitEvent],
  );

  const addExtra = useCallback(
    (product: RecommendedProduct) => {
      if (product.uri) {
        emitEvent(addedToCartTriples(getEventContext(), product.uri));
      }
      cart.addExtra(product.name, product.price);
      const note = `[Added ${product.name} ($${product.price.toFixed(0)}) to cart]`;
      const newHistory: HistoryEntry[] = [...checkoutHistoryRef.current, { role: "user", text: note }];
      setCheckoutHistory(newHistory);
      checkoutHistoryRef.current = newHistory;

      const terms = buildCheckoutTerms(
        note,
        newHistory,
        cart,
        build.build.activity,
        build.build.budget,
        crossSellCategories,
      );
      checkoutPrompt.send(terms);
    },
    [cart, checkoutPrompt, build.build.activity, build.build.budget, crossSellCategories, getEventContext, emitEvent],
  );

  const removeExtra = useCallback(
    (name: string) => {
      cart.removeExtra(name);
    },
    [cart],
  );

  const reset = useCallback(() => {
    if (sessionStartedRef.current) {
      const outcome = cart.isFinalized ? "purchase" : "abandonment";
      emitEvent(sessionEndedTriples(getEventContext(), outcome as "purchase" | "abandonment"));
      writer.flush();
    }
    setActiveFlow("generic");
    activeFlowRef.current = "generic";
    setGenericHistory([]);
    genericHistoryRef.current = [];
    setCheckoutHistory([]);
    checkoutHistoryRef.current = [];
    setBrowseProducts([]);
    setCrossSellCategories([]);
    setCheckoutMessage(null);
    setError(null);
    pendingMessageRef.current = null;
    genericProcessedRef.current = null;
    checkoutProcessedRef.current = null;
    checkoutInitRef.current = false;
    sessionStartedRef.current = false;
    sessionIdRef.current = createSessionId();
    lastEventUriRef.current = undefined;
    build.reset();
    cart.reset();
  }, [build, cart, getEventContext, emitEvent, writer]);

  const isThinking = activeFlow === "generic"
    ? genericPrompt.isStreaming
    : activeFlow === "pc-build"
      ? build.isThinking
      : checkoutPrompt.isStreaming;

  const combinedError = activeFlow === "generic"
    ? error || genericPrompt.error
    : activeFlow === "pc-build"
      ? build.error
      : error || checkoutPrompt.error;

  return {
    activeFlow,
    genericHistory,
    checkoutHistory,
    browseProducts,
    build,
    cart,
    checkoutMessage,
    isThinking,
    isQuerying: activeFlow === "generic" || activeFlow === "checkout" ? isQuerying : build.isQuerying,
    error: combinedError,
    send,
    selectProduct,
    addExtra,
    removeExtra,
    reset,
  };
}
