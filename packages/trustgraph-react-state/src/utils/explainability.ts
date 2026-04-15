/**
 * Explainability utilities for parsing and structuring explain events
 */

import type { Triple, Term } from "@trustgraph/client";
import {
  TG,
  TG_QUERY,
  TG_EDGE_COUNT,
  TG_SELECTED_EDGE,
  TG_EDGE,
  TG_REASONING,
  TG_CONTENT,
  PROV_STARTED_AT_TIME,
  PROV_WAS_DERIVED_FROM,
  RDF_TYPE,
  RDFS_LABEL,
} from "@trustgraph/client";

// Predicates not yet in client library
const TG_ACTION = TG + "action";
const TG_ARGUMENTS = TG + "arguments";
const TG_SUBAGENT_GOAL = TG + "subagentGoal";
const TG_CONCEPT = TG + "concept";
const TG_ENTITY = TG + "entity";

// RDF type URIs
const TG_AGENT_QUESTION = TG + "AgentQuestion";
const TG_ANALYSIS = TG + "Analysis";
const TG_TOOL_USE = TG + "ToolUse";
const TG_OBSERVATION = TG + "Observation";
const TG_THOUGHT_TYPE = TG + "Thought";
const TG_REFLECTION_TYPE = TG + "Reflection";
const TG_CONCLUSION = TG + "Conclusion";
const TG_ANSWER = TG + "Answer";
const TG_FINDING = TG + "Finding";
const TG_SYNTHESIS_TYPE = TG + "Synthesis";
const TG_DECOMPOSITION = TG + "Decomposition";
const TG_GROUNDING = TG + "Grounding";
const TG_EXPLORATION_TYPE = TG + "Exploration";
const TG_FOCUS_TYPE = TG + "Focus";

// ── Event types ─────────────────────────────────────────────────────

export type ExplainEventType =
  | "question" | "exploration" | "focus" | "synthesis"
  | "agent-question" | "decomposition" | "analysis" | "reflection" | "conclusion"
  | "grounding"
  | "unknown";

// ── Structured events ───────────────────────────────────────────────

export interface QuestionEvent {
  type: "question";
  explainId: string;
  explainGraph: string;
  query?: string;
  timestamp?: string;
}

export interface ExplorationEvent {
  type: "exploration";
  explainId: string;
  explainGraph: string;
  edgeCount?: number;
  /** Entity URIs discovered during exploration */
  entities?: string[];
}

export interface SelectedEdge {
  edge: { s: string; p: string; o: string };
  labels?: { s: string; p: string; o: string };
  reasoning?: string;
  sources?: ProvenanceChainItem[];
}

export interface FocusEvent {
  type: "focus";
  explainId: string;
  explainGraph: string;
  /** URIs of edge selection entities (old format) */
  edgeSelectionUris: string[];
  /** Fully resolved selected edges */
  selectedEdges?: SelectedEdge[];
}

export interface SynthesisEvent {
  type: "synthesis";
  explainId: string;
  explainGraph: string;
  contentLength?: number;
}

export interface GroundingEvent {
  type: "grounding";
  explainId: string;
  explainGraph: string;
  label?: string;
  /** Concepts extracted from the query for graph traversal */
  concepts: string[];
  derivedFrom?: string[];
}

export interface AgentQuestionEvent {
  type: "agent-question";
  explainId: string;
  explainGraph: string;
  query?: string;
  label?: string;
  timestamp?: string;
  derivedFrom?: string[];
}

export interface DecompositionEvent {
  type: "decomposition";
  explainId: string;
  explainGraph: string;
  label?: string;
  goals: string[];
  derivedFrom?: string[];
}

export interface AnalysisEvent {
  type: "analysis";
  explainId: string;
  explainGraph: string;
  label?: string;
  action?: string;
  arguments?: string;
  derivedFrom?: string[];
}

export interface ReflectionEvent {
  type: "reflection";
  explainId: string;
  explainGraph: string;
  label?: string;
  derivedFrom?: string[];
}

export interface ConclusionEvent {
  type: "conclusion";
  explainId: string;
  explainGraph: string;
  label?: string;
  derivedFrom?: string[];
}

// ── Union types ─────────────────────────────────────────────────────

export type StructuredExplainEvent =
  | QuestionEvent
  | ExplorationEvent
  | FocusEvent
  | SynthesisEvent
  | GroundingEvent
  | AgentQuestionEvent
  | DecompositionEvent
  | AnalysisEvent
  | ReflectionEvent
  | ConclusionEvent;

// Provenance chain types

export interface ProvenanceChainItem {
  uri: string;
  label: string;
}

export interface ProvenanceChain {
  chain: ProvenanceChainItem[];
  documentUri?: string;
  documentLabel?: string;
}

