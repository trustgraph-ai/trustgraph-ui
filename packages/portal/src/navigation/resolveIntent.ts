import type { NavigationRequest, RouteEntry } from "./types";

export interface ResolvedRoute {
  componentId: string;
  intent?: string;
  target?: string;
  params?: Record<string, string>;
}

export function resolveIntent(
  request: NavigationRequest,
  routes: RouteEntry[],
): ResolvedRoute | null {
  const { intent, target, params } = request;

  if (!intent && !target) return null;

  // Direct component target — no route lookup needed
  if (target?.startsWith("urn:component:")) {
    return {
      componentId: target.slice("urn:component:".length),
      intent,
      target,
      params,
    };
  }

  // Score each matching route — more specific wins
  let best: { entry: RouteEntry; score: number } | null = null;

  for (const entry of routes) {
    let score = 0;

    // Exact target match
    if (entry.target) {
      if (entry.target === target) score += 100;
      else continue;
    }

    // Intent match
    if (entry.intent) {
      if (entry.intent === intent) score += 10;
      else if (!intent) continue;
      else continue;
    }

    // targetType is checked at resolution time — the caller doesn't
    // pass a type, so targetType matching requires an external lookup.
    // For the default router, targetType entries are skipped unless
    // the request explicitly carries a matching target namespace.
    // Future: pluggable routers can do graph lookups here.
    if (entry.targetType) {
      score += 50;
    }

    score += (entry.priority ?? 0);

    if (!best || score > best.score) {
      best = { entry, score };
    }
  }

  if (!best) return null;

  return {
    componentId: best.entry.component,
    intent,
    target,
    params,
  };
}

// URL scheme: /<segment1> or /<segment1>/<segment2>
// Alphanumeric segment = intent, IRI segment (contains :) = target

function isIRI(segment: string): boolean {
  return segment.includes(":");
}

export function parseNavigationUrl(path: string, search: string): NavigationRequest {
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  const params = Object.fromEntries(new URLSearchParams(search));

  let intent: string | undefined;
  let target: string | undefined;

  if (segments.length >= 2) {
    if (isIRI(segments[0])) {
      // Both are IRIs — first is target? Unusual, but handle it
      target = segments.slice(0, 2).join("/");
    } else {
      intent = segments[0];
      target = segments.slice(1).join("/");
    }
  } else if (segments.length === 1) {
    if (isIRI(segments[0])) {
      target = segments[0];
    } else {
      intent = segments[0];
    }
  }

  return {
    intent: intent || undefined,
    target: target || undefined,
    params: Object.keys(params).length > 0 ? params : undefined,
  };
}

function encodePathSegment(s: string): string {
  return encodeURIComponent(s).replace(/%3A/gi, ":");
}

export function buildNavigationUrl(request: NavigationRequest): string {
  const parts: string[] = [];

  if (request.intent) {
    parts.push(encodePathSegment(request.intent));
  }
  if (request.target) {
    parts.push(encodePathSegment(request.target));
  }

  let url = "/" + parts.join("/");

  if (request.params && Object.keys(request.params).length > 0) {
    url += "?" + new URLSearchParams(request.params).toString();
  }

  return url;
}
