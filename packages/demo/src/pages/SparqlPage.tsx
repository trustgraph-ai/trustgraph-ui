import { useCallback } from "react";
import { SparqlWorkbench } from "@trustgraph/trustkit";
import type { SparqlResult } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore } from "@trustgraph/react-state";

export function SparqlPage() {
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);

  const handleExecute = useCallback(async (query: string): Promise<SparqlResult> => {
    const api = socket.flow(flowId);
    const result = await api.sparqlQuery(query);
    return { columns: result.columns, rows: result.rows };
  }, [socket, flowId]);

  return <SparqlWorkbench onExecute={handleExecute} />;
}
