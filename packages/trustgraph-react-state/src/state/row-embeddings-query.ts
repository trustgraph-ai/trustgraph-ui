// @ts-nocheck
import { useMutation } from "@tanstack/react-query";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { useSessionStore } from "./session";
import { useSettings } from "./settings";
import { RowEmbeddingsMatch } from "@trustgraph/client";

/**
 * Custom hook for querying row embeddings using vectors.
 * Searches for similar records in structured data indexes.
 */
export const useRowEmbeddingsQuery = ({ flow }: { flow?: string } = {}) => {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const notify = useNotification();
  const sessionFlowId = useSessionStore((state) => state.flowId);
  const { settings } = useSettings();

  const effectiveFlow = flow ?? sessionFlowId;

  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  const mutation = useMutation({
    mutationFn: async ({
      vectors,
      schemaName,
      collection,
      indexName,
      limit = 10,
    }: {
      vectors: number[];
      schemaName: string;
      collection?: string;
      indexName?: string;
      limit?: number;
    }): Promise<RowEmbeddingsMatch[]> => {
      if (!isSocketReady) {
        throw new Error("Socket connection not ready");
      }

      return socket.flow(effectiveFlow).rowEmbeddingsQuery(
        vectors,
        schemaName,
        collection ?? settings.collection,
        indexName,
        limit
      );
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      notify.error(`Row embeddings query failed: ${message}`);
    },
    onSuccess: () => {
    },
  });

  useActivity(mutation.isPending, "Querying row embeddings");

  return {
    executeQuery: mutation.mutate,
    executeQueryAsync: mutation.mutateAsync,
    isExecuting: mutation.isPending,
    error: mutation.error,
    matches: mutation.data ?? [],
    hasResults: (mutation.data?.length ?? 0) > 0,
    reset: mutation.reset,
    isReady: isSocketReady,
  };
};
