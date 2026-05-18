import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSocket } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";
import {
  createSubgraph,
  updateSubgraph,
  updateSubgraphByRelationship,
  Subgraph,
} from "../utils/knowledge-graph-viz";
import { useProgressStateStore } from "./progress";
import { useSessionStore } from "./session";

/**
 * Custom hook for managing graph visualization operations using React Query
 * Provides functionality for fetching and updating graph subgraphs
 * @param entityUri - The URI of the entity to build the graph around
 * @param flow - Optional flow ID to use for the query (defaults to session state)
 * @param collection - The collection to query
 * @returns {Object} Graph state and operations
 */
export const useGraphSubgraph = ({
  entityUri,
  flow,
  collection,
}: {
  entityUri: string | undefined;
  flow?: string;
  collection: string;
}) => {
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

  // Query client for cache management
  const queryClient = useQueryClient();

  /**
   * Query for fetching initial graph subgraph
   * Uses React Query for caching and background refetching
   */
  const query = useQuery({
    queryKey: ["graph-subgraph", { entityUri, flow: effectiveFlow, collection }],
    queryFn: async () => {
      if (!entityUri) {
        throw new Error("Entity URI is required");
      }

      const sg = createSubgraph();

      // Use the existing updateSubgraph utility function for initial load
      const api = socket.flow(effectiveFlow);
      return updateSubgraph(
        api,
        entityUri,
        sg,
        addActivity,
        removeActivity,
        collection
      );
    },
    enabled: !!entityUri && !!effectiveFlow, // Only run query if both entityUri and effectiveFlow are available
  });

  /**
   * Mutation for updating the graph subgraph when nodes are clicked
   */
  const updateMutation = useMutation({
    mutationFn: async ({
      nodeId,
      currentGraph,
    }: {
      nodeId: string;
      currentGraph: Subgraph;
    }) => {
      const api = socket.flow(effectiveFlow);
      return updateSubgraph(
        api,
        nodeId,
        currentGraph,
        addActivity,
        removeActivity
      );
    },
    onSuccess: (newGraph) => {
      // Update the cache with the new graph data
      queryClient.setQueryData(
        ["graph-subgraph", { entityUri, flow: effectiveFlow, collection }],
        newGraph
      );
    },
    onError: (err) => {
      console.log("Graph update error:", err);
      notify.error(err.toString());
    },
  });

  /**
   * Mutation for expanding the graph by following specific relationships
   */
  const relationshipNavigationMutation = useMutation({
    mutationFn: async ({
      selectedNodeId,
      relationshipUri,
      direction,
      currentGraph,
    }: {
      selectedNodeId: string;
      relationshipUri: string;
      direction: "incoming" | "outgoing";
      currentGraph: Subgraph;
    }) => {
      const api = socket.flow(effectiveFlow);
      return updateSubgraphByRelationship(
        api,
        selectedNodeId,
        relationshipUri,
        direction,
        currentGraph,
        addActivity,
        removeActivity,
        collection
      );
    },
    onSuccess: (newGraph) => {
      // Update the cache with the new graph data
      queryClient.setQueryData(
        ["graph-subgraph", { entityUri, flow: effectiveFlow, collection }],
        newGraph
      );
    },
    onError: (err) => {
      console.log("Relationship navigation error:", err);
      notify.error(err.toString());
    },
  });

  // Show loading indicators for long-running operations
  useActivity(
    query.isLoading,
    entityUri ? `Build subgraph: ${entityUri}` : "Loading graph"
  );
  useActivity(updateMutation.isPending, "Update subgraph");
  useActivity(
    relationshipNavigationMutation.isPending,
    "Following relationship"
  );

  // Handle query errors
  if (query.isError && query.error) {
    notify.error(query.error.toString());
  }

  // Return graph state and operations for use in components
  return {
    // Graph query state
    view: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Graph update operations
    updateSubgraph: updateMutation.mutate,
    isUpdating: updateMutation.isPending,

    // Relationship navigation operations
    navigateByRelationship: relationshipNavigationMutation.mutate,
    isNavigating: relationshipNavigationMutation.isPending,

    // Manual refetch function
    refetch: query.refetch,
  };
};
