import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import type { ChunkedUploadDocumentMetadata } from "@trustgraph/client";
import { useNotification } from "../hooks/useNotification";
import { createDocId } from "../model/document-metadata";

// Default chunk size: 5MB (matches backend default)
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

// Maximum parallel chunk uploads
const DEFAULT_PARALLEL_UPLOADS = 3;

export type UploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "paused"
  | "completing"
  | "completed"
  | "error"
  | "cancelled";

export interface UploadProgress {
  /** Total bytes to upload */
  totalBytes: number;
  /** Bytes uploaded so far */
  bytesUploaded: number;
  /** Upload percentage (0-100) */
  percentage: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Number of chunks uploaded */
  chunksUploaded: number;
  /** Indices of chunks still pending */
  pendingChunks: number[];
  /** Current upload status */
  status: UploadStatus;
  /** Error message if status is 'error' */
  error?: string;
  /** Upload ID from server (for resume) */
  uploadId?: string;
  /** Document ID after completion */
  documentId?: string;
}

export interface ChunkedUploadOptions {
  /** Chunk size in bytes (default: 5MB) */
  chunkSize?: number;
  /** Number of parallel chunk uploads (default: 3) */
  parallelUploads?: number;
  /** Progress callback for real-time updates */
  onProgress?: (progress: UploadProgress) => void;
  /** Called when upload completes successfully */
  onComplete?: (documentId: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
}

export interface ChunkedUploadParams {
  /** File to upload */
  file: File;
  /** Document title */
  title: string;
  /** Optional comments/description */
  comments?: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional collection name */
  collection?: string;
  /** Optional document ID (auto-generated if not provided) */
  documentId?: string;
}

export interface ResumeUploadParams {
  /** Upload ID from a previous session */
  uploadId: string;
  /** File to resume uploading (must match original) */
  file: File;
}

/**
 * Hook for managing chunked document uploads with progress tracking
 *
 * Features:
 * - Automatic chunking of large files
 * - Parallel chunk uploads for performance
 * - Progress tracking (bytes, percentage, chunks)
 * - Pause/resume support
 * - Cancel support
 * - Resumability after interruption
 *
 * @param options - Configuration options for the upload
 * @returns Upload state and control methods
 */
export const useChunkedUpload = (options: ChunkedUploadOptions = {}) => {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    parallelUploads = DEFAULT_PARALLEL_UPLOADS,
    onProgress,
    onComplete,
    onError,
  } = options;

  const socket = useSocket();
  const connectionState = useConnectionState();
  const queryClient = useQueryClient();
  const notify = useNotification();

  // Upload state
  const [progress, setProgress] = useState<UploadProgress>({
    totalBytes: 0,
    bytesUploaded: 0,
    percentage: 0,
    totalChunks: 0,
    chunksUploaded: 0,
    pendingChunks: [],
    status: "idle",
  });

  // Refs for managing upload lifecycle
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  const currentFileRef = useRef<File | null>(null);
  const uploadIdRef = useRef<string | null>(null);

  // Update progress and notify callback
  const updateProgress = useCallback(
    (updates: Partial<UploadProgress>) => {
      setProgress((prev) => {
        const next = { ...prev, ...updates };
        onProgress?.(next);
        return next;
      });
    },
    [onProgress]
  );

