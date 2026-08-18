import { useState, useCallback, useRef } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore, useSettings } from "@trustgraph/react-state";

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

type Term = { t: "i"; i: string } | { t: "l"; v: string; dt?: string; ln?: string } | { t: "b"; d: string } | { t: "t"; tr?: Triple };
interface Triple { s: Term; p: Term; o: Term; }

interface SearchResult {
  uri: string;
  score: number;
  label?: string;
  type?: string;
  comment?: string;
}

interface ObjectView {
  uri: string;
  label?: string;
  comment?: string;
  types: string[];
  outbound: { predicate: string; predicateLabel?: string; value: string; valueLabel?: string; isUri: boolean }[];
  inbound: { predicate: string; predicateLabel?: string; subject: string; subjectLabel?: string }[];
}

function termToString(t: Term): string {
  if (t.t === "i") return t.i;
  if (t.t === "l") return t.v;
  if (t.t === "b") return t.d;
  return "";
}

function shortUri(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash >= 0) return uri.slice(hash + 1);
  const slash = uri.lastIndexOf("/");
  if (slash >= 0) return uri.slice(slash + 1);
  return uri;
}

function iri(uri: string): Term {
  return { t: "i" as const, i: uri };
}

export interface EmbeddingExplorerProps {
  placeholder?: string;
  maxResults?: number;
}

