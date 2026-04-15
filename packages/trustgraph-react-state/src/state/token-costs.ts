// @ts-nocheck
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";

/**
 * Custom hook for managing token cost operations
 * Provides functionality for fetching, deleting, and updating token costs
 * for AI models
 * @returns {Object} Token cost state and operations
 */
export const useTokenCosts = () => {
  // WebSocket connection for communicating with the configuration service
  const socket = useSocket();
  const connectionState = useConnectionState();

  // React Query client for cache management and invalidation
  const queryClient = useQueryClient();

  // Hook for displaying user notifications
  const notify = useNotification();

  // Only enable queries when socket is connected and ready
  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  /**
   * Query for fetching all token costs
   * Uses React Query for caching and background refetching
   */
  const query = useQuery({
    queryKey: ["token-cost"],
    enabled: isSocketReady,
    queryFn: () => {
      return socket
        .config()
        .getTokenCosts()
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          return x;
        });
    },
  });

  /**
   * Mutation for deleting a specific model's token cost
   * Removes the token cost configuration for a given model
   */
  const deleteTokenCostMutation = useMutation({
    mutationFn: ({ model, onSuccess }) => {
      // Delete the token cost configuration for the specified model
      return socket
        .config()
        .deleteConfig([
          {
            type: "token-cost",
            key: model,
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          // Execute success callback if provided
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      // Show error notification to user
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["token-cost"] });
      // Show success notification
      notify.success("Successful deletion");
    },
  });

  /**
   * Mutation for updating token cost for a specific model
   * Converts per-million token prices to per-token prices and saves
   * configuration
   */
  const updateTokenCostMutation = useMutation({
    mutationFn: ({ model, input_price, output_price, onSuccess }) => {
      // Convert per-million token prices to per-token prices
      const tokenCosts = {
        input_price: input_price / 1000000,
        output_price: output_price / 1000000,
      };

      // Save the token cost configuration for the specified model
      return socket
        .config()
        .putConfig([
          {
            type: "token-cost",
            key: model,
            value: JSON.stringify(tokenCosts),
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          // Execute success callback if provided
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      // Show error notification to user
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Invalidate cache to refresh the token costs list
      queryClient.invalidateQueries({ queryKey: ["token-cost"] });
      notify.success("Token costs updated");
    },
  });

  // Show loading indicators for long-running operations
  useActivity(query.isLoading, "Loading token costs");
  useActivity(deleteTokenCostMutation.isPending, "Deleting token cost");
  useActivity(updateTokenCostMutation.isPending, "Updating token cost");

  // Return token cost state and operations for use in components
  return {
    // Token cost query state
    tokenCosts: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Token cost deletion operations
    deleteTokenCost: deleteTokenCostMutation.mutate,
    isDeleting: deleteTokenCostMutation.isPending,
    deleteError: deleteTokenCostMutation.error,

    // Token cost update operations
    updateTokenCost: updateTokenCostMutation.mutate,
    isSubmitting: updateTokenCostMutation.isPending,
    submitError: updateTokenCostMutation.error,

    // Manual refetch function
    refetch: query.refetch,
  };
};
