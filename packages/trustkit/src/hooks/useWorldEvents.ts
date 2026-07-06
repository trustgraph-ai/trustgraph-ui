import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

export interface EventSummary {
  id: string;
  name: string;
  year: number;
  yearLabel: string;
  type: string;
  typeLabel: string;
}

export interface WorldEvent extends EventSummary {
  date?: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  outcome?: string;
  impact?: string;
  responsible?: string;
  affectedPopulation?: string;
}

export interface TimeBucket {
  year: number;
  label: string;
  count: number;
}

export interface EventTypeInfo {
  type: string;
  typeUri: string;
  label: string;
  count: number;
}

export interface GridCell {
  latCell: number;
  lonCell: number;
  avgLat: number;
  avgLon: number;
  count: number;
}

interface LocationInfo {
  lat: number;
  lng: number;
}

export interface SearchFilters {
  locationUris?: string[];
  typeUris?: string[];
  yearRange?: [number, number];
}

function parseYear(raw: string): number {
  const bcMatch = raw.match(/(\d+)\s*BC/i);
  if (bcMatch) return -parseInt(bcMatch[1]);
  const numMatch = raw.match(/-?\d{3,4}/);
  if (numMatch) return parseInt(numMatch[0]);
  return 0;
}

function localName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash >= 0) return uri.substring(hash + 1);
  const slash = uri.lastIndexOf("/");
  if (slash >= 0) return uri.substring(slash + 1);
  return uri;
}

function buildGridQuery(ns: string): string {
  return `
PREFIX we: <${ns}>

SELECT ?latCell ?lonCell
       (AVG(?lat) AS ?avgLat) (AVG(?lon) AS ?avgLon)
       (COUNT(?event) AS ?count)
WHERE {
  ?event we:location ?loc .
  ?loc we:latitude ?lat ;
       we:longitude ?lon .
  BIND(FLOOR(?lat / 5.0) * 5 AS ?latCell)
  BIND(FLOOR(?lon / 5.0) * 5 AS ?lonCell)
}
GROUP BY ?latCell ?lonCell
ORDER BY DESC(?count)`;
}

function buildBucketsQuery(ns: string): string {
  return `
PREFIX we: <${ns}>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?bucketStart ?bucket (COUNT(?event) AS ?count)
WHERE {
  ?event we:year ?year .
  BIND(IF(CONTAINS(?year, "BC"),
    xsd:integer(REPLACE(?year, " BC", "")) * -1,
    xsd:integer(?year)
  ) AS ?numYear)
  BIND(IF(?numYear < 0,
    CEIL(?numYear / 50) * 50,
    FLOOR(?numYear / 50) * 50
  ) AS ?bucketStart)
  BIND(IF(?bucketStart < 0,
    CONCAT(STR(ABS(?bucketStart)), "-", STR(ABS(?bucketStart + 50) + 1), " BC"),
    CONCAT(STR(?bucketStart), "-", STR(?bucketStart + 49))
  ) AS ?bucket)
}
GROUP BY ?bucketStart ?bucket
ORDER BY ?bucketStart`;
}

function buildTypesQuery(ns: string): string {
  return `
PREFIX we: <${ns}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?type ?typeLabel (COUNT(?event) AS ?count)
WHERE {
  ?event a ?type .
  ?type rdfs:subClassOf we:Event ;
        rdfs:label ?typeLabel .
}
GROUP BY ?type ?typeLabel
ORDER BY DESC(?count)`;
}

function buildLocationsQuery(ns: string): string {
  return `
PREFIX we: <${ns}>

SELECT ?loc ?lat ?lng
WHERE {
  ?loc we:latitude ?lat ;
       we:longitude ?lng .
}`;
}

function buildSearchQuery(
  ns: string,
  filters: SearchFilters,
  limit: number,
): string {
  const parts: string[] = [];

  if (filters.locationUris && filters.locationUris.length > 0) {
    const branches = filters.locationUris.map(u =>
      `{ ?event we:location <${u}> . }`
    ).join(" UNION\n");
    parts.push(branches);
  }

  parts.push(`?event we:name ?name ; we:year ?yearStr .`);

  if (filters.typeUris && filters.typeUris.length > 0) {
    const typeList = filters.typeUris.map(u => `<${u}>`).join(", ");
    parts.push(`?event a ?type .
  FILTER(?type IN (${typeList}))
  ?type rdfs:label ?typeLabel .`);
  } else {
    parts.push(`OPTIONAL {
    ?event a ?type .
    ?type rdfs:subClassOf we:Event ;
          rdfs:label ?typeLabel .
  }`);
  }

  if (filters.yearRange) {
    parts.push(`BIND(IF(CONTAINS(?yearStr, "BC"),
    xsd:integer(REPLACE(?yearStr, " BC", "")) * -1,
    xsd:integer(?yearStr)
  ) AS ?numYear)
  FILTER(?numYear >= ${filters.yearRange[0]} && ?numYear <= ${filters.yearRange[1]})`);
  }

  return `
PREFIX we: <${ns}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?event ?name ?yearStr ?type ?typeLabel
WHERE {
  ${parts.join("\n  ")}
}
LIMIT ${limit}`;
}

function termValue(term: import("@trustgraph/client").Term): string {
  if (term.t === "i") return term.i;
  if (term.t === "l") return term.v;
  if (term.t === "b") return term.d;
  return "";
}

