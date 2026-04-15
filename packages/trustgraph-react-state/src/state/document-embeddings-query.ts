// @ts-nocheck
import { useMutation } from "@tanstack/react-query";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { useSessionStore } from "./session";
import { useSettings } from "./settings";

/**
 * Custom hook for querying document chunks using vectors.
 * Searches for document chunks with similar embeddings.
 */
export const useDocumentEmbeddingsQuery = ({ flow }: { flow?: string } = {}) => {
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
      user,
      collection,
      limit = 10,
    }: {
      vectors: number[][];
      user?: string;
      collection?: string;
      limit?: number;
    }) => {
      if (!isSocketReady) {
        throw new Error("Socket connection not ready");
      }

      return socket.flow(effectiveFlow).documentEmbeddingsQuery(
        vectors,
        user ?? settings.user,
        collection ?? settings.collection,
        limit
      );
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      notify.error(`Document embeddings query failed: ${message}`);
    },
    onSuccess: () => {
    },
  });

  useActivity(mutation.isPending, "Searching document chunks");

  return {
    executeQuery: mutation.mutate,
    executeQueryAsync: mutation.mutateAsync,
    isExecuting: mutation.isPending,
    error: mutation.error,
    results: mutation.data ?? [],
    hasResults: Array.isArray(mutation.data) && mutation.data.length > 0,
    reset: mutation.reset,
    isReady: isSocketReady,
  };
};
