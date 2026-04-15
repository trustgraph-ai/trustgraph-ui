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

/**
 * Custom hook for managing NLP query operations
 * Provides functionality for converting natural language questions to GraphQL queries
 */
export const useNlpQuery = ({ flow }: { flow?: string } = {}): {
  convertQuery: (params: { question: string; maxResults?: number }) => void;
  convertQueryAsync: (params: { question: string; maxResults?: number }) => Promise<any>;
  isConverting: boolean;
  error: unknown;
  data: any;
  graphqlQuery: string | undefined;
  variables: Record<string, unknown> | undefined;
  detectedSchemas: Record<string, unknown>[] | undefined;
  confidence: number | undefined;
  reset: () => void;
  isReady: boolean;
} => {
  // Socket connection for API calls
  const socket = useSocket();
  const connectionState = useConnectionState();
  // Notification system for user feedback
  const notify = useNotification();
  // Session state for current flow ID
  const sessionFlowId = useSessionStore((state) => state.flowId);

  // Use explicit param if provided, otherwise fall back to session state
  const effectiveFlow = flow ?? sessionFlowId;

  // Only enable operations when socket is connected and ready
  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  // Mutation for converting natural language to GraphQL
  const nlpQueryMutation = useMutation({
    mutationFn: async ({
      question,
      maxResults,
    }: {
      question: string;
      maxResults?: number;
    }) => {
      if (!isSocketReady) {
        throw new Error("Socket connection not ready");
      }

      return socket.flow(effectiveFlow).nlpQuery(question, maxResults);
    },
    onError: (err: unknown) => {
      console.log("NLP query error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      notify.error(`NLP query conversion failed: ${errorMessage}`);
    },
    onSuccess: () => {
    },
  });

  // Show loading indicator for conversion operations
  useActivity(
    nlpQueryMutation.isPending,
    "Converting natural language to GraphQL"
  );

  // Return the public API for the hook
  return {
    // Query conversion
    convertQuery: nlpQueryMutation.mutate,
    convertQueryAsync: nlpQueryMutation.mutateAsync,

    // Query state
    isConverting: nlpQueryMutation.isPending,
    error: nlpQueryMutation.error,
    data: nlpQueryMutation.data,

    // Extracted data for easier access
    graphqlQuery: nlpQueryMutation.data?.graphql_query,
    variables: nlpQueryMutation.data?.variables,
    detectedSchemas: nlpQueryMutation.data?.detected_schemas,
    confidence: nlpQueryMutation.data?.confidence,

    // Reset function to clear previous results
    reset: nlpQueryMutation.reset,

    // Socket readiness
    isReady: isSocketReady,
  };
};