// Session data

export interface ExplainabilitySession {
  // Graph-RAG fields
  question?: QuestionEvent;
  exploration?: ExplorationEvent;
  focus?: FocusEvent;
  synthesis?: SynthesisEvent;
  // Agent fields — ordered timeline of events
  agentSteps?: StructuredExplainEvent[];
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract event type from explainId URI (graph-rag fallback)
 */
export function getEventType(explainId: string): ExplainEventType {
  if (explainId.includes("question")) return "question";
  if (explainId.includes("exploration")) return "exploration";
  if (explainId.includes("focus")) return "focus";
  if (explainId.includes("synthesis")) return "synthesis";
  return "unknown";
}

export function getTermValue(term: Term): string {
  if (!term) return "";
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  if (term.t === "t" && term.tr) {
    const s = getTermValue(term.tr.s);
    const p = getTermValue(term.tr.p);
    const o = getTermValue(term.tr.o);
    return `<<${s} ${p} ${o}>>`;
  }
  return "";
}

export function extractQuotedTriple(term: Term): { s: string; p: string; o: string } | null {
  if (term.t === "t" && term.tr) {
    return {
      s: getTermValue(term.tr.s),
      p: getTermValue(term.tr.p),
      o: getTermValue(term.tr.o),
    };
  }
  return null;
}

// ── RDF type detection ──────────────────────────────────────────────

/**
 * Map RDF type URI → event type (first match wins).
 * Agent-specific types only — shared types like tg:Synthesis and
 * tg:Answer are excluded to avoid catching graph-rag events.
 * Grounding, Exploration, Focus are included since they now carry
 * embedded triples with their RDF type.
 */
const RDF_TYPE_CHECKS: [string, ExplainEventType][] = [
  [TG_AGENT_QUESTION, "agent-question"],
  [TG_DECOMPOSITION, "decomposition"],
  [TG_ANALYSIS, "analysis"],
  [TG_TOOL_USE, "analysis"],
  [TG_OBSERVATION, "reflection"],
  [TG_THOUGHT_TYPE, "reflection"],
  [TG_REFLECTION_TYPE, "reflection"],
  [TG_CONCLUSION, "conclusion"],
  [TG_FINDING, "conclusion"],
  [TG_GROUNDING, "grounding"],
  [TG_EXPLORATION_TYPE, "exploration"],
  [TG_FOCUS_TYPE, "focus"],
];

/**
 * Detect event type from RDF types in embedded triples.
 */
export function getEventTypeFromTriples(triples: Triple[]): ExplainEventType {
  const types = new Set<string>();
  for (const t of triples) {
    if (getTermValue(t.p) === RDF_TYPE) {
      types.add(getTermValue(t.o));
    }
  }

  for (const [typeUri, eventType] of RDF_TYPE_CHECKS) {
    if (types.has(typeUri)) return eventType;
  }

  return "unknown";
}

/** Extract common fields (label, derivedFrom) from triples */
function extractCommonFields(triples: Triple[]): {
  label?: string;
  derivedFrom: string[];
} {
  const derivedFrom: string[] = [];
  let label: string | undefined;

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === RDFS_LABEL && o) label = o;
    if (p === PROV_WAS_DERIVED_FROM && o) derivedFrom.push(o);
  }

  return { label, derivedFrom };
}

/**
 * Extract inline edges from triples (tg:edge quoted triples).
 * Returns SelectedEdge objects with URIs — labels resolved later.
 */
function extractInlineEdges(triples: Triple[]): SelectedEdge[] {
  const edges: SelectedEdge[] = [];

  for (const t of triples) {
    if (getTermValue(t.p) === TG_EDGE && t.o.t === "t" && t.o.tr) {
      const edge = extractQuotedTriple(t.o);
      if (edge) {
        edges.push({ edge });
      }
    }
  }

  return edges;
}

// ── Parsers ─────────────────────────────────────────────────────────

export function parseQuestionTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): QuestionEvent {
  const event: QuestionEvent = { type: "question", explainId, explainGraph };

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_QUERY) event.query = o;
    else if (p === PROV_STARTED_AT_TIME) event.timestamp = o;
  }

  return event;
}

export function parseExplorationTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): ExplorationEvent {
  const event: ExplorationEvent = { type: "exploration", explainId, explainGraph };
  const entities: string[] = [];

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_EDGE_COUNT) event.edgeCount = parseInt(o, 10);
    if (p === TG_ENTITY && o) entities.push(o);
  }

  if (entities.length > 0) event.entities = entities;

  return event;
}

