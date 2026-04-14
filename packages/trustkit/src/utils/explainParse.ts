/**
 * Predicate-driven parser for explain event inline triples.
 *
 * Extracts types, known predicates, and DAG edges from the raw triples
 * on an explain event. Does NOT switch on types — the caller decides
 * what to render based on which predicates and types are present.
 */
import type { Triple } from "@trustgraph/react-state";

// ── Well-known URIs ──────────────────────────────────────────────

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const PROV_WAS_DERIVED_FROM = "http://www.w3.org/ns/prov#wasDerivedFrom";
const PROV_WAS_GENERATED_BY = "http://www.w3.org/ns/prov#wasGeneratedBy";
const PROV_STARTED_AT_TIME = "http://www.w3.org/ns/prov#startedAtTime";

const TG = "https://trustgraph.ai/ns/";

// ── Helpers ──────────────────────────────────────────────────────

function termValue(term: { t: string; i?: string; v?: string }): string {
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  return "";
}

function localName(uri: string): string {
  const h = uri.lastIndexOf("#");
  const s = uri.lastIndexOf("/");
  const idx = Math.max(h, s);
  return idx >= 0 ? uri.substring(idx + 1) : uri;
}

// ── Parsed event ─────────────────────────────────────────────────

export interface ParsedExplainEvent {
  /** The explain event URI */
  uri: string;

  /** All rdf:type URIs on this event */
  types: string[];

  /** Human-readable type local names (e.g. "Analysis", "ToolUse") */
  typeNames: string[];

  /** Known types the renderer understands */
  knownTypes: Set<string>;

  /** Type names the renderer does NOT recognise */
  unknownTypeNames: string[];

  /** rdfs:label if present */
  label?: string;

  /** prov:startedAtTime if present */
  startedAt?: string;

  /** prov:wasDerivedFrom URIs */
  derivedFrom: string[];

  /** prov:wasGeneratedBy URIs */
  generatedBy: string[];

  // ── TrustGraph predicates (present or absent) ────────────────

  /** tg:query — question text */
  query?: string;

  /** tg:action — tool name chosen */
  action?: string;

  /** tg:arguments — JSON-encoded tool arguments */
  arguments?: string;

  /** tg:thought — URI linking to thought sub-entity */
  thoughtUri?: string;

  /** tg:observation — URI linking to observation sub-entity */
  observationUri?: string;

  /** tg:concept — extracted concepts (multi-valued) */
  concepts: string[];

  /** tg:entity — entity URIs (multi-valued) */
  entities: string[];

  /** tg:edgeCount — number of candidate edges */
  edgeCount?: number;

  /** tg:selectedEdge — chosen edge URIs (multi-valued) */
  selectedEdges: string[];

  /** tg:edge — edge content references (multi-valued) */
  edges: string[];

  /** tg:reasoning — per-edge reasoning text (multi-valued) */
  reasonings: string[];

  /** tg:chunkCount — number of candidate chunks (DocRag) */
  chunkCount?: number;

  /** tg:selectedChunk — chosen chunk URIs (multi-valued, DocRag) */
  selectedChunks: string[];

  /** tg:document — librarian document URI */
  document?: string;

  /** tg:subagentGoal — sub-agent goals (multi-valued) */
  subagentGoals: string[];

  /** tg:planStep — plan steps (multi-valued) */
  planSteps: string[];

  // ── New instrumentation predicates ───────────────────────────

  /** tg:toolCandidate — tool names available to the LLM (multi-valued) */
  toolCandidates: string[];

  /** tg:stepNumber — 1-based iteration number */
  stepNumber?: number;

  /** tg:inToken — input token count */
  inToken?: number;

  /** tg:outToken — output token count */
  outToken?: number;

  /** tg:llmModel — model identifier */
  llmModel?: string;

  /** tg:llmDurationMs — LLM call time in ms */
  llmDurationMs?: number;

  /** tg:toolDurationMs — tool execution time in ms */
  toolDurationMs?: number;

  /** tg:terminationReason — why the loop stopped */
  terminationReason?: string;

  /** tg:toolError — error message from a failed tool/parse */
  toolError?: string;

  /** tg:pattern — selected pattern (on PatternDecision) */
  pattern?: string;

  /** tg:taskType — identified task type (on PatternDecision) */
  taskType?: string;

  /** Any predicates not recognised above, as { predicate, values } */
  extraPredicates: { predicate: string; predicateName: string; values: string[] }[];
}

// ── Known TG type local names ────────────────────────────────────

