import { useCallback, useEffect, useState } from "react";
import { SparqlWorkbench } from "@trustgraph/trustkit";
import type { SparqlResult, QueryPreset } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

export function SparqlPage() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;
  const [presets, setPresets] = useState<QueryPreset[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await socket.config().getConfigAll() as {
          config: Record<string, Record<string, string>>;
        };
        if (cancelled) return;

        const queryEntries = resp.config?.query;
        if (!queryEntries) {
          setPresets([]);
          return;
        }

        const parsed: QueryPreset[] = [];
        for (const [key, raw] of Object.entries(queryEntries)) {
          try {
            const val = JSON.parse(raw);
            if (val.language === "sparql") {
              parsed.push({
                key,
                title: val.title || key,
                description: val.description || "",
                query: val.query || "",
              });
            }
          } catch {
            // skip malformed entries
          }
        }
        parsed.sort((a, b) => a.title.localeCompare(b.title));
        setPresets(parsed);
      } catch {
        setPresets([]);
      }
    })();

    return () => { cancelled = true; };
  }, [socket, generation]);

  const handleExecute = useCallback(async (query: string): Promise<SparqlResult> => {
    const api = socket.flow(flowId);
    const result = await api.sparqlQuery(query, collection);
    return { columns: result.columns, rows: result.rows };
  }, [socket, flowId, collection]);

  return <SparqlWorkbench onExecute={handleExecute} presets={presets} />;
}
