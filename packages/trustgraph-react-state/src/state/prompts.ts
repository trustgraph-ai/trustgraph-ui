// @ts-nocheck
// React Query hooks for data fetching and mutation management
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

// TrustGraph socket connection for API communication
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
// Notification system for user feedback
import { useNotification } from "../hooks/useNotification";
// Activity tracking for loading states
import { useActivity } from "../hooks/useActivity";

/**
 * Custom hook for managing AI prompts (system prompt and prompt templates)
 * Provides CRUD operations for both the system prompt and user-defined prompt templates
 */
export const usePrompts = () => {
  // Socket connection for API calls
  const socket = useSocket();
  const connectionState = useConnectionState();
  // Query client for cache management
  const queryClient = useQueryClient();
  // Notification system for user feedback
  const notify = useNotification();

  // Only enable queries when socket is connected and ready
  const isSocketReady =
    connectionState?.status === "authenticated";

  // Query to fetch the system prompt configuration
  // System prompt defines the AI assistant's behavior and instructions
  const systemPromptQuery = useQuery({
    queryKey: ["system-prompt"],
    enabled: isSocketReady,
    queryFn: () => {
      return socket
        .config()
        .getConfig([{ type: "prompt", key: "system" }])
        .then((res) => {
          if (res["error"]) {
            console.log("Error:", res);
            throw res.error.message;
          }
          return JSON.parse(res.values[0].value);
        });
    },
  });

  // Query to fetch all prompt templates
  // Lists prompt config keys, filters for template.* prefix, then fetches each template's configuration
  const promptsQuery = useQuery({
    queryKey: ["prompts"],
    enabled: isSocketReady,
    queryFn: () => {
      return socket
        .config()
        .list("prompt")
        .then((res) => {
          const keys = res?.directory || [];
          const promptIds = keys
            .filter((k) => k.startsWith("template."))
            .map((k) => k.slice("template.".length));

          if (promptIds.length === 0) return [];

          return socket
            .config()
            .getConfig(
              promptIds.map((id) => ({
                type: "prompt",
                key: "template." + id,
              }))
            )
            .then((r) => {
              if (r["error"]) {
                console.log("Error:", r);
                throw r.error.message;
              }
              const config = r.values.map((c) => JSON.parse(c.value));
              return promptIds.map((id, ix) => [id, config[ix]]);
            });
        });
    },
  });

  // Mutation for updating the system prompt
  // System prompt controls the AI assistant's base behavior and instructions
  const updateSystemPromptMutation = useMutation({
    mutationFn: ({ prompt, onSuccess }) => {
      return socket
        .config()
        .putConfig([
          {
            type: "prompt",
            key: "system",
            value: JSON.stringify(prompt),
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          // Execute callback if provided
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Refresh the system prompt data after successful update
      queryClient.invalidateQueries({ queryKey: ["system-prompt"] });
      notify.success("System prompt updated");
    },
  });

  // Mutation for updating an existing prompt template
  const updatePromptMutation = useMutation({
    mutationFn: ({ id, prompt, onSuccess }) => {
      return socket
        .config()
        .putConfig([
          {
            type: "prompt",
            key: "template." + id,
            value: JSON.stringify(prompt),
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          // Execute callback if provided
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Refresh the prompts list after successful update
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      notify.success("Prompt updated");
    },
  });

  // Mutation for creating a new prompt template
  const createPromptMutation = useMutation({
    mutationFn: ({ id, prompt, onSuccess }) => {
      return socket
        .config()
        .putConfig([
          {
            type: "prompt",
            key: "template." + id,
            value: JSON.stringify(prompt),
          },
        ])
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Refresh the prompts list after successful creation
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      notify.success("Prompt created");
    },
  });

  // Mutation for deleting a prompt template
  const deletePromptMutation = useMutation({
    mutationFn: ({ id, onSuccess }) => {
      return socket
        .config()
        .deleteConfig({
          type: "prompt",
          key: "template." + id,
        })
        .then((x) => {
          if (x["error"]) {
            console.log("Error:", x);
            throw x.error.message;
          }
          if (onSuccess) onSuccess();
        });
    },
    onError: (err) => {
      console.log("Error:", err);
      notify.error(err.toString());
    },
    onSuccess: () => {
      // Refresh the prompts list after successful deletion
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      notify.success("Prompt deleted");
    },
  });

  // Track loading states for UI feedback
  useActivity(systemPromptQuery.isLoading, "Loading system prompt");
  useActivity(promptsQuery.isLoading, "Loading prompts");
  useActivity(updateSystemPromptMutation.isPending, "Updating system prompt");
  useActivity(updatePromptMutation.isPending, "Updating prompt");
  useActivity(createPromptMutation.isPending, "Creating prompt");
  useActivity(deletePromptMutation.isPending, "Deleting prompt");

  // Return the public API for the hook
  return {
    // System prompt data and state
    systemPrompt: systemPromptQuery.data, // The current system prompt configuration
    systemPromptLoading: systemPromptQuery.isLoading,
    systemPromptError: systemPromptQuery.error,

    // Prompt templates data and state
    prompts: promptsQuery.data || [], // Array of [id, promptConfig] pairs
    promptsLoading: promptsQuery.isLoading,
    promptsError: promptsQuery.error,

    // System prompt operations
    updateSystemPrompt: updateSystemPromptMutation.mutate,
    isUpdatingSystemPrompt: updateSystemPromptMutation.isPending,

    // Prompt template operations
    updatePrompt: updatePromptMutation.mutate,
    isUpdatingPrompt: updatePromptMutation.isPending,

    createPrompt: createPromptMutation.mutate,
    isCreatingPrompt: createPromptMutation.isPending,

    deletePrompt: deletePromptMutation.mutate,
    isDeletingPrompt: deletePromptMutation.isPending,

    // Manual refetch function for both queries
    refetch: () => {
      systemPromptQuery.refetch();
      promptsQuery.refetch();
    },
  };
};
