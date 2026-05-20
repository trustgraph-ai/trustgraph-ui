import { useCallback } from "react";
import { SparqlWorkbench } from "@trustgraph/trustkit";
import type { SparqlResult } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";

export function SparqlPage() {
  const socket = useSocket();

  const handleExecute = useCallback(async (query: string): Promise<SparqlResult> => {
    const api = socket.flow("default");
    const result = await api.sparqlQuery(query);
    return { columns: result.columns, rows: result.rows };
  }, [socket]);

  return <SparqlWorkbench onExecute={handleExecute} />;
}
