import { useCallback, useEffect, useState } from "react";
import { GraphqlWorkbench } from "@trustgraph/trustkit";
import type { GraphqlResult, GraphqlPreset } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore } from "@trustgraph/react-state";

export function GraphqlPage() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const [presets, setPresets] = useState<GraphqlPreset[]>([]);

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

        const parsed: GraphqlPreset[] = [];
        for (const [key, raw] of Object.entries(queryEntries)) {
          try {
            const val = JSON.parse(raw);
            if (val.language === "graphql") {
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

  const handleExecute = useCallback(async (query: string): Promise<GraphqlResult> => {
    const api = socket.flow(flowId);
    const result = await api.rowsQuery(query);
    return result as GraphqlResult;
  }, [socket, flowId]);

  return <GraphqlWorkbench onExecute={handleExecute} presets={presets} />;
}
