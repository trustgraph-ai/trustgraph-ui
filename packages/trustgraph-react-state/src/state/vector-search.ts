import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useSocket } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";
import { vectorSearch } from "../utils/vector-search";
import { useProgressStateStore } from "./progress";
import { useSessionStore } from "./session";

/**
 * Custom hook for managing vector search operations
 * Provides functionality for searching entities using vector embeddings
 * @returns {Object} Vector search state and operations
 */

export const useVectorSearch = () => {
  // WebSocket connection for communicating with the configuration service
  const socket = useSocket();

  const addActivity = useProgressStateStore((state) => state.addActivity);

  const removeActivity = useProgressStateStore(
    (state) => state.removeActivity
  );

  // Hook for displaying user notifications
  const notify = useNotification();

  // Session state for default flow ID
  const sessionFlowId = useSessionStore((state) => state.flowId);

  // State to track current search parameters
  const [searchParams, setSearchParams] = useState(null);

  /**
   * Query for fetching vector search results
   * Uses React Query for caching and background refetching
   */
  const searchQuery = useQuery({
    queryKey: ["search", searchParams],
    enabled: !!searchParams?.term,
    queryFn: () => {
      const { flow, term, limit, collection } = searchParams;
      return vectorSearch(
        socket,
        flow ?? sessionFlowId,
        addActivity,
        removeActivity,
        term,
        collection,
        limit
      )
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
          throw err;
        });
    },
  });

  // Function to trigger a new search
  const startSearch = ({ flow, term, limit, collection }) => {
    if (!term) {
      setSearchParams(null);
      return;
    }
    setSearchParams({
      flow: flow ?? sessionFlowId,
      term,
      limit: limit || 10,
      collection,
    });
  };

  // Return vector search state and operations for use in components
  return {
    // Function to start a new search
    startSearch: startSearch,
    // Search results and state
    data: searchQuery.data,
    isLoading: searchQuery.isLoading || searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error,
    // Current search parameters
    searchParams: searchParams,
  };
};
