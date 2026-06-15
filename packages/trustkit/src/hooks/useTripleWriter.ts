import { useCallback, useRef, useEffect } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";

const NAMED_GRAPH = "urn:graph:interactions";
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2000;

export interface RawTriple {
  s: { t: "i"; i: string } | { t: "l"; v: string };
  p: { t: "i"; i: string };
  o: { t: "i"; i: string } | { t: "l"; v: string };
  g?: string;
}

export function iri(uri: string): { t: "i"; i: string } {
  return { t: "i", i: uri };
}

export function literal(value: string): { t: "l"; v: string } {
  return { t: "l", v: value };
}

export function triple(
  s: string,
  p: string,
  o: string | { t: "i"; i: string } | { t: "l"; v: string },
): RawTriple {
  const oTerm = typeof o === "string"
    ? (o.startsWith("http://") || o.startsWith("https://") || o.startsWith("urn:"))
      ? iri(o)
      : literal(o)
    : o;
  return { s: iri(s), p: iri(p), o: oTerm, g: NAMED_GRAPH };
}

export interface TripleWriter {
  emit: (triples: RawTriple[]) => void;
  flush: () => void;
}

export function useTripleWriter(collection?: string): TripleWriter {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<RawTriple[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const collectionRef = useRef(collection || "default");
  collectionRef.current = collection || "default";

  const getWsUrl = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const params = new URLSearchParams();
    params.set("token", (socket as any).token);
    if ((socket as any).workspace) params.set("workspace", (socket as any).workspace);
    return `${proto}//${host}/api/v1/flow/${flowId}/import/triples?${params.toString()}`;
  }, [socket, flowId]);

  const ensureConnection = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

    try {
      const ws = new WebSocket(getWsUrl());
      ws.onopen = () => console.log("[triple-writer] connected");
      ws.onerror = (e) => console.error("[triple-writer] error", e);
      ws.onclose = () => {
        console.log("[triple-writer] disconnected");
        wsRef.current = null;
      };
      wsRef.current = ws;
    } catch (e) {
      console.error("[triple-writer] failed to connect", e);
    }
  }, [getWsUrl]);

  const sendBatch = useCallback((triples: RawTriple[]) => {
    if (triples.length === 0) return;
    ensureConnection();
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log(`[triple-writer] WS not ready (state=${ws?.readyState}), re-buffering ${triples.length} triples`);
      bufferRef.current.push(...triples);
      return;
    }
    const message = JSON.stringify({
      metadata: {
        id: "",
        metadata: [],
        collection: collectionRef.current,
      },
      triples,
    });
    console.log(`[triple-writer] sending ${triples.length} triples`);
    ws.send(message);
  }, [ensureConnection]);

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0);
    sendBatch(batch);
  }, [sendBatch]);

  const emit = useCallback((triples: RawTriple[]) => {
    console.log(`[triple-writer] emit ${triples.length} triples, buffer now ${bufferRef.current.length + triples.length}`);
    bufferRef.current.push(...triples);
    if (bufferRef.current.length >= BATCH_SIZE) {
      flush();
    }
  }, [flush]);

  useEffect(() => {
    timerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      flush();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [flush]);

  return { emit, flush };
}
