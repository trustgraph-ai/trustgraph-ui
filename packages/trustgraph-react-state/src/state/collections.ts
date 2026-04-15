import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";

/**
 * Collection metadata structure
 */
export interface CollectionMetadata {
  user: string;
  collection: string;
  name: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface UpdateCollectionParams {
  collection: string;
  name: string;
  description: string;
  tags: string[];
  onSuccess?: () => void;
}

interface DeleteCollectionsParams {
  collections: string[];
  onSuccess?: () => void;
}

/**
 * Custom hook for managing collection operations
 * Provides functionality for fetching, creating, updating, and deleting collections
 */
export const useCollections = () => {
  // WebSocket connection for communicating with the collection management service
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
   * Query for fetching all collections from the collection management service
   * Uses React Query for caching and background refetching
   */
  const collectionsQuery = useQuery({
    queryKey: ["collections"],
    enabled: isSocketReady,
    queryFn: () => {
      return socket.collectionManagement().listCollections();
    },
  });

  /**
   * Mutation for creating or updating a collection
   * Executes update request and handles success/error states
   */
  const updateCollectionMutation = useMutation({
    mutationFn: ({ collection, name, description, tags, onSuccess }: UpdateCollectionParams) => {
      return socket
        .collectionManagement()
        .updateCollection(collection, name, description, tags)
        .then(() => {
          // Execute success callback if provided
          if (onSuccess) onSuccess();
        });
    },
    onError: (err: Error) => {
      console.log("Error:", err);
      // Show error notification to user
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Invalidate collections cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      // Show success notification
      notify.success("Collection saved successfully");
    },
  });

  /**
   * Mutation for deleting multiple collections
   * Executes parallel deletion requests and handles success/error states
   */
  const deleteCollectionsMutation = useMutation({
    mutationFn: ({ collections, onSuccess }: DeleteCollectionsParams) => {
      // Execute deletion requests in parallel for all collection IDs
      return Promise.all(
        collections.map((collection) =>
          socket.collectionManagement().deleteCollection(collection)
        )
      ).then(() => {
        // Execute success callback if provided
        if (onSuccess) onSuccess();
      });
    },
    onError: (err: Error) => {
      console.log("Error:", err);
      // Show error notification to user
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Invalidate collections cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      // Show success notification
      notify.success("Collections deleted successfully");
    },
  });

  // Show loading indicators for long-running operations
  useActivity(collectionsQuery.isLoading, "Loading collections");
  useActivity(updateCollectionMutation.isPending, "Saving collection");
  useActivity(deleteCollectionsMutation.isPending, "Deleting collections");

  // Return collections state and operations for use in components
  return {
    // Collection data and query state
    collections: collectionsQuery.data || [],
    isLoading: collectionsQuery.isLoading,
    isError: collectionsQuery.isError,
    error: collectionsQuery.error,

    // Update/create collection operations
    updateCollection: updateCollectionMutation.mutate,
    isUpdating: updateCollectionMutation.isPending,
    updateError: updateCollectionMutation.error,

    // Delete collection operations
    deleteCollections: deleteCollectionsMutation.mutate,
    isDeleting: deleteCollectionsMutation.isPending,
    deleteError: deleteCollectionsMutation.error,

    // Manual refetch function
    refetch: collectionsQuery.refetch,
  };
};
