import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTheme, SplitPane, RawNodeDetailPanel } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings } from "@trustgraph/react-state";

interface SearchResult {
  uri: string;
  score: number;
  label?: string;
  comment?: string;
  image?: string;
  keywords: string[];
  types: string[];
}


function localName(uri: string): string {
  const h = uri.lastIndexOf("#");
  const s = uri.lastIndexOf("/");
  const i = Math.max(h, s);
  return i >= 0 ? uri.substring(i + 1) : uri;
}

const PALETTE_KEYS: (keyof Theme["palette"])[] = [
  "emerald", "blue", "amber", "purple", "cyan", "rose", "pink",
];

function chipColor(uri: string, palette: Theme["palette"]): string {
  let h = 0;
  for (let i = 0; i < uri.length; i++) h = ((h << 5) - h + uri.charCodeAt(i)) | 0;
  const key = PALETTE_KEYS[Math.abs(h) % PALETTE_KEYS.length];
  return palette[key];
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.substring(0, max) + "…" : s;
}

export function SearchPage() {
  const { theme, sz } = useTheme();
  const location = useLocation();
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;

  const initialQuery = new URLSearchParams(location.search).get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const autoSearched = useRef(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [panelUri, setPanelUri] = useState<string | null>(null);
  const seqRef = useRef(0);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const seq = ++seqRef.current;
    setLoading(true);
    setSearched(true);
    setSelected(null);
    setPanelUri(null);

    try {
      const api = socket.flow(flowId);

      const embResult = await api.embeddings([trimmed]);
      const vec = embResult?.[0];
      if (!vec || seq !== seqRef.current) return;

      const geResult = await api.graphEmbeddingsQuery(vec, 20, collection) as
        { entity: { t: string; i?: string }; score: number }[];
      if (seq !== seqRef.current) return;

      const uris = geResult
        .map((r) => r.entity?.i)
        .filter((u): u is string => !!u);

      if (uris.length === 0) {
        setResults([]);
        return;
      }

      const scoreMap = new Map<string, number>();
      for (const r of geResult) {
        if (r.entity?.i) scoreMap.set(r.entity.i, r.score);
      }

      const values = uris.map((u) => `(<${u}>)`).join(" ");
      const sparql = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX schema: <https://schema.org/>
        PREFIX dcat: <http://www.w3.org/ns/dcat#>
        SELECT ?uri ?label ?comment ?image ?keyword ?type WHERE {
          VALUES (?uri) { ${values} }
          OPTIONAL { ?uri rdfs:label ?label }
          OPTIONAL { ?uri rdfs:comment ?comment }
          OPTIONAL { ?uri schema:image ?image }
          OPTIONAL { ?uri dcat:keyword ?keyword }
          OPTIONAL { ?uri a ?type }
        }
      `;

      const sparqlResult = await api.sparqlQuery(sparql, collection);
      if (seq !== seqRef.current) return;

      const resultMap = new Map<string, SearchResult>();
      for (const uri of uris) {
        resultMap.set(uri, {
          uri,
          score: scoreMap.get(uri) ?? 0,
          keywords: [],
          types: [],
        });
      }

      for (const row of sparqlResult.rows) {
        const entry = resultMap.get(row.uri);
        if (!entry) continue;
        if (row.label && !entry.label) entry.label = row.label;
        if (row.comment && !entry.comment) entry.comment = row.comment;
        if (row.image && !entry.image) entry.image = row.image;
        if (row.keyword && !entry.keywords.includes(row.keyword)) entry.keywords.push(row.keyword);
        if (row.type && !entry.types.includes(row.type)) entry.types.push(row.type);
      }

      setResults(Array.from(resultMap.values()));
    } catch (e) {
      console.error("Search failed:", e);
      setResults([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [query, socket, flowId, collection]);

  useEffect(() => {
    if (initialQuery && !autoSearched.current) {
      autoSearched.current = true;
      handleSearch();
    }
  }, [initialQuery, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const activeUri = panelUri || selected?.uri || null;
  const panel = activeUri ? (
    <RawNodeDetailPanel
      uri={activeUri}
      nodeColor={theme.palette.cyan}
      onClose={() => { setSelected(null); setPanelUri(null); }}
      onNodeNavigate={(uri) => setPanelUri(uri)}
    />
  ) : null;

  return (
    <SplitPane panel={panel} panelWidth={400}>
      <div style={{
        padding: sz(32), maxWidth: 960, margin: "0 auto",
        color: theme.text.primary, fontFamily: theme.font.sans,
        height: "var(--page-height)", overflowY: "auto",
      }}>
        <h1 style={{ fontSize: sz(28), fontWeight: 600, marginBottom: sz(20) }}>
          Search
        </h1>

        <div style={{ display: "flex", gap: sz(8), marginBottom: sz(24) }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the knowledge graph…"
            style={{
              flex: 1,
              padding: `${sz(10)}px ${sz(14)}px`,
              fontSize: sz(14),
              borderRadius: 8,
              border: `1px solid ${theme.border.default}`,
              background: theme.surface.overlay,
              color: theme.text.primary,
              fontFamily: theme.font.sans,
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              padding: `${sz(10)}px ${sz(20)}px`,
              fontSize: sz(14),
              borderRadius: 8,
              border: `1px solid ${theme.border.default}`,
              background: theme.surface.overlay,
              color: theme.text.primary,
              cursor: loading || !query.trim() ? "default" : "pointer",
              fontFamily: theme.font.sans,
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {searched && !loading && results.length === 0 && (
          <p style={{ color: theme.text.muted, fontSize: sz(14) }}>No results found.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: sz(12) }}>
          {results.map((r) => (
            <div
              key={r.uri}
              onClick={() => { setSelected(r); setPanelUri(null); }}
              style={{
                padding: sz(16),
                borderRadius: 10,
                background: selected?.uri === r.uri
                  ? theme.surface.base
                  : theme.surface.overlay,
                border: `1px solid ${selected?.uri === r.uri
                  ? theme.border.medium
                  : theme.border.default}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: sz(14) }}>
                {r.image && (
                  <img
                    src={r.image}
                    alt=""
                    style={{
                      width: sz(80),
                      height: sz(60),
                      objectFit: "cover",
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", flexWrap: "wrap",
                gap: sz(6), marginBottom: sz(4),
              }}>
                <span style={{ fontSize: sz(15), fontWeight: 600 }}>
                  {r.label || localName(r.uri)}
                </span>
                {r.types.map((t) => {
                  const color = chipColor(t, theme.palette);
                  return (
                    <span
                      key={t}
                      onClick={(e) => { e.stopPropagation(); setPanelUri(t); }}
                      style={{
                        fontSize: sz(10),
                        padding: `${sz(2)}px ${sz(8)}px`,
                        borderRadius: 99,
                        background: `${color}18`,
                        border: `1px solid ${color}40`,
                        color,
                        fontFamily: theme.font.mono,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {localName(t)}
                    </span>
                  );
                })}
              </div>

              {r.comment && (
                <p style={{
                  fontSize: sz(13), color: theme.text.muted,
                  lineHeight: 1.5, margin: 0,
                }}>
                  {truncate(r.comment, 1000)}
                </p>
              )}

              {r.keywords.length > 0 && (
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: sz(5),
                  marginTop: sz(8),
                }}>
                  {r.keywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        fontSize: sz(10),
                        padding: `${sz(2)}px ${sz(8)}px`,
                        borderRadius: 99,
                        background: theme.surface.base,
                        border: `1px solid ${theme.border.default}`,
                        color: theme.text.muted,
                        fontFamily: theme.font.mono,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SplitPane>
  );
}
