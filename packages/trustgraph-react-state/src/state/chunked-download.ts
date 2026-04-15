import { useState, useCallback, useRef } from "react";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useNotification } from "../hooks/useNotification";

// Default chunk size for downloads: 1MB
const DEFAULT_CHUNK_SIZE = 1024 * 1024;

export type DownloadStatus =
  | "idle"
  | "downloading"
  | "completed"
  | "error"
  | "cancelled";

export interface DownloadProgress {
  /** Total number of chunks (known after first chunk arrives) */
  totalChunks: number;
  /** Number of chunks received */
  chunksReceived: number;
  /** Download percentage (0-100) */
  percentage: number;
  /** Current download status */
  status: DownloadStatus;
  /** Error message if status is 'error' */
  error?: string;
  /** Document ID being downloaded */
  documentId?: string;
}

export interface ChunkedDownloadOptions {
  /** Chunk size in bytes (default: 1MB) */
  chunkSize?: number;
  /** Progress callback for real-time updates */
  onProgress?: (progress: DownloadProgress) => void;
  /** Called when download completes with the Blob */
  onComplete?: (blob: Blob, documentId: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
}

export interface DownloadParams {
  /** Document ID to download */
  documentId: string;
  /** Optional MIME type for the resulting Blob (default: application/octet-stream) */
  mimeType?: string;
  /** Optional filename for browser download (if not provided, returns Blob only) */
  filename?: string;
}

/**
 * Decode base64 string to Uint8Array
 */
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Trigger browser download of a Blob
 */
const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Hook for managing streamed document downloads with progress tracking
 *
 * Features:
 * - Streams large documents via WebSocket streaming response
 * - Progress tracking (chunks received, percentage)
 * - Cancel support
 * - Returns Blob or triggers browser download
 *
 * @param options - Configuration options for the download
 * @returns Download state and control methods
 */
export const useChunkedDownload = (options: ChunkedDownloadOptions = {}) => {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    onComplete,
    onError,
  } = options;

  const socket = useSocket();
  const connectionState = useConnectionState();
  const notify = useNotification();

  // Download state
  const [progress, setProgress] = useState<DownloadProgress>({
    totalChunks: 0,
    chunksReceived: 0,
    percentage: 0,
    status: "idle",
  });

  // Refs for managing download lifecycle
  const cancelledRef = useRef(false);
  const chunksRef = useRef<Map<number, Uint8Array>>(new Map());

  // Update progress and notify callback
  const updateProgress = useCallback(
    (updates: Partial<DownloadProgress>) => {
      setProgress((prev) => {
        const next = { ...prev, ...updates };
        onProgress?.(next);
        return next;
      });
    },
    [onProgress]
  );

  /**
   * Download a document via streaming and return as Blob
   */
  const download = useCallback(
    (params: DownloadParams): Promise<Blob | null> => {
      const { documentId, mimeType = "application/octet-stream", filename } = params;

      // Validate connection
      if (
        connectionState?.status !== "authenticated" &&
        connectionState?.status !== "unauthenticated"
      ) {
        const error = "Not connected to server";
        updateProgress({ status: "error", error });
        onError?.(error);
        return Promise.resolve(null);
      }

      // Reset state
      cancelledRef.current = false;
      chunksRef.current = new Map();

      updateProgress({
        totalChunks: 0,
        chunksReceived: 0,
        percentage: 0,
        status: "downloading",
        error: undefined,
        documentId,
      });

      return new Promise<Blob | null>((resolve) => {
        const onChunk = (
          content: string,
          chunkIndex: number,
          totalChunks: number,
          complete: boolean
        ) => {
          // Check for cancellation
          if (cancelledRef.current) {
            return;
          }

          // Store chunk
          const chunkData = base64ToUint8Array(content);
          chunksRef.current.set(chunkIndex, chunkData);

          const chunksReceived = chunksRef.current.size;
          const percentage = totalChunks > 0
            ? Math.round((chunksReceived / totalChunks) * 100)
            : 0;

          updateProgress({
            totalChunks,
            chunksReceived,
            percentage,
          });

          // If complete, reassemble and return
          if (complete) {
            if (cancelledRef.current) {
              resolve(null);
              return;
            }

            // Reassemble chunks in order
            const orderedChunks: Uint8Array[] = [];
            for (let i = 0; i < totalChunks; i++) {
              const chunk = chunksRef.current.get(i);
              if (chunk) {
                orderedChunks.push(chunk);
              }
            }

            const blob = new Blob(orderedChunks as BlobPart[], { type: mimeType });

            updateProgress({
              status: "completed",
              percentage: 100,
              chunksReceived: totalChunks,
            });

            // Trigger browser download if filename provided
            if (filename) {
              triggerBrowserDownload(blob, filename);
            }

            notify.success("Download complete");
            onComplete?.(blob, documentId);

            resolve(blob);
          }
        };

        const onStreamError = (error: string) => {
          if (cancelledRef.current) {
            return;
          }

          updateProgress({ status: "error", error });
          notify.error(`Download failed: ${error}`);
          onError?.(error);
          resolve(null);
        };

        // Start streaming download
        socket.librarian().streamDocument(
          documentId,
          onChunk,
          onStreamError,
          chunkSize
        );
      });
    },
    [socket, connectionState, chunkSize, notify, updateProgress, onComplete, onError]
  );

  /**
   * Cancel the current download
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    chunksRef.current = new Map();

    updateProgress({
      status: "cancelled",
    });
  }, [updateProgress]);

  /**
   * Reset the download state to idle
   */
  const reset = useCallback(() => {
    cancelledRef.current = true;
    chunksRef.current = new Map();

    setProgress({
      totalChunks: 0,
      chunksReceived: 0,
      percentage: 0,
      status: "idle",
    });
  }, []);

  return {
    // Current progress state
    progress,

    // Control methods
    download,
    cancel,
    reset,

    // Convenience flags
    isIdle: progress.status === "idle",
    isDownloading: progress.status === "downloading",
    isCompleted: progress.status === "completed",
    isError: progress.status === "error",
  };
};