const KNOWN_TYPES = new Set([
  // PROV-O
  "Entity", "Activity", "Agent",
  // Shared explainability
  "Question", "GraphRagQuestion", "DocRagQuestion", "AgentQuestion",
  "Grounding", "Exploration", "Focus", "Synthesis",
  "Analysis", "Conclusion",
  // Orchestrator
  "Decomposition", "Finding", "Plan", "StepResult",
  // Mixins
  "Answer", "Reflection", "Thought", "Observation", "ToolUse",
  // Error
  "Error",
  // New
  "PatternDecision",
]);

// ── Parser ───────────────────────────────────────────────────────

export function parseExplainEvent(uri: string, triples: Triple[]): ParsedExplainEvent {
  const result: ParsedExplainEvent = {
    uri,
    types: [],
    typeNames: [],
    knownTypes: new Set(),
    unknownTypeNames: [],
    derivedFrom: [],
    generatedBy: [],
    concepts: [],
    entities: [],
    selectedEdges: [],
    edges: [],
    reasonings: [],
    selectedChunks: [],
    subagentGoals: [],
    planSteps: [],
    toolCandidates: [],
    extraPredicates: [],
  };

  // Collect all triples about the event URI
  const extraMap = new Map<string, string[]>();

  for (const triple of triples) {
    const s = termValue(triple.s);
    const p = termValue(triple.p);
    const o = termValue(triple.o);

    // Only process triples about the event itself
    // (some events carry triples about sub-entities like thought)
    if (s !== uri) continue;

    switch (p) {
      case RDF_TYPE:
        result.types.push(o);
        break;
      case RDFS_LABEL:
        result.label = o;
        break;
      case PROV_WAS_DERIVED_FROM:
        result.derivedFrom.push(o);
        break;
      case PROV_WAS_GENERATED_BY:
        result.generatedBy.push(o);
        break;
      case PROV_STARTED_AT_TIME:
        result.startedAt = o;
        break;
      case TG + "query":
        result.query = o;
        break;
      case TG + "action":
        result.action = o;
        break;
      case TG + "arguments":
        result.arguments = o;
        break;
      case TG + "thought":
        result.thoughtUri = o;
        break;
      case TG + "observation":
        result.observationUri = o;
        break;
      case TG + "concept":
        result.concepts.push(o);
        break;
      case TG + "entity":
        result.entities.push(o);
        break;
      case TG + "edgeCount":
        result.edgeCount = parseInt(o, 10) || undefined;
        break;
      case TG + "selectedEdge":
        result.selectedEdges.push(o);
        break;
      case TG + "edge":
        if (o) result.edges.push(o);
        break;
      case TG + "reasoning":
        result.reasonings.push(o);
        break;
      case TG + "chunkCount":
        result.chunkCount = parseInt(o, 10) || undefined;
        break;
      case TG + "selectedChunk":
        result.selectedChunks.push(o);
        break;
      case TG + "document":
        result.document = o;
        break;
      case TG + "subagentGoal":
        result.subagentGoals.push(o);
        break;
      case TG + "planStep":
        result.planSteps.push(o);
        break;
      case TG + "toolCandidate":
        result.toolCandidates.push(o);
        break;
      case TG + "stepNumber":
        result.stepNumber = parseInt(o, 10) || undefined;
        break;
      case TG + "inToken":
        result.inToken = parseInt(o, 10) || undefined;
        break;
      case TG + "outToken":
        result.outToken = parseInt(o, 10) || undefined;
        break;
      case TG + "llmModel":
        result.llmModel = o;
        break;
      case TG + "llmDurationMs":
        result.llmDurationMs = parseInt(o, 10) || undefined;
        break;
      case TG + "toolDurationMs":
        result.toolDurationMs = parseInt(o, 10) || undefined;
        break;
      case TG + "terminationReason":
        result.terminationReason = o;
        break;
      case TG + "toolError":
        result.toolError = o;
        break;
      case TG + "pattern":
        result.pattern = o;
        break;
      case TG + "taskType":
        result.taskType = o;
        break;
      default:
        // Collect unknown predicates
        if (!extraMap.has(p)) extraMap.set(p, []);
        extraMap.get(p)!.push(o);
        break;
    }
  }

  // Process types
  for (const typeUri of result.types) {
    const name = localName(typeUri);
    result.typeNames.push(name);
    if (KNOWN_TYPES.has(name)) {
      result.knownTypes.add(name);
    } else {
      result.unknownTypeNames.push(name);
    }
  }

  // Process extra predicates
  for (const [pred, values] of extraMap) {
    result.extraPredicates.push({
      predicate: pred,
      predicateName: localName(pred),
      values,
    });
  }

  return result;
}