export function EmbeddingExplorer({
  placeholder = "Search knowledge graph\u2026",
  maxResults = 20,
}: EmbeddingExplorerProps) {
  const { theme, sz } = useTheme();
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isReady = connectionState?.status === "authenticated";
  const flowId = useSessionStore((s) => s.flowId);
  const { settings } = useSettings();
  const collection = settings.collection;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [objectView, setObjectView] = useState<ObjectView | null>(null);
  const [objectLoading, setObjectLoading] = useState(false);
  const [history, setHistory] = useState<ObjectView[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !isReady) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setObjectView(null);
    setHistory([]);

    try {
      const api = socket.flow(flowId);
      const vecs = await api.embeddings([query.trim()]);
      const entities = await api.graphEmbeddingsQuery(vecs[0], maxResults, collection);

      const searchResults: SearchResult[] = [];

      for (const ent of entities) {
        if (!ent.entity || ent.entity.t !== "i") continue;
        const uri = (ent.entity as any).i as string;
        searchResults.push({ uri, score: ent.score });
      }

      const labelResults = await Promise.all(
        searchResults.map(async (sr) => {
          try {
            const triples: Triple[] = await api.triplesQuery(
              iri(sr.uri), undefined, undefined, 100, collection,
            );
            for (const tr of triples) {
              const pred = termToString(tr.p);
              const val = termToString(tr.o);
              if (pred === RDFS_LABEL && !sr.label) sr.label = val;
              if (pred === RDFS_COMMENT && !sr.comment) sr.comment = val;
              if (pred === RDF_TYPE && !sr.type) sr.type = shortUri(val);
            }
          } catch { /* skip */ }
          return sr;
        }),
      );

      setResults(labelResults);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }, [query, isReady, socket, flowId, collection, maxResults]);

  const loadObject = useCallback(async (uri: string, pushHistory = true) => {
    if (!isReady) return;
    setObjectLoading(true);

    try {
      const api = socket.flow(flowId);

      const [outTriples, inTriples] = await Promise.all([
        api.triplesQuery(iri(uri), undefined, undefined, 200, collection) as Promise<Triple[]>,
        api.triplesQuery(undefined, undefined, iri(uri), 200, collection) as Promise<Triple[]>,
      ]);

      const obj: ObjectView = {
        uri,
        types: [],
        outbound: [],
        inbound: [],
      };

      for (const tr of outTriples) {
        const pred = termToString(tr.p);
        const val = termToString(tr.o);
        if (pred === RDFS_LABEL) { obj.label = val; continue; }
        if (pred === RDFS_COMMENT) { obj.comment = val; continue; }
        if (pred === RDF_TYPE) { obj.types.push(shortUri(val)); continue; }
        obj.outbound.push({
          predicate: pred,
          value: val,
          isUri: tr.o.t === "i",
        });
      }

      const labelUris = new Set<string>();
      for (const rel of obj.outbound) {
        labelUris.add(rel.predicate);
        if (rel.isUri) labelUris.add(rel.value);
      }
      for (const tr of inTriples) {
        const subj = termToString(tr.s);
        const pred = termToString(tr.p);
        if (pred === RDF_TYPE) continue;
        obj.inbound.push({ predicate: pred, subject: subj });
        labelUris.add(pred);
        labelUris.add(subj);
      }

      const labelMap = new Map<string, string>();
      await Promise.all(
        [...labelUris].map(async (u) => {
          try {
            const triples: Triple[] = await api.triplesQuery(
              iri(u), iri(RDFS_LABEL), undefined, 1, collection,
            );
            if (triples.length > 0) labelMap.set(u, termToString(triples[0].o));
          } catch { /* skip */ }
        }),
      );

      for (const rel of obj.outbound) {
        rel.predicateLabel = labelMap.get(rel.predicate);
        if (rel.isUri) rel.valueLabel = labelMap.get(rel.value);
      }
      for (const rel of obj.inbound) {
        rel.predicateLabel = labelMap.get(rel.predicate);
        rel.subjectLabel = labelMap.get(rel.subject);
      }

      if (pushHistory && objectView) {
        setHistory((h) => [...h, objectView]);
      }
      setObjectView(obj);
    } catch (err) {
      console.error("Failed to load object", err);
    } finally {
      setObjectLoading(false);
    }
  }, [isReady, socket, flowId, collection, objectView]);

  const goBack = useCallback(() => {
    if (history.length === 0) {
      setObjectView(null);
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setObjectView(prev);
  }, [history]);

  const linkStyle = {
    color: theme.palette.cyan,
    cursor: "pointer" as const,
    textDecoration: "none" as const,
  };

  const sectionLabel = {
    fontSize: sz(9),
    fontFamily: theme.font.mono,
    color: theme.text.hint,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 8,
    marginTop: 16,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search bar */}
      <div style={{
        padding: "12px 20px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex", gap: 8,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: "6px 10px", borderRadius: 4,
            border: `1px solid ${theme.border.default}`,
            background: theme.surface.card,
            color: theme.text.primary,
            fontSize: sz(11), fontFamily: theme.font.sans,
            outline: "none",
          }}
        />
        <button
          onClick={doSearch}
          disabled={searching || !query.trim()}
          style={{
            padding: "6px 16px", borderRadius: 4,
            border: `1px solid ${theme.palette.cyan}44`,
            background: `${theme.palette.cyan}1a`,
            color: theme.palette.cyan,
            fontSize: sz(10), fontFamily: theme.font.mono,
            cursor: searching ? "wait" : "pointer",
            opacity: searching || !query.trim() ? 0.5 : 1,
          }}
        >
          {searching ? "Searching\u2026" : "Search"}
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", display: "flex" }}>
        {/* Left: search results */}
        <div style={{
          width: objectView ? 320 : "100%",
          maxWidth: objectView ? 320 : undefined,
          borderRight: objectView ? `1px solid ${theme.border.default}` : "none",
          overflow: "auto", padding: "8px 12px",
        }}>
          {searchError && (
            <div style={{ color: theme.palette.rose, fontSize: sz(11), fontFamily: theme.font.mono, padding: 12 }}>
              {searchError}
            </div>
          )}

          {!searching && results.length === 0 && !searchError && (
            <div style={{
              padding: 32, textAlign: "center",
              color: theme.text.hint, fontSize: sz(11),
              fontFamily: theme.font.mono,
            }}>
              {query ? "No results" : "Enter a search term to explore the knowledge graph"}
            </div>
          )}

          {results.map((r, i) => {
            const isSelected = objectView?.uri === r.uri;
            return (
              <div
                key={i}
                onClick={() => loadObject(r.uri, true)}
                style={{
                  padding: "8px 12px", marginBottom: 4, borderRadius: 6,
                  border: `1px solid ${isSelected ? theme.palette.cyan + "66" : theme.border.default}`,
                  background: isSelected ? `${theme.palette.cyan}08` : theme.surface.card,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {r.type && (
                    <span style={{
                      padding: "1px 6px", borderRadius: 3, fontSize: sz(8),
                      fontFamily: theme.font.mono,
                      color: theme.palette.amber, border: `1px solid ${theme.palette.amber}33`,
                      background: `${theme.palette.amber}10`, flexShrink: 0,
                    }}>
                      {r.type}
                    </span>
                  )}
                  <span style={{
                    flex: 1, fontSize: sz(11),
                    fontFamily: theme.font.sans,
                    fontWeight: 500, color: theme.text.primary,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {r.label || shortUri(r.uri)}
                  </span>
                  <span style={{
                    fontSize: sz(8), fontFamily: theme.font.mono,
                    color: theme.text.hint, flexShrink: 0,
                  }}>
                    {(r.score * 100).toFixed(0)}%
                  </span>
                </div>
                {r.comment && (
                  <div style={{
                    marginTop: 3, fontSize: sz(9),
                    fontFamily: theme.font.sans,
                    color: theme.text.subtle,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {r.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: object detail */}
        {objectView && (
          <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
            {objectLoading ? (
              <div style={{
                padding: 32, textAlign: "center",
                color: theme.text.hint, fontSize: sz(11),
                fontFamily: theme.font.mono,
              }}>
                Loading\u2026
              </div>
            ) : (
              <div>
                {/* Back + breadcrumb */}
                {history.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span onClick={goBack} style={{ ...linkStyle, fontSize: sz(10), fontFamily: theme.font.mono }}>
                      \u2190 back
                    </span>
                  </div>
                )}

                {/* Header */}
                <div style={{
                  fontSize: sz(16), fontFamily: theme.font.sans,
                  fontWeight: 600, color: theme.text.primary, marginBottom: 4,
                }}>
                  {objectView.label || shortUri(objectView.uri)}
                </div>

                {objectView.types.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                    {objectView.types.map((t, i) => (
                      <span key={i} style={{
                        padding: "1px 6px", borderRadius: 3, fontSize: sz(8),
                        fontFamily: theme.font.mono,
                        color: theme.palette.amber, border: `1px solid ${theme.palette.amber}33`,
                        background: `${theme.palette.amber}10`,
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {objectView.comment && (
                  <div style={{
                    fontSize: sz(11), fontFamily: theme.font.sans,
                    color: theme.text.muted, lineHeight: 1.5, marginBottom: 8,
                  }}>
                    {objectView.comment}
                  </div>
                )}

                <div style={{
                  fontSize: sz(8), fontFamily: theme.font.mono,
                  color: theme.text.hint, marginBottom: 12,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={objectView.uri}>
                  {objectView.uri}
                </div>

                {/* Outbound relationships */}
                {objectView.outbound.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Properties &amp; Relationships</div>
                    <table style={{
                      width: "100%", borderCollapse: "collapse",
                      fontSize: sz(10), fontFamily: theme.font.mono,
                    }}>
                      <tbody>
                        {objectView.outbound.map((rel, i) => (
                          <tr key={i} style={{
                            borderBottom: `1px solid ${theme.border.subtle}`,
                          }}>
                            <td style={{
                              padding: "5px 8px", color: theme.text.subtle,
                              verticalAlign: "top", whiteSpace: "nowrap", width: "40%",
                            }} title={rel.predicate}>
                              {rel.predicateLabel || shortUri(rel.predicate)}
                            </td>
                            <td style={{ padding: "5px 8px", verticalAlign: "top" }}>
                              {rel.isUri ? (
                                <span
                                  onClick={() => loadObject(rel.value, true)}
                                  style={linkStyle}
                                  title={rel.value}
                                >
                                  {rel.valueLabel || shortUri(rel.value)}
                                </span>
                              ) : (
                                <span style={{ color: theme.text.primary, wordBreak: "break-word" }}>
                                  {rel.value}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Inbound relationships */}
                {objectView.inbound.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Referenced By</div>
                    <table style={{
                      width: "100%", borderCollapse: "collapse",
                      fontSize: sz(10), fontFamily: theme.font.mono,
                    }}>
                      <tbody>
                        {objectView.inbound.map((rel, i) => (
                          <tr key={i} style={{
                            borderBottom: `1px solid ${theme.border.subtle}`,
                          }}>
                            <td style={{
                              padding: "5px 8px", verticalAlign: "top",
                            }}>
                              <span
                                onClick={() => loadObject(rel.subject, true)}
                                style={linkStyle}
                                title={rel.subject}
                              >
                                {rel.subjectLabel || shortUri(rel.subject)}
                              </span>
                            </td>
                            <td style={{
                              padding: "5px 8px", color: theme.text.subtle,
                              verticalAlign: "top", whiteSpace: "nowrap",
                            }} title={rel.predicate}>
                              {rel.predicateLabel || shortUri(rel.predicate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {objectView.outbound.length === 0 && objectView.inbound.length === 0 && (
                  <div style={{
                    padding: 20, textAlign: "center",
                    color: theme.text.hint, fontSize: sz(11),
                    fontFamily: theme.font.mono,
                  }}>
                    No relationships found
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
