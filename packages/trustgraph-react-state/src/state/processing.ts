import { useQuery } from "@tanstack/react-query";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useActivity } from "../hooks/useActivity";

/**
 * Custom hook for managing processing operations
 * Provides functionality for fetching, deleting, and creating processing
 * @returns {Object} Processing state and operations
 */
export const useProcessing = (): {
  processing: any;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} => {
  // WebSocket connection for communicating with the librarian service
  const socket = useSocket();
  const connectionState = useConnectionState();

  // Only enable queries when socket is connected and ready
  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  /**
   * Query for fetching all processing
   * Uses React Query for caching and background refetching
   */
  const processingQuery = useQuery({
    queryKey: ["processing"],
    enabled: isSocketReady,
    queryFn: async () => {
      const result = await socket.librarian().getProcessing();
      // React Query requires non-undefined return value
      return result || [];
    },
  });

  // Show loading indicators for long-running operations
  useActivity(processingQuery.isLoading, "Loading submissions");

  // Return procecssing state and operations for use in components
  return {
    // Processing data and query state
    processing: processingQuery.data,
    isLoading: processingQuery.isLoading,
    isError: processingQuery.isError,
    error: processingQuery.error,

    // Manual refetch function
    refetch: processingQuery.refetch,
  };
};
