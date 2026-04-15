/**
 * Hook for fetching document metadata from the librarian service
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import type { DocumentMetadata } from "@trustgraph/client";

export interface UseDocumentMetadataOptions {
  /** Document ID to fetch */
  documentId?: string;
  /** Whether to enable the query (default: true if documentId is provided) */
  enabled?: boolean;
}

export interface UseDocumentMetadataResult {
  /** Document metadata if loaded */
  metadata: DocumentMetadata | null;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether there was an error */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** Refetch the metadata */
  refetch: () => void;
}

/**
 * Hook for fetching a single document's metadata
 */
export const useDocumentMetadata = (
  options: UseDocumentMetadataOptions = {}
): UseDocumentMetadataResult => {
  const { documentId, enabled } = options;

  const socket = useSocket();
  const connectionState = useConnectionState();

  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  const query = useQuery({
    queryKey: ["document-metadata", documentId],
    enabled: isSocketReady && !!documentId && (enabled !== false),
    queryFn: async () => {
      if (!documentId) return null;
      return socket.librarian().getDocumentMetadata(documentId);
    },
  });

  return {
    metadata: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook for fetching multiple documents' metadata
 */
export const useDocumentsMetadata = (documentIds: string[] = []) => {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const queryClient = useQueryClient();

  const isSocketReady =
    connectionState?.status === "authenticated" ||
    connectionState?.status === "unauthenticated";

  const query = useQuery({
    queryKey: ["documents-metadata", documentIds],
    enabled: isSocketReady && documentIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        documentIds.map(async (id) => {
          // Check cache first
          const cached = queryClient.getQueryData<DocumentMetadata | null>([
            "document-metadata",
            id,
          ]);
          if (cached !== undefined) {
            return { id, metadata: cached };
          }

          // Fetch and cache
          const metadata = await socket.librarian().getDocumentMetadata(id);
          queryClient.setQueryData(["document-metadata", id], metadata);
          return { id, metadata };
        })
      );

      return results.reduce(
        (acc, { id, metadata }) => {
          acc[id] = metadata;
          return acc;
        },
        {} as Record<string, DocumentMetadata | null>
      );
    },
  });

  return {
    metadataMap: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
