import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore } from "@trustgraph/react-state";
import { SectionLabel, useTheme } from "@trustgraph/trustkit";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const PROV_WAS_DERIVED_FROM = "http://www.w3.org/ns/prov#wasDerivedFrom";
const TG_PAGE = "https://trustgraph.ai/ns/Page";
const TG_CHUNK = "https://trustgraph.ai/ns/Chunk";
const TG_PAGE_NUMBER = "https://trustgraph.ai/ns/pageNumber";
const TG_CHUNK_INDEX = "https://trustgraph.ai/ns/chunkIndex";
const TG_CHAR_LENGTH = "https://trustgraph.ai/ns/charLength";

interface DocEntry {
  uri: string;
  label: string;
  pages: PageEntry[];
  directChunks: ChunkEntry[]; // chunks without pages
}

interface PageEntry {
  uri: string;
  label: string;
  pageNumber: number;
  charLength: number;
  chunks: ChunkEntry[];
}

interface ChunkEntry {
  uri: string;
  label: string;
  chunkIndex: number;
  charLength: number;
}

interface StorageContentsProps {
  collection: string;
  storeColor: string;
}

function getTermValue(term: { t: string; i?: string; v?: string; d?: string }): string {
  if (term.t === "i") return term.i || "";
  if (term.t === "l") return term.v || "";
  if (term.t === "b") return term.d || "";
  return "";
}

