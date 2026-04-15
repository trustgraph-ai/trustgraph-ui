// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { useActivity } from "../hooks/useActivity";

/**
 * Flow blueprint definition interface
 */
export interface FlowBlueprintDefinition {
  id?: string;
  class: {
    [key: string]: {
      [queueName: string]: string;
    };
  };
  flow: {
    [key: string]: {
      [queueName: string]: string;
    };
  };
  interfaces: {
    [key: string]:
      | string
      | {
          request: string;
          response: string;
        };
  };
  description?: string;
  tags?: string[];
}

/**
 * Custom hook for managing flow blueprint operations
 * Provides functionality for fetching, creating, updating, and deleting flow blueprintes
 * @returns {Object} Flow blueprint state and operations
 */
export const useFlowBlueprints = () => {
  // WebSocket connection for communicating with the config service
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
   * Query for fetching all flow blueprintes
   * Uses React Query for caching and background refetching
   */
  const query = useQuery({
    queryKey: ["flow-blueprints"],
    enabled: isSocketReady,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache (React Query v5 uses gcTime instead of cacheTime)
    refetchOnMount: "always",
    queryFn: async (): Promise<FlowBlueprintDefinition[]> => {
      try {
        const response = await socket.config().getConfigAll();

        // Handle both array and object responses
        const config = response.config["flow-blueprint"];

        if (Array.isArray(config)) {
          // If it's already an array, check if it's an array of [key, value] pairs
          if (
            config.length > 0 &&
            Array.isArray(config[0]) &&
            config[0].length === 2
          ) {
            // It's an array of [id, flowBlueprint] pairs - convert to objects
            const converted = config.map(([id, flowBlueprintData]) => {
              let flowBlueprint = flowBlueprintData;
              // If the flowBlueprint is a JSON string, parse it
              if (typeof flowBlueprintData === "string") {
                try {
                  flowBlueprint = JSON.parse(flowBlueprintData);
                } catch (error) {
                  console.error(
                    `Failed to parse flow blueprint JSON for ${id}:`,
                    error
                  );
                  flowBlueprint = flowBlueprintData;
                }
              }
              return {
                id,
                ...(flowBlueprint as Omit<FlowBlueprintDefinition, "id">),
              };
            });
            return converted;
          } else {
            // It's already an array of flow blueprint objects
            return config;
          }
        } else if (config && typeof config === "object") {
          // Convert object to array of flow blueprintes
          const converted = Object.entries(config).map(
            ([id, flowBlueprintData]) => {
              let flowBlueprint = flowBlueprintData;
              // If the flowBlueprint is a JSON string, parse it
              if (typeof flowBlueprintData === "string") {
                try {
                  flowBlueprint = JSON.parse(flowBlueprintData);
                } catch (error) {
                  console.error(
                    `Failed to parse flow blueprint JSON for ${id}:`,
                    error
                  );
                  flowBlueprint = flowBlueprintData;
                }
              }
              return {
                id,
                ...(flowBlueprint as Omit<FlowBlueprintDefinition, "id">),
              };
            }
          );
          return converted;
        }

        return [];
      } catch (error) {
        console.error("Failed to fetch flow blueprintes:", error);
        throw new Error("Failed to fetch flow blueprintes");
      }
    },
  });

  // Track loading state
  useActivity(query.isLoading, "Loading flow blueprintes");

  /**
   * Mutation for creating a new flow blueprint
   */
  const createMutation = useMutation({
    mutationFn: async ({
      id,
      flowBlueprint,
    }: {
      id: string;
      flowBlueprint: Omit<FlowBlueprintDefinition, "id">;
    }): Promise<FlowBlueprintDefinition> => {
      try {
        await socket.config().putConfig([
          {
            type: "flow-blueprints",
            key: id,
            value: JSON.stringify(flowBlueprint),
          },
        ]);

        return {
          id,
          ...flowBlueprint,
        };
      } catch (error) {
        console.error(`Failed to create flow blueprint ${id}:`, error);
        throw new Error(`Failed to create flow blueprint: ${id}`);
      }
    },
    onSuccess: (flowBlueprint) => {
      // Invalidate and refetch flow blueprintes
      queryClient.invalidateQueries({ queryKey: ["flow-blueprints"] });

      notify.success(`Flow blueprint "${flowBlueprint.id}" created successfully`);
    },
    onError: (error: Error) => {
      notify.error(`Failed to create flow blueprint: ${error.message}`);
    },
  });

  /**
   * Mutation for updating an existing flow blueprint
   */
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      flowBlueprint,
    }: {
      id: string;
      flowBlueprint: Partial<Omit<FlowBlueprintDefinition, "id">>;
    }): Promise<FlowBlueprintDefinition> => {
      try {
        // Get current flow blueprint to merge changes
        const currentResponse = await socket.config().getConfig([
          {
            type: "flow-blueprints",
            key: id,
          },
        ]);

        const updatedFlowBlueprint = {
          ...currentResponse.config["flow-blueprints"][id],
          ...flowBlueprint,
        };

        await socket.config().putConfig([
          {
            type: "flow-blueprints",
            key: id,
            value: JSON.stringify(updatedFlowBlueprint),
          },
        ]);

        return {
          id,
          ...updatedFlowBlueprint,
        };
      } catch (error) {
        console.error(`Failed to update flow blueprint ${id}:`, error);
        throw new Error(`Failed to update flow blueprint: ${id}`);
      }
    },
    onSuccess: (flowBlueprint) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: ["flow-blueprints"] });

      notify.success(`Flow blueprint "${flowBlueprint.id}" updated successfully`);
    },
    onError: (error: Error) => {
      notify.error(`Failed to update flow blueprint: ${error.message}`);
    },
  });

  /**
   * Mutation for deleting a flow blueprint
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      try {
        await socket.flows().deleteFlowBlueprint(id);
      } catch (error) {
        console.error(`Failed to delete flow blueprint ${id}:`, error);
        // Re-throw the original error to preserve the API error message
        throw error;
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.invalidateQueries({ queryKey: ["flow-blueprints"] });

      notify.success(`Flow blueprint "${id}" deleted successfully`);
    },
    onError: (error: Error) => {
      // Show the actual API error message without additional prefixes
      notify.error(
        error.message || "Unknown error occurred while deleting flow blueprint"
      );
    },
  });

  /**
   * Mutation for duplicating a flow blueprint
   */
  const duplicateMutation = useMutation({
    mutationFn: async ({
      sourceId,
      targetId,
    }: {
      sourceId: string;
      targetId: string;
    }): Promise<FlowBlueprintDefinition> => {
      try {
        // Get source flow blueprint
        const sourceResponse = await socket.config().getConfig([
          {
            type: "flow-blueprints",
            key: sourceId,
          },
        ]);

        const sourceFlowBlueprint = sourceResponse.config["flow-blueprints"][
          sourceId
        ] as Omit<FlowBlueprintDefinition, "id">;

        // Create duplicate with updated description
        const duplicatedFlowBlueprint = {
          ...sourceFlowBlueprint,
          description: `${sourceFlowBlueprint.description || sourceId} (Copy)`,
          tags: [...(sourceFlowBlueprint.tags || []), "copy"],
        };

        // Save as new flow blueprint
        await socket.config().putConfig([
          {
            type: "flow-blueprints",
            key: targetId,
            value: JSON.stringify(duplicatedFlowBlueprint),
          },
        ]);

        return {
          id: targetId,
          ...duplicatedFlowBlueprint,
        };
      } catch (error) {
        console.error(`Failed to duplicate flow blueprint ${sourceId}:`, error);
        throw new Error(`Failed to duplicate flow blueprint: ${sourceId}`);
      }
    },
    onSuccess: (flowBlueprint) => {
      queryClient.invalidateQueries({ queryKey: ["flow-blueprints"] });

      notify.success(`Flow blueprint duplicated as "${flowBlueprint.id}"`);
    },
    onError: (error: Error) => {
      notify.error(`Failed to duplicate flow blueprint: ${error.message}`);
    },
  });

  // Track mutation loading states
  useActivity(createMutation.isPending, "Creating flow blueprint");
  useActivity(updateMutation.isPending, "Updating flow blueprint");
  useActivity(deleteMutation.isPending, "Deleting flow blueprint");
  useActivity(duplicateMutation.isPending, "Duplicating flow blueprint");

  return {
    // Query state
    flowBlueprints: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Utilities
    getFlowBlueprint: (id: string): FlowBlueprintDefinition | undefined => {
      const found = query.data?.find((fc) => {
        return fc.id === id;
      });
      return found;
    },
    exists: (id: string): boolean => {
      return query.data?.some((fc) => fc.id === id) ?? false;
    },

    // Mutations
    createFlowBlueprint: createMutation.mutateAsync,
    updateFlowBlueprint: updateMutation.mutateAsync,
    deleteFlowBlueprint: deleteMutation.mutateAsync,
    duplicateFlowBlueprint: duplicateMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
};

/**
 * Generate a unique flow blueprint ID
 */
export const generateFlowBlueprintId = (baseName = "flow-class"): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseName}-${timestamp}-${random}`;
};

/**
 * Validate flow blueprint ID format
 */
export const isValidFlowBlueprintId = (id: string): boolean => {
  // Flow blueprint IDs should be kebab-case, alphanumeric with hyphens
  return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
};
