import { useState, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";

export type RetailActionType =
  | "set-activity"
  | "set-budget"
  | "set-target"
  | "set-constraint"
  | "lock-slot"
  | "clear-slot"
  | "recommend"
  | "compare"
  | "upsell"
  | "cross-sell"
  | "explain"
  | "advance-phase"
  | "validate"
  | "rebalance"
  | "switch-flow"
  | "browse"
  | "finalize";

export interface RetailAction {
  action: RetailActionType;
  slot?: string;
  value?: unknown;
  parameters?: Record<string, unknown>;
  category?: string;
  reason?: string;
  [key: string]: unknown;
}

export interface RetailLLMResponse {
  message: string;
  actions: RetailAction[];
}

export type BuildPhase = "configure" | "recommend" | "refine" | "complete";

export interface SlotState {
  product: string | null;
  price: number | null;
  locked: boolean;
  alternatives?: string[];
}

export interface BuildState {
  phase: BuildPhase;
  activity: string | null;
  budget: number | null;
  target: string | null;
  constraints: string[];
  slots: Record<string, SlotState>;
  total: number;
  overBudget: number;
  allConstraintsPass: boolean;
}

export interface HistoryEntry {
  role: "user" | "assistant";
  text: string;
}

export interface DisplayedProduct {
  name: string;
  price: number;
  specs: Record<string, string>;
}

export interface RetailPromptState {
  response: RetailLLMResponse | null;
  rawText: string;
  isStreaming: boolean;
  error: string | null;
  send: (terms: Record<string, unknown>) => void;
}

function stripCodeFences(raw: string): string {
  let s = raw.trim();
  const fenceStart = /^```(?:json)?\s*\n?/;
  const fenceEnd = /\n?\s*```\s*$/;
  if (fenceStart.test(s)) s = s.replace(fenceStart, "");
  if (fenceEnd.test(s)) s = s.replace(fenceEnd, "");
  return s.trim();
}

function normalizeActions(raw: unknown[]): RetailAction[] {
  const actions: RetailAction[] = [];
  let i = 0;
  while (i < raw.length) {
    const item = raw[i];
    if (typeof item === "object" && item !== null && "action" in item) {
      actions.push(item as RetailAction);
      i++;
    } else if (typeof item === "string") {
      const next = raw[i + 1];
      if (typeof next === "object" && next !== null && !("action" in next)) {
        actions.push({ action: item as RetailActionType, ...(next as Record<string, unknown>) });
        i += 2;
      } else {
        actions.push({ action: item as RetailActionType });
        i++;
      }
    } else {
      i++;
    }
  }
  return actions;
}

export function parsePromptResponse(raw: string): { response: RetailLLMResponse; error: string | null } {
  const cleaned = stripCodeFences(raw);
  try {
    const obj = JSON.parse(cleaned);
    const message = typeof obj.message === "string" ? obj.message : cleaned;
    const actions = Array.isArray(obj.actions) ? normalizeActions(obj.actions) : [];
    return { response: { message, actions }, error: null };
  } catch {
    return {
      response: { message: raw.trim(), actions: [] },
      error: "Failed to parse LLM response as JSON",
    };
  }
}

const ALL_PC_SLOTS = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooler"];

interface SlotTerm {
  name: string;
  product: string;
  price: number;
  locked: boolean;
}

export function buildRetailTerms(
  userText: string,
  history: HistoryEntry[],
  buildState: BuildState,
  displayedProducts?: DisplayedProduct[],
): Record<string, unknown> {
  const slots: SlotTerm[] = Object.entries(buildState.slots)
    .filter(([, s]) => s.product)
    .map(([name, s]) => ({
      name,
      product: s.product!,
      price: s.price ?? 0,
      locked: s.locked,
    }));

  const filledNames = new Set(slots.map((s) => s.name));
  const emptySlots = ALL_PC_SLOTS.filter((s) => !filledNames.has(s));

  const products = (displayedProducts || []).map((p) => ({
    name: p.name,
    price: p.price,
    specs: Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(", "),
  }));

  return {
    user_message: userText,
    messages: history,
    phase: buildState.phase,
    activity: buildState.activity || "none",
    budget: buildState.budget ?? 0,
    target: buildState.target || "none",
    constraints: buildState.constraints,
    slots,
    has_slots: slots.length > 0,
    empty_slots: emptySlots,
    has_empty_slots: emptySlots.length > 0,
    total: buildState.total,
    over_budget: buildState.overBudget,
    all_constraints_pass: buildState.allConstraintsPass,
    displayed_products: products,
    has_displayed_products: products.length > 0,
  };
}

export function buildGenericTerms(
  userText: string,
  history: HistoryEntry[],
): Record<string, unknown> {
  return {
    user_message: userText,
    messages: history,
  };
}

export function useRetailPrompt(templateId: string): RetailPromptState {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const [response, setResponse] = useState<RetailLLMResponse | null>(null);
  const [rawText, setRawText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bufferRef = useRef("");
  const abortRef = useRef(false);

  const send = useCallback(
    (terms: Record<string, unknown>) => {
      abortRef.current = false;
      bufferRef.current = "";
      setResponse(null);
      setRawText("");
      setIsStreaming(true);
      setError(null);

      const api = socket.flow(flowId);

      api.promptStreaming(
        templateId,
        terms,
        (chunk: string, complete: boolean) => {
          if (abortRef.current) return;

          bufferRef.current += chunk;
          setRawText(bufferRef.current);

          if (complete) {
            setIsStreaming(false);
            const parsed = parsePromptResponse(bufferRef.current);
            setResponse(parsed.response);
            if (parsed.error) setError(parsed.error);
          }
        },
        (err: string) => {
          if (abortRef.current) return;
          setIsStreaming(false);
          setError(err);
        },
      );
    },
    [socket, flowId, templateId],
  );

  return { response, rawText, isStreaming, error, send };
}
