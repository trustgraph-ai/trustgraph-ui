import { useQuery } from "@tanstack/react-query";

import { useSocket } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { useSettings } from "./settings";
import { useSessionStore } from "./session";

/**
 * Custom hook for querying graph embeddings
 * Finds graph entities similar to the provided embedding vector
 */
export const useGraphEmbeddings = ({ flow, vec, limit = 10, collection }: {
  flow?: string;
  vec?: number[];
  limit?: number;
  collection?: string;
}): {
  graphEmbeddings: any;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  const socket = useSocket();
  const notify = useNotification();
  const { settings } = useSettings();
  const sessionFlowId = useSessionStore((state) => state.flowId);

  const effectiveFlow = flow ?? sessionFlowId;
  const effectiveCollection = collection ?? settings.collection;

  const query = useQuery({
    queryKey: ["graph-embeddings", { flow: effectiveFlow, vec, limit, collection: effectiveCollection }],
    enabled: !!vec && vec.length > 0 && !!effectiveFlow,
    queryFn: () => {
      return socket
        .flow(effectiveFlow)
        .graphEmbeddingsQuery(vec!, limit, effectiveCollection)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          notify.error(message);
          throw err;
        });
    },
  });

  useActivity(query.isLoading, "Loading graph embeddings");

  return {
    graphEmbeddings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
