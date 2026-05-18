import { useState, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

export interface SourceDocumentState {
  chunkUri: string;
  documentUri: string;
  documentTitle?: string;
  documentTags?: string[];
  chunkText?: string;
  loading: boolean;
  error?: string;
}

/**
 * Fetches document metadata and chunk text for a source URI.
 */
export function useSourceDocument() {
  const socket = useSocket();
  const [source, setSource] = useState<SourceDocumentState | null>(null);

  const loadSource = useCallback((chunkUri: string, documentUri: string) => {
    // Same chunk — ignore
    if (source?.chunkUri === chunkUri) return;

    setSource({
      chunkUri,
      documentUri,
      loading: true,
    });

    const librarian = socket.librarian();

    // Fetch document metadata
    librarian.getDocumentMetadata(documentUri).then((meta: any) => {
      setSource(prev => prev?.chunkUri === chunkUri
        ? { ...prev, documentTitle: meta?.title, documentTags: meta?.tags }
        : prev
      );
    }).catch(() => {
      // Metadata not available — that's OK
    });

    // Stream chunk text
    let chunkText = "";
    librarian.streamDocument(
      chunkUri,
      (content: string, _chunkIndex: number, _totalChunks: number, complete: boolean) => {
        try {
          chunkText += atob(content);
        } catch {
          chunkText += content;
        }
        if (complete) {
          setSource(prev => prev?.chunkUri === chunkUri
            ? { ...prev, chunkText, loading: false }
            : prev
          );
        }
      },
      (err: string) => {
        setSource(prev => prev?.chunkUri === chunkUri
          ? { ...prev, loading: false, error: err }
          : prev
        );
      },
    );
  }, [socket, source?.chunkUri]);

  const close = useCallback(() => {
    setSource(null);
  }, []);

  return { source, loadSource, close };
}