  // Read a chunk from the file as base64
  const readChunkAsBase64 = useCallback(
    async (file: File, chunkIndex: number, chunkSz: number): Promise<string> => {
      const start = chunkIndex * chunkSz;
      const end = Math.min(start + chunkSz, file.size);
      const blob = file.slice(start, end);

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Extract base64 from data URL
          const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Failed to read file chunk"));
        reader.readAsDataURL(blob);
      });
    },
    []
  );

  // Upload chunks in parallel with concurrency limit
  const uploadChunks = useCallback(
    async (
      file: File,
      uploadId: string,
      pendingChunks: number[],
      chunkSz: number,
      totalChunks: number
    ): Promise<void> => {
      const remaining = [...pendingChunks];
      let completedCount = totalChunks - remaining.length;
      let bytesUploaded = completedCount * chunkSz;

      // Process chunks with limited parallelism
      const uploadNextBatch = async (): Promise<void> => {
        while (remaining.length > 0 && !abortControllerRef.current?.signal.aborted) {
          // Wait if paused
          if (isPausedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
          }

          // Take up to parallelUploads chunks
          const batch = remaining.splice(0, parallelUploads);

          // Upload batch in parallel
          const results = await Promise.allSettled(
            batch.map(async (chunkIndex) => {
              const content = await readChunkAsBase64(file, chunkIndex, chunkSz);
              await socket.librarian().uploadChunk(uploadId, chunkIndex, content);
              return chunkIndex;
            })
          );

          // Process results
          for (const result of results) {
            if (result.status === "fulfilled") {
              completedCount++;
              // Calculate actual bytes for this chunk
              const chunkIdx = result.value;
              const chunkStart = chunkIdx * chunkSz;
              const chunkEnd = Math.min(chunkStart + chunkSz, file.size);
              bytesUploaded += chunkEnd - chunkStart;

              updateProgress({
                chunksUploaded: completedCount,
                bytesUploaded,
                percentage: Math.round((bytesUploaded / file.size) * 100),
                pendingChunks: [...remaining],
              });
            } else {
              // Re-add failed chunk to retry
              const failedIndex = batch[results.indexOf(result)];
              remaining.push(failedIndex);
              console.warn(`Chunk ${failedIndex} failed, will retry:`, result.reason);
            }
          }
        }
      };

      await uploadNextBatch();
    },
    [socket, parallelUploads, readChunkAsBase64, updateProgress]
  );

  /**
   * Start a new chunked upload
   */
  const upload = useCallback(
    async (params: ChunkedUploadParams): Promise<string | null> => {
      const { file, title, comments = "", tags = [], collection, documentId } = params;

      // Validate connection
      if (
        connectionState?.status !== "authenticated" &&
        connectionState?.status !== "unauthenticated"
      ) {
        const error = "Not connected to server";
        updateProgress({ status: "error", error });
        onError?.(error);
        return null;
      }

      // Reset state
      abortControllerRef.current = new AbortController();
      isPausedRef.current = false;
      currentFileRef.current = file;

      const docId = documentId || createDocId();
      const totalChunks = Math.ceil(file.size / chunkSize);
      const pendingChunks = Array.from({ length: totalChunks }, (_, i) => i);

      updateProgress({
        totalBytes: file.size,
        bytesUploaded: 0,
        percentage: 0,
        totalChunks,
        chunksUploaded: 0,
        pendingChunks,
        status: "preparing",
        error: undefined,
        uploadId: undefined,
        documentId: undefined,
      });

      try {
        // Initialize upload session
        const metadata: ChunkedUploadDocumentMetadata = {
          id: docId,
          time: Math.floor(Date.now() / 1000),
          kind: file.type || "application/octet-stream",
          title,
          comments,
          user: "trustgraph", // Will be set by server based on auth
          collection: collection || "default",
          tags,
        };

        const beginResponse = await socket
          .librarian()
          .beginUpload(metadata, file.size, chunkSize);

        const uploadId = beginResponse["upload-id"];
        uploadIdRef.current = uploadId;

        updateProgress({
          status: "uploading",
          uploadId,
        });

        // Upload all chunks
        await uploadChunks(file, uploadId, pendingChunks, chunkSize, totalChunks);

        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        // Complete the upload
        updateProgress({ status: "completing" });
        const completeResponse = await socket.librarian().completeUpload(uploadId);

        const finalDocId = completeResponse["document-id"];

        updateProgress({
          status: "completed",
          documentId: finalDocId,
          percentage: 100,
        });

        // Invalidate documents cache
        queryClient.invalidateQueries({ queryKey: ["documents"] });

        notify.success(`Upload complete: ${title}`);
        onComplete?.(finalDocId);

        return finalDocId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        updateProgress({ status: "error", error: errorMsg });
        notify.error(`Upload failed: ${errorMsg}`);
        onError?.(errorMsg);
        return null;
      }
    },
    [
      socket,
      connectionState,
      chunkSize,
      queryClient,
      notify,
      updateProgress,
      uploadChunks,
      onComplete,
      onError,
    ]
  );

  /**
   * Resume an interrupted upload
   */
  const resume = useCallback(
    async (params: ResumeUploadParams): Promise<string | null> => {
      const { uploadId, file } = params;

      // Validate connection
      if (
        connectionState?.status !== "authenticated" &&
        connectionState?.status !== "unauthenticated"
      ) {
        const error = "Not connected to server";
        updateProgress({ status: "error", error });
        onError?.(error);
        return null;
      }

      abortControllerRef.current = new AbortController();
      isPausedRef.current = false;
      currentFileRef.current = file;
      uploadIdRef.current = uploadId;

      updateProgress({
        status: "preparing",
        uploadId,
      });

      try {
        // Get current upload status
        const status = await socket.librarian().getUploadStatus(uploadId);

        if (status["upload-state"] === "completed") {
          updateProgress({ status: "completed" });
          return null;
        }

        if (status["upload-state"] === "expired") {
          throw new Error("Upload session has expired");
        }

        const totalChunks = status["total-chunks"];
        const missingChunks = status["missing-chunks"];
        const bytesReceived = status["bytes-received"];
        const totalBytes = status["total-bytes"];

        updateProgress({
          totalBytes,
          bytesUploaded: bytesReceived,
          percentage: Math.round((bytesReceived / totalBytes) * 100),
          totalChunks,
          chunksUploaded: totalChunks - missingChunks.length,
          pendingChunks: missingChunks,
          status: "uploading",
        });

        // Upload missing chunks
        const effectiveChunkSize = status["chunk-size"] || chunkSize;
        await uploadChunks(file, uploadId, missingChunks, effectiveChunkSize, totalChunks);

        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        // Complete the upload
        updateProgress({ status: "completing" });
        const completeResponse = await socket.librarian().completeUpload(uploadId);

        const finalDocId = completeResponse["document-id"];

        updateProgress({
          status: "completed",
          documentId: finalDocId,
          percentage: 100,
        });

        // Invalidate documents cache
        queryClient.invalidateQueries({ queryKey: ["documents"] });

        notify.success("Upload resumed and completed");
        onComplete?.(finalDocId);

        return finalDocId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        updateProgress({ status: "error", error: errorMsg });
        notify.error(`Resume failed: ${errorMsg}`);
        onError?.(errorMsg);
        return null;
      }
    },
    [
      socket,
      connectionState,
      chunkSize,
      queryClient,
      notify,
      updateProgress,
      uploadChunks,
      onComplete,
      onError,
    ]
  );

  /**
   * Pause the current upload
   */
  const pause = useCallback(() => {
    if (progress.status === "uploading") {
      isPausedRef.current = true;
      updateProgress({ status: "paused" });
    }
  }, [progress.status, updateProgress]);

  /**
   * Resume a paused upload (not to be confused with resuming an interrupted upload)
   */
  const unpause = useCallback(() => {
    if (progress.status === "paused") {
      isPausedRef.current = false;
      updateProgress({ status: "uploading" });
    }
  }, [progress.status, updateProgress]);

  /**
   * Cancel the current upload
   */
  const cancel = useCallback(async () => {
    abortControllerRef.current?.abort();

    if (uploadIdRef.current) {
      try {
        await socket.librarian().abortUpload(uploadIdRef.current);
      } catch (err) {
        console.warn("Failed to abort upload on server:", err);
      }
    }

    updateProgress({
      status: "cancelled",
      pendingChunks: [],
    });

    uploadIdRef.current = null;
    currentFileRef.current = null;
  }, [socket, updateProgress]);

  /**
   * Reset the upload state to idle
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    uploadIdRef.current = null;
    currentFileRef.current = null;
    isPausedRef.current = false;

    setProgress({
      totalBytes: 0,
      bytesUploaded: 0,
      percentage: 0,
      totalChunks: 0,
      chunksUploaded: 0,
      pendingChunks: [],
      status: "idle",
    });
  }, []);

  return {
    // Current progress state
    progress,

    // Control methods
    upload,
    resume,
    pause,
    unpause,
    cancel,
    reset,

    // Convenience flags
    isIdle: progress.status === "idle",
    isUploading: progress.status === "uploading",
    isPaused: progress.status === "paused",
    isCompleted: progress.status === "completed",
    isError: progress.status === "error",
  };
};