export function StorageContents({ collection, storeColor }: StorageContentsProps) {
  const { theme, sz } = useTheme();
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const [hierarchy, setHierarchy] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const fetchContents = useCallback(async () => {
    try {
      const api = socket.flow(flowId);

      // Get all pages
      const pageTypeTriples = await api.triplesQuery(
        undefined,
        { t: "i", i: RDF_TYPE },
        { t: "i", i: TG_PAGE },
        10000, collection,
      );
      const pageUris = new Set<string>();
      for (const t of pageTypeTriples) {
        if (t.s.t === "i") pageUris.add(t.s.i);
      }

      // Get all chunks
      const chunkTypeTriples = await api.triplesQuery(
        undefined,
        { t: "i", i: RDF_TYPE },
        { t: "i", i: TG_CHUNK },
        10000, collection,
      );
      const chunkUris = new Set<string>();
      for (const t of chunkTypeTriples) {
        if (t.s.t === "i") chunkUris.add(t.s.i);
      }

      // Get metadata for all pages and chunks in one pass
      const allUris = [...pageUris, ...chunkUris];
      const metadata = new Map<string, { label: string; derivedFrom: string; pageNumber?: number; chunkIndex?: number; charLength?: number }>();

      for (const uri of allUris) {
        const triples = await api.triplesQuery(
          { t: "i", i: uri },
          undefined, undefined, 20, collection,
        );
        const entry: any = { label: "", derivedFrom: "" };
        for (const t of triples) {
          const pred = getTermValue(t.p);
          const val = getTermValue(t.o);
          if (pred === RDFS_LABEL) entry.label = val;
          if (pred === PROV_WAS_DERIVED_FROM) entry.derivedFrom = val;
          if (pred === TG_PAGE_NUMBER) entry.pageNumber = parseInt(val) || 0;
          if (pred === TG_CHUNK_INDEX) entry.chunkIndex = parseInt(val) || 0;
          if (pred === TG_CHAR_LENGTH) entry.charLength = parseInt(val) || 0;
        }
        metadata.set(uri, entry);
      }

      // Build hierarchy: group pages by document, chunks by page
      const docMap = new Map<string, DocEntry>();

      // Process pages — group by document
      for (const pageUri of pageUris) {
        const meta = metadata.get(pageUri);
        if (!meta) continue;
        const docUri = meta.derivedFrom;
        if (!docMap.has(docUri)) {
          docMap.set(docUri, { uri: docUri, label: docUri.split("/").pop() || docUri, pages: [], directChunks: [] });
        }
        docMap.get(docUri)!.pages.push({
          uri: pageUri,
          label: meta.label || pageUri,
          pageNumber: meta.pageNumber || 0,
          charLength: meta.charLength || 0,
          chunks: [],
        });
      }

      // Process chunks — group by page or document
      for (const chunkUri of chunkUris) {
        const meta = metadata.get(chunkUri);
        if (!meta) continue;
        const parentUri = meta.derivedFrom;

        const chunk: ChunkEntry = {
          uri: chunkUri,
          label: meta.label || chunkUri,
          chunkIndex: meta.chunkIndex || 0,
          charLength: meta.charLength || 0,
        };

        // Is parent a page?
        if (pageUris.has(parentUri)) {
          // Find the page's document
          const pageMeta = metadata.get(parentUri);
          const docUri = pageMeta?.derivedFrom || "";
          if (!docMap.has(docUri)) {
            docMap.set(docUri, { uri: docUri, label: docUri.split("/").pop() || docUri, pages: [], directChunks: [] });
          }
          const doc = docMap.get(docUri)!;
          const page = doc.pages.find(p => p.uri === parentUri);
          if (page) {
            page.chunks.push(chunk);
          }
        } else {
          // Direct doc → chunk (no pages)
          if (!docMap.has(parentUri)) {
            docMap.set(parentUri, { uri: parentUri, label: parentUri.split("/").pop() || parentUri, pages: [], directChunks: [] });
          }
          docMap.get(parentUri)!.directChunks.push(chunk);
        }
      }

      // Sort pages by pageNumber, chunks by chunkIndex
      for (const doc of docMap.values()) {
        doc.pages.sort((a, b) => a.pageNumber - b.pageNumber);
        for (const page of doc.pages) {
          page.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        }
        doc.directChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      }

      setHierarchy(Array.from(docMap.values()));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch storage contents:", err);
      setLoading(false);
    }
  }, [socket, collection, flowId, generation]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const toggleDoc = (uri: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri); else next.add(uri);
      return next;
    });
  };

  const togglePage = (uri: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri); else next.add(uri);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ fontSize: sz(11), color: theme.text.disabled, fontFamily: theme.font.mono }}>
        Loading contents...
      </div>
    );
  }

  if (hierarchy.length === 0) {
    return (
      <div style={{ fontSize: sz(12), color: theme.text.hint, fontStyle: "italic" }}>
        No documents processed into this store yet.
      </div>
    );
  }

  const totalPages = hierarchy.reduce((sum, d) => sum + d.pages.length, 0);
  const totalChunks = hierarchy.reduce((sum, d) =>
    sum + d.directChunks.length + d.pages.reduce((s, p) => s + p.chunks.length, 0), 0);

  return (
    <div>
      <SectionLabel marginBottom={8}>
        CONTENTS
        <span style={{ color: theme.text.muted, fontWeight: 400, marginLeft: 8 }}>
          {hierarchy.length} doc{hierarchy.length !== 1 ? "s" : ""}
          {totalPages > 0 && ` · ${totalPages} pg`}
          {totalChunks > 0 && ` · ${totalChunks} ch`}
        </span>
      </SectionLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {hierarchy.map(doc => {
          const isExpanded = expandedDocs.has(doc.uri);
          const docChunks = doc.directChunks.length + doc.pages.reduce((s, p) => s + p.chunks.length, 0);

          return (
            <div key={doc.uri}>
              {/* Document */}
              <div
                onClick={() => toggleDoc(doc.uri)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: sz(11),
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.surface.card; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span>
                  <span style={{ color: theme.text.faint, marginRight: 4 }}>{isExpanded ? "▾" : "▸"}</span>
                  <span style={{ color: theme.palette.cyan, fontWeight: 600 }}>{doc.label}</span>
                </span>
                <span style={{ color: theme.text.disabled, fontFamily: theme.font.mono, fontSize: sz(9) }}>
                  {doc.pages.length > 0 && `${doc.pages.length}pg `}
                  {docChunks > 0 && `${docChunks}ch`}
                </span>
              </div>

              {/* Expanded: pages and chunks */}
              {isExpanded && (
                <div style={{ paddingLeft: 16, borderLeft: `1px solid ${theme.border.subtle}`, marginLeft: 10 }}>
                  {/* Pages */}
                  {doc.pages.map(page => {
                    const pageExpanded = expandedPages.has(page.uri);
                    return (
                      <div key={page.uri}>
                        <div
                          onClick={() => togglePage(page.uri)}
                          style={{
                            padding: "4px 6px",
                            fontSize: sz(10),
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme.surface.card; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <span>
                            <span style={{ color: theme.text.faint, marginRight: 4 }}>{pageExpanded ? "▾" : "▸"}</span>
                            <span style={{ color: storeColor }}>{page.label}</span>
                          </span>
                          <span style={{ color: theme.text.disabled, fontFamily: theme.font.mono, fontSize: sz(9) }}>
                            {page.charLength > 0 && `${page.charLength}ch `}
                            {page.chunks.length}chunks
                          </span>
                        </div>

                        {/* Chunks under this page */}
                        {pageExpanded && (
                          <div style={{ paddingLeft: 14, borderLeft: `1px solid ${theme.border.subtle}`, marginLeft: 8 }}>
                            {page.chunks.map(chunk => (
                              <div key={chunk.uri} style={{
                                padding: "2px 6px",
                                fontSize: sz(9),
                                fontFamily: theme.font.mono,
                                color: theme.text.faint,
                              }}>
                                {chunk.label}
                                <span style={{ marginLeft: 8, color: theme.text.disabled }}>
                                  {chunk.charLength > 0 && `${chunk.charLength} chars`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Direct chunks (no pages) */}
                  {doc.directChunks.map(chunk => (
                    <div key={chunk.uri} style={{
                      padding: "2px 6px",
                      fontSize: sz(9),
                      fontFamily: theme.font.mono,
                      color: theme.text.faint,
                    }}>
                      {chunk.label}
                      <span style={{ marginLeft: 8, color: theme.text.disabled }}>
                        {chunk.charLength > 0 && `${chunk.charLength} chars`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
