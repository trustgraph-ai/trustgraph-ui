import { triple, literal } from "../hooks/useTripleWriter";
import type { RawTriple } from "../hooks/useTripleWriter";

const IX = "http://trustgraph.ai/ontology/interaction#";
const RT = "http://trustgraph.ai/ontology/retail#";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

let eventSeq = 0;

export interface EventContext {
  sessionUri: string;
  journeyUri: string;
  previousEventUri?: string;
}

function nextEventUri(sessionId: string): string {
  return `${IX}session/${sessionId}/event/${++eventSeq}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

function baseTriples(eventUri: string, types: string[], ctx: EventContext): RawTriple[] {
  const triples: RawTriple[] = types.map((t) =>
    triple(eventUri, `${RDF}type`, `${IX}${t}`)
  );
  triples.push(triple(eventUri, `${IX}inSession`, ctx.sessionUri));
  triples.push(triple(eventUri, `${IX}timestamp`, { t: "l", v: timestamp() }));
  triples.push(triple(eventUri, `${IX}sequenceIndex`, literal(String(eventSeq))));
  if (ctx.previousEventUri) {
    triples.push(triple(eventUri, `${IX}previousEvent`, ctx.previousEventUri));
  }
  return triples;
}

export function createSessionId(): string {
  return crypto.randomUUID();
}

export function createJourneyId(): string {
  return crypto.randomUUID();
}

export function sessionUri(id: string): string {
  return `${IX}session/${id}`;
}

export function journeyUri(id: string): string {
  return `${IX}journey/${id}`;
}

export function sessionStartTriples(ctx: EventContext, intent?: string): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["SessionStarted"], ctx);

  t.push(triple(ctx.sessionUri, `${RDF}type`, `${IX}Session`));
  t.push(triple(ctx.sessionUri, `${IX}belongsToJourney`, ctx.journeyUri));
  t.push(triple(ctx.sessionUri, `${IX}sessionStartTime`, { t: "l", v: timestamp() }));
  t.push(triple(ctx.sessionUri, `${IX}channel`, literal("web")));

  if (intent) {
    t.push(triple(ctx.sessionUri, `${IX}initialIntent`, literal(intent)));
  }

  return { triples: t, eventUri: uri };
}

export function searchTriples(
  ctx: EventContext,
  queryText: string,
  interpretedIntent?: string,
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["Search"], ctx);
  t.push(triple(uri, `${IX}queryText`, literal(queryText)));
  if (interpretedIntent) {
    t.push(triple(uri, `${IX}interpretedIntent`, literal(interpretedIntent)));
  }
  return { triples: t, eventUri: uri };
}

export function resultsViewedTriples(
  ctx: EventContext,
  productUris: string[],
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["ResultsViewed"], ctx);
  for (const p of productUris) {
    t.push(triple(uri, `${IX}shownProduct`, p));
  }
  t.push(triple(uri, `${IX}resultCount`, literal(String(productUris.length))));
  return { triples: t, eventUri: uri };
}

export function recommendationTriples(
  ctx: EventContext,
  productUris: string[],
  reason?: string,
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["RecommendationReceived"], ctx);
  for (const p of productUris) {
    t.push(triple(uri, `${IX}recommendedProduct`, p));
  }
  if (reason) {
    t.push(triple(uri, `${IX}recommendationReason`, literal(reason)));
  }
  return { triples: t, eventUri: uri };
}

export function addedToCartTriples(
  ctx: EventContext,
  productUri: string,
  slot?: string,
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const types = ["AddedToCart", "DecisionPoint"];
  const t = baseTriples(uri, types, ctx);
  t.push(triple(uri, `${IX}addedProduct`, productUri));
  t.push(triple(uri, `${IX}selectedOption`, productUri));
  if (slot) {
    t.push(triple(uri, `${IX}involvedCategory`, `${RT}${slot}`));
  }
  return { triples: t, eventUri: uri };
}

export function componentSwappedTriples(
  ctx: EventContext,
  oldProductUri: string,
  newProductUri: string,
  slot?: string,
  reason?: string,
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const types = ["ComponentSwapped", "DecisionPoint"];
  const t = baseTriples(uri, types, ctx);
  t.push(triple(uri, `${IX}swappedOut`, oldProductUri));
  t.push(triple(uri, `${IX}swappedIn`, newProductUri));
  t.push(triple(uri, `${IX}selectedOption`, newProductUri));
  t.push(triple(uri, `${IX}rejectedOption`, oldProductUri));
  if (slot) {
    t.push(triple(uri, `${IX}involvedCategory`, `${RT}${slot}`));
  }
  if (reason) {
    t.push(triple(uri, `${IX}swapReason`, literal(reason)));
  }
  return { triples: t, eventUri: uri };
}

export function budgetSignalTriples(
  ctx: EventContext,
  amount: number,
  constraintType: "hard-limit" | "preference" | "flexible" = "preference",
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["BudgetSignal"], ctx);
  t.push(triple(uri, `${IX}statedBudget`, literal(String(amount))));
  t.push(triple(uri, `${IX}budgetConstraintType`, literal(constraintType)));
  t.push(triple(uri, `${IX}signalStrength`, literal("strong")));
  return { triples: t, eventUri: uri };
}

export function checkoutStartedTriples(
  ctx: EventContext,
  productUris: string[],
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["CheckoutStarted"], ctx);
  for (const p of productUris) {
    t.push(triple(uri, `${IX}involvedProduct`, p));
  }
  return { triples: t, eventUri: uri };
}

export function checkoutCompletedTriples(
  ctx: EventContext,
  productUris: string[],
  totalSpend: number,
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["CheckoutCompleted"], ctx);
  for (const p of productUris) {
    t.push(triple(uri, `${IX}purchasedProduct`, p));
  }
  t.push(triple(uri, `${IX}totalSpend`, literal(String(totalSpend))));
  return { triples: t, eventUri: uri };
}

export function sessionEndedTriples(
  ctx: EventContext,
  outcome: "purchase" | "abandonment" | "research" | "return-visit" = "research",
): { triples: RawTriple[]; eventUri: string } {
  const sessionId = ctx.sessionUri.replace(`${IX}session/`, "");
  const uri = nextEventUri(sessionId);
  const t = baseTriples(uri, ["SessionEnded"], ctx);
  t.push(triple(ctx.sessionUri, `${IX}sessionEndTime`, { t: "l", v: timestamp() }));
  t.push(triple(ctx.sessionUri, `${IX}sessionOutcome`, literal(outcome)));
  return { triples: t, eventUri: uri };
}
