import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore } from "@trustgraph/react-state";

const ONT_NS = "http://trustgraph.ai/ontology/solar-system#";

export interface CelestialBody {
  uri: string;
  name: string;
  type: string;
  distanceAu: number;
  radiusKm: number;
  parentBody?: string;
}

export interface MissionEvent {
  uri: string;
  missionUri: string;
  type: string;
  date: string;
  description: string;
  nearestBody: string;
  distanceAu: number;
  longitudeDeg: number;
  latitudeDeg: number;
}

export interface SolarMission {
  uri: string;
  name: string;
  type: string;
  agency: string;
  launchDate: string;
  status: string;
  targetBodies: string[];
  events: MissionEvent[];
}

function localName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash >= 0) return uri.substring(hash + 1);
  const slash = uri.lastIndexOf("/");
  if (slash >= 0) return uri.substring(slash + 1);
  return uri;
}

function buildBodiesQuery(): string {
  return `
PREFIX ss: <${ONT_NS}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?body ?name ?type ?distAu ?radiusKm ?parentBody
WHERE {
  ?body a ?type ;
        ss:name ?name .
  ?type rdfs:subClassOf ss:CelestialBody .
  OPTIONAL { ?body ss:avg-distance-from-sun-au ?distAu }
  OPTIONAL { ?body ss:radius-km ?radiusKm }
  OPTIONAL { ?body ss:parent-body ?parentBody }
}`;
}

function buildMissionsQuery(): string {
  return `
PREFIX ss: <${ONT_NS}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?mission ?name ?agency ?launchDate ?status ?type
WHERE {
  ?mission a ?type ;
           ss:name ?name ;
           ss:agency ?agency ;
           ss:launch-date ?launchDate ;
           ss:status ?status .
  ?type rdfs:subClassOf ss:Mission .
}`;
}

function buildTargetsQuery(): string {
  return `
PREFIX ss: <${ONT_NS}>

SELECT ?mission ?body
WHERE {
  ?mission ss:target-body ?body .
}`;
}

function buildEventsQuery(): string {
  return `
PREFIX ss: <${ONT_NS}>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?mission ?event ?date ?desc ?eventType ?nearestBody ?distAu ?lon ?lat
WHERE {
  ?mission ss:has-event ?event .
  ?event a ?eventType ;
         ss:date ?date ;
         ss:description ?desc ;
         ss:nearest-body ?nearestBody ;
         ss:position ?pos .
  ?eventType rdfs:subClassOf ss:MissionEvent .
  ?pos ss:distance-au ?distAu ;
       ss:ecliptic-longitude-deg ?lon ;
       ss:ecliptic-latitude-deg ?lat .
}`;
}

export function useSolarMissions() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const [bodies, setBodies] = useState<CelestialBody[]>([]);
  const [missions, setMissions] = useState<SolarMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const [bodiesResult, missionsResult, targetsResult, eventsResult] =
          await Promise.all([
            api.sparqlQuery(buildBodiesQuery()),
            api.sparqlQuery(buildMissionsQuery()),
            api.sparqlQuery(buildTargetsQuery()),
            api.sparqlQuery(buildEventsQuery()),
          ]);

        if (cancelled) return;

        const parsedBodies: CelestialBody[] = bodiesResult.rows.map(row => ({
          uri: row.body,
          name: row.name,
          type: localName(row.type),
          distanceAu: parseFloat(row.distAu) || 0,
          radiusKm: parseFloat(row.radiusKm) || 0,
          parentBody: row.parentBody || undefined,
        }));

        const targetMap = new Map<string, string[]>();
        for (const row of targetsResult.rows) {
          const list = targetMap.get(row.mission) || [];
          list.push(row.body);
          targetMap.set(row.mission, list);
        }

        const eventsByMission = new Map<string, MissionEvent[]>();
        for (const row of eventsResult.rows) {
          const evt: MissionEvent = {
            uri: row.event,
            missionUri: row.mission,
            type: localName(row.eventType),
            date: row.date,
            description: row.desc || "",
            nearestBody: row.nearestBody,
            distanceAu: parseFloat(row.distAu) || 0,
            longitudeDeg: parseFloat(row.lon) || 0,
            latitudeDeg: parseFloat(row.lat) || 0,
          };
          const list = eventsByMission.get(row.mission) || [];
          list.push(evt);
          eventsByMission.set(row.mission, list);
        }

        const parsedMissions: SolarMission[] = missionsResult.rows.map(row => {
          const events = eventsByMission.get(row.mission) || [];
          events.sort((a, b) => a.date.localeCompare(b.date));
          return {
            uri: row.mission,
            name: row.name,
            type: localName(row.type),
            agency: row.agency,
            launchDate: row.launchDate,
            status: localName(row.status),
            targetBodies: targetMap.get(row.mission) || [],
            events,
          };
        });
        parsedMissions.sort((a, b) => a.launchDate.localeCompare(b.launchDate));

        setBodies(parsedBodies);
        setMissions(parsedMissions);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket, flowId, generation]);

  const bodyMap = useMemo(() => {
    const map = new Map<string, CelestialBody>();
    for (const body of bodies) map.set(body.uri, body);
    return map;
  }, [bodies]);

  return { bodies, missions, bodyMap, isLoading, error };
}