export function useWorldEvents(ontologyNs: string) {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [buckets, setBuckets] = useState<TimeBucket[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const locationCache = useRef<Map<string, LocationInfo>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const [gridResult, bucketsResult, typesResult, locationsResult] = await Promise.all([
          api.sparqlQuery(buildGridQuery(ontologyNs), collection),
          api.sparqlQuery(buildBucketsQuery(ontologyNs), collection),
          api.sparqlQuery(buildTypesQuery(ontologyNs), collection),
          api.sparqlQuery(buildLocationsQuery(ontologyNs), collection),
        ]);

        if (cancelled) return;

        const cells: GridCell[] = [];
        for (const row of gridResult.rows) {
          const avgLat = parseFloat(row.avgLat);
          const avgLon = parseFloat(row.avgLon);
          if (isNaN(avgLat) || isNaN(avgLon)) continue;
          cells.push({
            latCell: parseFloat(row.latCell) || 0,
            lonCell: parseFloat(row.lonCell) || 0,
            avgLat,
            avgLon,
            count: parseInt(row.count) || 0,
          });
        }

        const parsedBuckets: TimeBucket[] = [];
        for (const row of bucketsResult.rows) {
          parsedBuckets.push({
            year: parseInt(row.bucketStart) || 0,
            label: row.bucket || "",
            count: parseInt(row.count) || 0,
          });
        }
        parsedBuckets.sort((a, b) => a.year - b.year);

        const types: EventTypeInfo[] = [];
        for (const row of typesResult.rows) {
          const typeUri = row.type || "";
          const typeLocal = typeUri ? localName(typeUri) : "Unknown";
          types.push({
            type: typeLocal,
            typeUri,
            label: row.typeLabel || typeLocal.replace(/([a-z])([A-Z])/g, "$1 $2"),
            count: parseInt(row.count) || 0,
          });
        }
        types.sort((a, b) => b.count - a.count);

        const locs = new Map<string, LocationInfo>();
        for (const row of locationsResult.rows) {
          const lat = parseFloat(row.lat);
          const lng = parseFloat(row.lng);
          if (isNaN(lat) || isNaN(lng)) continue;
          locs.set(row.loc, { lat, lng });
        }
        locationCache.current = locs;

        setGridCells(cells);
        setBuckets(parsedBuckets);
        setEventTypes(types);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket, ontologyNs, flowId, generation, collection]);

  const totalEvents = useMemo(
    () => gridCells.reduce((sum, c) => sum + c.count, 0),
    [gridCells],
  );

  const getLocationUrisInBounds = useCallback((
    latMin: number, latMax: number, lngMin: number, lngMax: number,
  ): string[] => {
    const uris: string[] = [];
    for (const [uri, loc] of locationCache.current) {
      if (loc.lat >= latMin && loc.lat < latMax && loc.lng >= lngMin && loc.lng < lngMax) {
        uris.push(uri);
      }
    }
    return uris;
  }, []);

  const getLocationUrisForPoints = useCallback((
    testFn: (lat: number, lng: number) => boolean,
  ): string[] => {
    const uris: string[] = [];
    for (const [uri, loc] of locationCache.current) {
      if (testFn(loc.lat, loc.lng)) uris.push(uri);
    }
    return uris;
  }, []);

  const searchEvents = useCallback(async (
    filters: SearchFilters,
    limit: number = 25,
  ): Promise<EventSummary[]> => {
    const api = socket.flow(flowId);
    const query = buildSearchQuery(ontologyNs, filters, limit);
    const result = await api.sparqlQuery(query, collection);

    return result.rows.map(row => {
      const typeUri = row.type || "";
      const typeLocal = typeUri ? localName(typeUri) : "Unknown";
      return {
        id: row.event,
        name: row.name || localName(row.event),
        year: parseYear(row.yearStr || ""),
        yearLabel: row.yearStr || "",
        type: typeLocal,
        typeLabel: row.typeLabel || typeLocal.replace(/([a-z])([A-Z])/g, "$1 $2"),
      };
    }).sort((a, b) => a.year - b.year);
  }, [socket, ontologyNs, flowId, generation, collection]);

  const loadEventDetail = useCallback(async (eventUri: string): Promise<WorldEvent | null> => {
    const api = socket.flow(flowId);
    const triples = await api.triplesQuery(
      { t: "i", i: eventUri },
      undefined,
      undefined,
      100,
    );
    if (triples.length === 0) return null;

    const props = new Map<string, string>();
    let locationUri = "";
    let typeUri = "";
    for (const triple of triples) {
      const pred = termValue(triple.p);
      const obj = termValue(triple.o);
      const pLocal = localName(pred);
      if (pLocal === "location") {
        locationUri = obj;
      } else if (pred === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
        if (obj.startsWith(ontologyNs)) typeUri = obj;
      } else {
        props.set(pLocal, obj);
      }
    }

    const loc = locationCache.current.get(locationUri);
    const lat = loc?.lat ?? 0;
    const lng = loc?.lng ?? 0;

    const yearStr = props.get("year") || "";
    const typeLocal = typeUri ? localName(typeUri) : "Unknown";

    return {
      id: eventUri,
      name: props.get("name") || localName(eventUri),
      year: parseYear(yearStr),
      yearLabel: yearStr,
      date: props.get("date") || undefined,
      lat,
      lng,
      radiusKm: undefined,
      type: typeLocal,
      typeLabel: typeLocal.replace(/([a-z])([A-Z])/g, "$1 $2"),
      outcome: props.get("outcome") ? localName(props.get("outcome")!) : undefined,
      impact: props.get("impact") || undefined,
      responsible: props.get("responsible") || undefined,
      affectedPopulation: props.get("affected-population") || undefined,
    };
  }, [socket, ontologyNs, flowId, generation]);

  return {
    gridCells, eventTypes, buckets, totalEvents,
    isLoading, error,
    getLocationUrisInBounds, getLocationUrisForPoints,
    searchEvents, loadEventDetail,
  };
}
