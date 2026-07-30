import { useState, useEffect, useMemo } from "react";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

const HW = "https://trustgraph.ai/ontology/hwsec/hw#";
const SEC = "https://trustgraph.ai/ontology/hwsec/sec#";

function q(body: string): string {
  return `PREFIX hw: <${HW}>\nPREFIX sec: <${SEC}>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\n${body}`;
}

export interface HwNode {
  uri: string;
  label: string;
  kind: string;
}

export function useHwSecData() {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [nodes, setNodes] = useState<Map<string, HwNode>>(new Map());
  const [descriptions, setDescriptions] = useState<Map<string, string[]>>(new Map());
  const [trustLevels, setTrustLevels] = useState<Map<string, number>>(new Map());
  const [protocols, setProtocols] = useState<Map<string, string>>(new Map());
  const [fwVersions, setFwVersions] = useState<Map<string, string>>(new Map());
  const [fwSignatures, setFwSignatures] = useState<Map<string, boolean>>(new Map());
  const [containsRel, setContainsRel] = useState<[string, string][]>([]);
  const [hasInterfaceRel, setHasInterfaceRel] = useState<[string, string][]>([]);
  const [hasFirmwareRel, setHasFirmwareRel] = useState<[string, string][]>([]);
  const [hasSecurityRel, setHasSecurityRel] = useState<[string, string][]>([]);
  const [interactsRel, setInteractsRel] = useState<[string, string][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isSocketReady) return;
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const api = socket.flow(flowId);

        const [
          systemRes, subsystemRes, componentRes, elementRes, hwEntityRes,
          ifaceRes, netIfaceRes, physIfaceRes, logIfaceRes,
          firmwareRes,
          secPropRes, vulnRes, atkRes, cmRes, scRes, tmRes,
          descRes, trustRes, protoRes, fwVerRes, fwSigRes,
          containsRes, hasIfaceRes, hasFwRes, hasSecRes, interactsRes,
        ] = await Promise.all([
          api.sparqlQuery(q(`SELECT ?e ?label WHERE { ?e a hw:System ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?label WHERE { ?e a hw:Subsystem ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?label WHERE { ?e a hw:Component ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?label WHERE { ?e a hw:Element ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?label WHERE { ?e a hw:HardwareEntity ; rdfs:label ?label . }`), collection),

          api.sparqlQuery(q(`SELECT ?i ?label WHERE { ?i a hw:Interface ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?i ?label WHERE { ?i a hw:NetworkInterface ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?i ?label WHERE { ?i a hw:PhysicalInterface ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?i ?label WHERE { ?i a hw:LogicalInterface ; rdfs:label ?label . }`), collection),

          api.sparqlQuery(q(`SELECT ?fw ?label WHERE { ?fw a hw:Firmware ; rdfs:label ?label . }`), collection),

          api.sparqlQuery(q(`SELECT ?sp ?label WHERE { ?sp a sec:SecurityProperty ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?sp ?label WHERE { ?sp a sec:Vulnerability ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?sp ?label WHERE { ?sp a sec:AttackSurface ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?sp ?label WHERE { ?sp a sec:Countermeasure ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?sp ?label WHERE { ?sp a sec:SideChannel ; rdfs:label ?label . }`), collection),
          api.sparqlQuery(q(`SELECT ?sp ?label WHERE { ?sp a sec:ThreatModel ; rdfs:label ?label . }`), collection),

          api.sparqlQuery(q(`SELECT ?e ?d WHERE { ?e hw:description ?d . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?l WHERE { ?e hw:trustLevel ?l . }`), collection),
          api.sparqlQuery(q(`SELECT ?i ?p WHERE { ?i hw:protocol ?p . }`), collection),
          api.sparqlQuery(q(`SELECT ?f ?v WHERE { ?f hw:firmwareVersion ?v . }`), collection),
          api.sparqlQuery(q(`SELECT ?f ?s WHERE { ?f hw:isSignatureVerified ?s . }`), collection),

          api.sparqlQuery(q(`SELECT ?p ?c WHERE { ?p hw:physicallyContains ?c . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?i WHERE { ?e hw:hasInterface ?i . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?fw WHERE { ?e hw:hasFirmware ?fw . }`), collection),
          api.sparqlQuery(q(`SELECT ?e ?sp WHERE { ?e hw:hasSecurityProperty ?sp . }`), collection),
          api.sparqlQuery(q(`SELECT ?a ?b WHERE { ?a hw:interactsWith ?b . }`), collection),
        ]);

        if (cancelled) return;

        const nodeMap = new Map<string, HwNode>();

        const addNodes = (rows: Record<string, string>[], uriKey: string, kind: string) => {
          for (const r of rows) {
            const uri = r[uriKey];
            if (uri && !nodeMap.has(uri)) nodeMap.set(uri, { uri, label: r.label || uri, kind });
          }
        };

        addNodes(systemRes.rows, "e", "System");
        addNodes(subsystemRes.rows, "e", "Subsystem");
        addNodes(componentRes.rows, "e", "Component");
        addNodes(elementRes.rows, "e", "Element");
        addNodes(hwEntityRes.rows, "e", "HardwareEntity");

        addNodes(netIfaceRes.rows, "i", "NetworkInterface");
        addNodes(physIfaceRes.rows, "i", "PhysicalInterface");
        addNodes(logIfaceRes.rows, "i", "LogicalInterface");
        addNodes(ifaceRes.rows, "i", "Interface");

        addNodes(firmwareRes.rows, "fw", "Firmware");

        addNodes(vulnRes.rows, "sp", "Vulnerability");
        addNodes(atkRes.rows, "sp", "AttackSurface");
        addNodes(cmRes.rows, "sp", "Countermeasure");
        addNodes(scRes.rows, "sp", "SideChannel");
        addNodes(tmRes.rows, "sp", "ThreatModel");
        addNodes(secPropRes.rows, "sp", "SecurityProperty");

        setNodes(nodeMap);

        const descMap = new Map<string, string[]>();
        for (const r of descRes.rows) {
          const list = descMap.get(r.e) || [];
          list.push(r.d);
          descMap.set(r.e, list);
        }
        setDescriptions(descMap);

        const tMap = new Map<string, number>();
        for (const r of trustRes.rows) tMap.set(r.e, parseInt(r.l) || 0);
        setTrustLevels(tMap);

        const pMap = new Map<string, string>();
        for (const r of protoRes.rows) pMap.set(r.i, r.p);
        setProtocols(pMap);

        const fvMap = new Map<string, string>();
        for (const r of fwVerRes.rows) fvMap.set(r.f, r.v);
        setFwVersions(fvMap);

        const fsMap = new Map<string, boolean>();
        for (const r of fwSigRes.rows) fsMap.set(r.f, r.s === "True" || r.s === "true");
        setFwSignatures(fsMap);

        setContainsRel(containsRes.rows.map(r => [r.p, r.c]));
        setHasInterfaceRel(hasIfaceRes.rows.map(r => [r.e, r.i]));
        setHasFirmwareRel(hasFwRes.rows.map(r => [r.e, r.fw]));
        setHasSecurityRel(hasSecRes.rows.map(r => [r.e, r.sp]));
        setInteractsRel(interactsRes.rows.map(r => [r.a, r.b]));

        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [socket, isSocketReady, flowId, generation, collection]);

  const children = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [p, c] of containsRel) {
      const list = m.get(p) || [];
      list.push(c);
      m.set(p, list);
    }
    return m;
  }, [containsRel]);

  const parentOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const [p, c] of containsRel) m.set(c, p);
    return m;
  }, [containsRel]);

  const entityInterfaces = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [e, i] of hasInterfaceRel) {
      const list = m.get(e) || [];
      list.push(i);
      m.set(e, list);
    }
    return m;
  }, [hasInterfaceRel]);

  const entityFirmware = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [e, fw] of hasFirmwareRel) {
      const list = m.get(e) || [];
      list.push(fw);
      m.set(e, list);
    }
    return m;
  }, [hasFirmwareRel]);

  const entitySecurity = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [e, sp] of hasSecurityRel) {
      const list = m.get(e) || [];
      list.push(sp);
      m.set(e, list);
    }
    return m;
  }, [hasSecurityRel]);

  const entityInteractions = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [a, b] of interactsRel) {
      const la = m.get(a) || [];
      la.push(b);
      m.set(a, la);
      const lb = m.get(b) || [];
      lb.push(a);
      m.set(b, lb);
    }
    return m;
  }, [interactsRel]);

  return {
    nodes, descriptions, trustLevels, protocols, fwVersions, fwSignatures,
    children, parentOf,
    entityInterfaces, entityFirmware, entitySecurity, entityInteractions,
    isLoading: isLoading || !isSocketReady, error,
  };
}
