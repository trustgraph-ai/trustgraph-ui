// React Query hooks for data fetching and mutation management
import { useMutation } from "@tanstack/react-query";

// TrustGraph socket connection for API communication
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
// Notification system for user feedback
import { useNotification } from "../hooks/useNotification";
// Activity tracking for loading states
import { useActivity } from "../hooks/useActivity";
// Session state for flow ID
import { useSessionStore } from "./session";
// Settings for user and collection
import { useSettings } from "./settings";

/**
 * Custom hook for managing GraphQL rows queries
 * Provides functionality for executing GraphQL queries against structured row data
 */
export const useRowsQuery = ({ flow }: { flow?: string } = {}) => {
  // Socket connection for API calls
  const socket = useSocket();
  const connectionState = useConnectionState();
  // Notification system for user feedback
  const notify = useNotification();
  // Session state for current flow ID
  const sessionFlowId = useSessionStore((state) => state.flowId);

  // Use explicit param if provided, otherwise fall back to session state
  const effectiveFlow = flow ?? sessionFlowId;
  // Settings for default collection
  const { settings } = useSettings();

  // Only enable operations when socket is connected and ready
  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  // Mutation for executing GraphQL rows queries
  const rowsQueryMutation = useMutation({
    mutationFn: async ({
      query,
      collection,
      variables,
      operationName,
    }: {
      query: string;
      collection?: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    }) => {
      if (!isSocketReady) {
        throw new Error("Socket connection not ready");
      }

      return socket
        .flow(effectiveFlow)
        .rowsQuery(
          query,
          collection || settings.collection,
          variables,
          operationName
        );
    },
    onError: (err: unknown) => {
      console.log("Rows query error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      notify.error(`GraphQL query failed: ${errorMessage}`);
    },
    onSuccess: () => {
    },
  });

  // Show loading indicator for query operations
  useActivity(rowsQueryMutation.isPending, "Executing GraphQL query");

  // Return the public API for the hook
  return {
    // Query execution
    executeQuery: rowsQueryMutation.mutate,
    executeQueryAsync: rowsQueryMutation.mutateAsync,

    // Query state
    isExecuting: rowsQueryMutation.isPending,
    error: rowsQueryMutation.error,
    data: rowsQueryMutation.data,

    // Reset function to clear previous results
    reset: rowsQueryMutation.reset,

    // Socket readiness
    isReady: isSocketReady,
  };
};
