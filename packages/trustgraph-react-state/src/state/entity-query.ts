import { useQuery } from "@tanstack/react-query";

import { useSocket } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { getTriples } from "../utils/knowledge-graph";
import { useProgressStateStore } from "./progress";
import { useSessionStore } from "./session";

/**
 * Custom hook for managing entity detail operations using React Query
 * Provides functionality for fetching entity details and related triples
 * @param entityUri - The URI of the entity to fetch details for
 * @param flow - Optional flow ID to use for the query (defaults to session state)
 * @param collection - The collection to query
 * @returns {Object} Entity detail state and operations
 */
export const useEntityDetail = ({
  entityUri,
  flow,
  collection,
}: {
  entityUri: string | undefined;
  flow?: string;
  collection: string;
}): {
  detail: Awaited<ReturnType<typeof getTriples>> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  // WebSocket connection for communicating with the graph service
  const socket = useSocket();

  // Session state for default flow ID
  const sessionFlowId = useSessionStore((state) => state.flowId);

  // Use explicit param if provided, otherwise fall back to session state
  const effectiveFlow = flow ?? sessionFlowId;

  const addActivity = useProgressStateStore((state) => state.addActivity);

  const removeActivity = useProgressStateStore(
    (state) => state.removeActivity
  );

  // Hook for displaying user notifications
  const notify = useNotification();

  /**
   * Query for fetching entity details
   * Uses React Query for caching and background refetching
   */
  const query = useQuery({
    queryKey: ["entity-detail", { entityUri, flow: effectiveFlow, collection }],
    queryFn: async () => {
      if (!entityUri) {
        throw new Error("Entity URI is required");
      }

      // Use the existing getTriples utility function
      const api = socket.flow(effectiveFlow);
      return getTriples(
        api,
        entityUri,
        addActivity,
        removeActivity,
        undefined,
        collection
      );
    },
    // Only run query if both entityUri and effectiveFlow are available
    enabled: !!entityUri && !!effectiveFlow,
  });

  // Show loading indicators for long-running operations
  useActivity(
    query.isLoading,
    entityUri ? `Knowledge graph search: ${entityUri}` : "Loading entity"
  );

  // Handle errors
  if (query.isError && query.error) {
    notify.error(query.error.toString());
  }

  // Return entity detail state and operations for use in components
  return {
    // Entity detail query state
    detail: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Manual refetch function
    refetch: query.refetch,
  };
};
