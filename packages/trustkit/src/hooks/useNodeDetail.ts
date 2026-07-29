import { useState, useEffect } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useSettings, useWorkspaceStore } from "@trustgraph/react-state";
import { useTheme } from "../theme/ThemeContext";
import { getLocalName } from "../utils/uri";

// ── Types ────────────────────────────────────────────────────────

export interface NodeProperty {
  key: string;
  values: string[];
}

export interface NodeRelationship {
  predicate: string;
  predicateUri: string;
  direction: "outgoing" | "incoming";
  targets: { uri: string; label: string; color: string }[];
}

export interface NodeDetail {
  uri: string;
  label: string;
  properties: NodeProperty[];
  relationships: NodeRelationship[];
  isLoading: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

function getTermValue(term: { t: string; i?: string; v?: string }): string {
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  return "";
}

function isUri(term: { t: string }): boolean {
  return term.t === "i";
}

function makeIriTerm(uri: string) {
  return { t: "i" as const, i: uri };
}

function predicateLabel(uri: string): string {
  const name = getLocalName(uri);
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function colorForUri(uri: string, domainColors: Array<{ color: string }>): string {
  return domainColors[hashString(uri) % domainColors.length].color;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useNodeDetail(uri: string | null): NodeDetail | null {
  const { domainColors } = useTheme();
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const { settings } = useSettings();
  const collection = settings.collection;
  const generation = useWorkspaceStore((s) => s.generation);
  const [detail, setDetail] = useState<NodeDetail | null>(null);

  useEffect(() => {
    if (!uri) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setDetail({
        uri,
        label: getLocalName(uri),
        properties: [],
        relationships: [],
        isLoading: true,
      });

      try {
        const api = socket.flow(flowId);

        // Fetch outgoing and incoming triples
        const [outgoing, incoming] = await Promise.all([
          api.triplesQuery(makeIriTerm(uri), undefined, undefined, 500, collection, ""),
          api.triplesQuery(undefined, undefined, makeIriTerm(uri), 500, collection, ""),
        ]);

        if (cancelled) return;

        // Collect labels for all connected URIs
        const connectedUris = new Set<string>();
        for (const t of [...outgoing, ...incoming]) {
          if (isUri(t.s) && getTermValue(t.s) !== uri) connectedUris.add(getTermValue(t.s));
          if (isUri(t.o) && getTermValue(t.o) !== uri) connectedUris.add(getTermValue(t.o));
        }

        const labelFetches: Promise<{ uri: string; triples: { t: string; i?: string; v?: string }[] }>[] = [];
        for (const u of connectedUris) {
          labelFetches.push(
            api.triplesQuery(makeIriTerm(u), makeIriTerm(RDFS_LABEL), undefined, 1, collection, "")
              .then(triples => ({ uri: u, triples: triples.map(t => t.o) }))
          );
        }

        const labelResults = await Promise.all(labelFetches);
        if (cancelled) return;

        const labels = new Map<string, string>();
        for (const { uri: u, triples } of labelResults) {
          if (triples.length > 0) {
            labels.set(u, getTermValue(triples[0]));
          }
        }

        // Parse outgoing triples
        let label = getLocalName(uri);
        const propMap = new Map<string, string[]>();
        const outRelMap = new Map<string, { predicate: string; predicateUri: string; targets: Set<string> }>();

        for (const triple of outgoing) {
          const pred = getTermValue(triple.p);
          const obj = getTermValue(triple.o);

          if (pred === RDFS_LABEL) {
            label = obj;
            continue;
          }

          if (isUri(triple.o)) {
            // URI-to-URI: outgoing relationship
            if (!outRelMap.has(pred)) {
              outRelMap.set(pred, { predicate: predicateLabel(pred), predicateUri: pred, targets: new Set() });
            }
            outRelMap.get(pred)!.targets.add(obj);
          } else {
            // Literal: property
            const key = predicateLabel(pred);
            if (!propMap.has(key)) propMap.set(key, []);
            const vals = propMap.get(key)!;
            if (!vals.includes(obj)) vals.push(obj);
          }
        }

        // Parse incoming triples
        const inRelMap = new Map<string, { predicate: string; predicateUri: string; targets: Set<string> }>();

        for (const triple of incoming) {
          const pred = getTermValue(triple.p);
          const sub = getTermValue(triple.s);

          if (pred === RDFS_LABEL) continue;

          if (isUri(triple.s)) {
            if (!inRelMap.has(pred)) {
              inRelMap.set(pred, { predicate: predicateLabel(pred), predicateUri: pred, targets: new Set() });
            }
            inRelMap.get(pred)!.targets.add(sub);
          }
        }

        // Build final structures
        const properties: NodeProperty[] = Array.from(propMap.entries()).map(
          ([key, values]) => ({ key, values })
        );

        const relationships: NodeRelationship[] = [
          ...Array.from(outRelMap.values()).map(({ predicate, predicateUri, targets }) => ({
            predicate,
            predicateUri,
            direction: "outgoing" as const,
            targets: Array.from(targets).map(u => ({
              uri: u,
              label: labels.get(u) || getLocalName(u),
              color: colorForUri(u, domainColors),
            })),
          })),
          ...Array.from(inRelMap.values()).map(({ predicate, predicateUri, targets }) => ({
            predicate,
            predicateUri,
            direction: "incoming" as const,
            targets: Array.from(targets).map(u => ({
              uri: u,
              label: labels.get(u) || getLocalName(u),
              color: colorForUri(u, domainColors),
            })),
          })),
        ];

        if (!cancelled) {
          setDetail({
            uri,
            label,
            properties,
            relationships,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setDetail(prev => prev ? { ...prev, isLoading: false } : null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uri, socket, flowId, collection, generation]);

  return detail;
}
