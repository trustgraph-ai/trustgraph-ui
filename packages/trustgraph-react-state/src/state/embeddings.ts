// @ts-nocheck
import { useQuery } from "@tanstack/react-query";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import { useSessionStore } from "./session";

/**
 * Custom hook for managing token cost operations
 * Provides functionality for fetching, deleting, and updating token costs
 * for AI models
 * @returns {Object} Token cost state and operations
 */
export const useEmbeddings = ({ flow, term }) => {
  // WebSocket connection for communicating with the configuration service
  const socket = useSocket();
  const connectionState = useConnectionState();

  // Only enable queries when socket is connected and ready
  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  // Hook for displaying user notifications
  const notify = useNotification();

  // Session state for default flow ID
  const sessionFlowId = useSessionStore((state) => state.flowId);

  // Use explicit param if provided, otherwise fall back to session state
  const effectiveFlow = flow ?? sessionFlowId;

  /**
   * Query for fetching all token costs
   * Uses React Query for caching and background refetching
   */
  const query = useQuery({
    queryKey: ["embeddings", { flow: effectiveFlow, term }],
    enabled: isSocketReady && !!term && !!effectiveFlow,
    queryFn: () => {
      return socket
        .flow(effectiveFlow)
        .embeddings([term])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          return x;
        })
        .catch((err) => {
          console.log("Error:", err);
          notify.error(err);
        });
    },
  });

  // Show loading indicators for long-running operations
  useActivity(query.isLoading, "Compute embeddings");

  // Return token cost state and operations for use in components
  return {
    // Token cost query state
    embeddings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Manual refetch function
    refetch: query.refetch,
  };
};
