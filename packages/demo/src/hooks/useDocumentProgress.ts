import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const PROV_WAS_DERIVED_FROM = "http://www.w3.org/ns/prov#wasDerivedFrom";
const TG_PAGE = "https://trustgraph.ai/ns/Page";
const TG_CHUNK = "https://trustgraph.ai/ns/Chunk";

export interface DocumentProgress {
  pages: number;
  chunks: number;
}

/**
 * Polls the knowledge graph for page and chunk counts per document.
 * Queries all Pages and Chunks in the collection, then groups by
 * their source document (via wasDerivedFrom chains).
 */
export function useDocumentProgress(
  documentIds: string[],
  collection: string,
  pollInterval = 8000,
) {
  const socket = useSocket();
  const [progress, setProgress] = useState<Record<string, DocumentProgress>>({});
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(true);

  const fetchProgress = useCallback(async () => {
    if (!activeRef.current || documentIds.length === 0) return;

    try {
      const api = socket.flow("default");
      const docIdSet = new Set(documentIds);

      // Query all Page entities in the collection
      const pageTypeTriples = await api.triplesQuery(
        undefined,
        { t: "i", i: RDF_TYPE },
        { t: "i", i: TG_PAGE },
        10000,
        collection,
      );

      const pageUris = new Set<string>();
      for (const t of pageTypeTriples) {
        if (t.s.t === "i") pageUris.add(t.s.i);
      }

      // For each page, find which document it derives from
      const pageToDoc = new Map<string, string>();
      const pageCounts: Record<string, number> = {};

      if (pageUris.size > 0) {
        // Query wasDerivedFrom for all pages — batch by querying with predicate filter
        for (const pageUri of pageUris) {
          const derivTriples = await api.triplesQuery(
            { t: "i", i: pageUri },
            { t: "i", i: PROV_WAS_DERIVED_FROM },
            undefined,
            1,
            collection,
          );
          for (const t of derivTriples) {
            const docUri = t.o.t === "i" ? t.o.i : "";
            if (docUri && docIdSet.has(docUri)) {
              pageToDoc.set(pageUri, docUri);
              pageCounts[docUri] = (pageCounts[docUri] || 0) + 1;
            }
          }
        }
      }

      // Query all Chunk entities in the collection
      const chunkTypeTriples = await api.triplesQuery(
        undefined,
        { t: "i", i: RDF_TYPE },
        { t: "i", i: TG_CHUNK },
        10000,
        collection,
      );

      const chunkUris = new Set<string>();
      for (const t of chunkTypeTriples) {
        if (t.s.t === "i") chunkUris.add(t.s.i);
      }

      // For each chunk, find which page (or doc) it derives from
      const chunkCounts: Record<string, number> = {};

      if (chunkUris.size > 0) {
        for (const chunkUri of chunkUris) {
          const derivTriples = await api.triplesQuery(
            { t: "i", i: chunkUri },
            { t: "i", i: PROV_WAS_DERIVED_FROM },
            undefined,
            1,
            collection,
          );
          for (const t of derivTriples) {
            const parentUri = t.o.t === "i" ? t.o.i : "";
            // Parent could be a page or directly a document
            let docUri = pageToDoc.get(parentUri);
            if (!docUri && docIdSet.has(parentUri)) {
              docUri = parentUri; // Direct doc → chunk (no pages)
            }
            if (docUri) {
              chunkCounts[docUri] = (chunkCounts[docUri] || 0) + 1;
            }
          }
        }
      }

      // Build progress map
      const newProgress: Record<string, DocumentProgress> = {};
      for (const docId of documentIds) {
        const pages = pageCounts[docId] || 0;
        const chunks = chunkCounts[docId] || 0;
        if (pages > 0 || chunks > 0) {
          newProgress[docId] = { pages, chunks };
        }
      }

      if (activeRef.current) {
        setProgress(newProgress);
      }
    } catch (err) {
      // Silently skip — might not be connected
    }
  }, [socket, documentIds, collection]);

  useEffect(() => {
    activeRef.current = true;
    fetchProgress();
    timerRef.current = window.setInterval(fetchProgress, pollInterval);

    return () => {
      activeRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchProgress, pollInterval]);

  return progress;
}