export function parseFocusTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): FocusEvent {
  const event: FocusEvent = {
    type: "focus",
    explainId,
    explainGraph,
    edgeSelectionUris: [],
  };

  // Collect edge selection URIs (old format)
  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_SELECTED_EDGE && typeof o === "string") {
      event.edgeSelectionUris.push(o);
    }
  }

  // Extract inline edges (new format: tg:edge with quoted triples)
  const inlineEdges = extractInlineEdges(triples);
  if (inlineEdges.length > 0) {
    event.selectedEdges = inlineEdges;
  }

  return event;
}

export function parseSynthesisTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): SynthesisEvent {
  const event: SynthesisEvent = { type: "synthesis", explainId, explainGraph };

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_CONTENT) event.contentLength = o.length;
  }

  return event;
}

export function parseEdgeSelectionTriples(triples: Triple[]): {
  edge: { s: string; p: string; o: string } | null;
  reasoning: string | null;
} {
  let edge: { s: string; p: string; o: string } | null = null;
  let reasoning: string | null = null;

  for (const triple of triples) {
    const p = getTermValue(triple.p);
    if (p === TG_EDGE) edge = extractQuotedTriple(triple.o);
    else if (p === TG_REASONING) reasoning = getTermValue(triple.o);
  }

  return { edge, reasoning };
}

function parseGroundingTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): GroundingEvent {
  const { label, derivedFrom } = extractCommonFields(triples);
  const concepts: string[] = [];

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_CONCEPT && o) concepts.push(o);
  }

  return { type: "grounding", explainId, explainGraph, label, concepts, derivedFrom };
}

function parseAgentQuestionTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): AgentQuestionEvent {
  const { label, derivedFrom } = extractCommonFields(triples);
  const event: AgentQuestionEvent = {
    type: "agent-question", explainId, explainGraph, label, derivedFrom,
  };

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_QUERY) event.query = o;
    if (p === PROV_STARTED_AT_TIME) event.timestamp = o;
  }

  return event;
}

function parseDecompositionTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): DecompositionEvent {
  const { label, derivedFrom } = extractCommonFields(triples);
  const goals: string[] = [];

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_SUBAGENT_GOAL && o) goals.push(o);
  }

  return { type: "decomposition", explainId, explainGraph, label, goals, derivedFrom };
}

function parseAnalysisTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): AnalysisEvent {
  const { label, derivedFrom } = extractCommonFields(triples);
  const event: AnalysisEvent = {
    type: "analysis", explainId, explainGraph, label, derivedFrom,
  };

  for (const t of triples) {
    const p = getTermValue(t.p);
    const o = getTermValue(t.o);
    if (p === TG_ACTION) event.action = o;
    if (p === TG_ARGUMENTS) event.arguments = o;
  }

  return event;
}

function parseReflectionTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): ReflectionEvent {
  const { label, derivedFrom } = extractCommonFields(triples);
  return { type: "reflection", explainId, explainGraph, label, derivedFrom };
}

function parseConclusionTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): ConclusionEvent {
  const { label, derivedFrom } = extractCommonFields(triples);
  return { type: "conclusion", explainId, explainGraph, label, derivedFrom };
}

// ── Unified parser ──────────────────────────────────────────────────

/**
 * Parse triples into a structured event.
 * Tries RDF type detection first, then URI patterns as fallback.
 * Returns null for events with no triples.
 */
export function parseExplainTriples(
  explainId: string,
  explainGraph: string,
  triples: Triple[]
): StructuredExplainEvent | null {
  if (triples.length === 0) return null;

  // Try RDF type detection first
  const rdfEventType = getEventTypeFromTriples(triples);
  if (rdfEventType !== "unknown") {
    switch (rdfEventType) {
      case "agent-question":
        return parseAgentQuestionTriples(explainId, explainGraph, triples);
      case "decomposition":
        return parseDecompositionTriples(explainId, explainGraph, triples);
      case "analysis":
        return parseAnalysisTriples(explainId, explainGraph, triples);
      case "reflection":
        return parseReflectionTriples(explainId, explainGraph, triples);
      case "conclusion":
        return parseConclusionTriples(explainId, explainGraph, triples);
      case "grounding":
        return parseGroundingTriples(explainId, explainGraph, triples);
      case "exploration":
        return parseExplorationTriples(explainId, explainGraph, triples);
      case "focus":
        return parseFocusTriples(explainId, explainGraph, triples);
    }
  }

  // Fall back to URI pattern detection (graph-rag events)
  const eventType = getEventType(explainId);
  switch (eventType) {
    case "question":
      return parseQuestionTriples(explainId, explainGraph, triples);
    case "exploration":
      return parseExplorationTriples(explainId, explainGraph, triples);
    case "focus":
      return parseFocusTriples(explainId, explainGraph, triples);
    case "synthesis":
      return parseSynthesisTriples(explainId, explainGraph, triples);
    default:
      return null;
  }
}
