import { useState, useCallback, useRef, useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { SectionLabel } from "../common";

export interface SparqlResult {
  columns: string[];
  rows: Record<string, string>[];
}

export interface QueryPreset {
  key: string;
  title: string;
  description: string;
  query: string;
}

export interface SparqlWorkbenchProps {
  onExecute?: (query: string) => Promise<SparqlResult>;
  presets?: QueryPreset[];
}

const EXAMPLE_QUERIES: { label: string; query: string }[] = [
  {
    label: "All classes",
    query: `SELECT ?class ?label
WHERE {
  ?class a owl:Class .
  OPTIONAL { ?class rdfs:label ?label }
}
ORDER BY ?label
LIMIT 100`,
  },
  {
    label: "All properties",
    query: `SELECT ?prop ?label ?domain ?range
WHERE {
  { ?prop a owl:ObjectProperty } UNION { ?prop a owl:DatatypeProperty }
  OPTIONAL { ?prop rdfs:label ?label }
  OPTIONAL { ?prop rdfs:domain ?domain }
  OPTIONAL { ?prop rdfs:range ?range }
}
ORDER BY ?label
LIMIT 100`,
  },
  {
    label: "Count by type",
    query: `SELECT ?type (COUNT(?s) AS ?count)
WHERE {
  ?s a ?type .
}
GROUP BY ?type
ORDER BY DESC(?count)
LIMIT 50`,
  },
  {
    label: "Sample triples",
    query: `SELECT ?s ?p ?o
WHERE {
  ?s ?p ?o .
}
LIMIT 25`,
  },
  {
    label: "Find by label",
    query: `SELECT ?entity ?label ?type
WHERE {
  ?entity rdfs:label ?label .
  OPTIONAL { ?entity a ?type }
  FILTER(CONTAINS(LCASE(?label), "london"))
}
LIMIT 50`,
  },
];

const DEFAULT_QUERY = EXAMPLE_QUERIES[3].query;

function shortenUri(uri: string): string {
  const prefixes: Record<string, string> = {
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf:",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs:",
    "http://www.w3.org/2002/07/owl#": "owl:",
    "http://www.w3.org/2001/XMLSchema#": "xsd:",
  };
  for (const [full, short] of Object.entries(prefixes)) {
    if (uri.startsWith(full)) return short + uri.substring(full.length);
  }
  const hash = uri.lastIndexOf("#");
  if (hash > 0 && hash < uri.length - 1) {
    const ns = uri.substring(0, hash + 1);
    const local = uri.substring(hash + 1);
    if (ns.length > 30) return "…:" + local;
  }
  if (uri.length > 60) return "…" + uri.substring(uri.length - 40);
  return uri;
}

export function SparqlWorkbench({ onExecute, presets }: SparqlWorkbenchProps) {
  const { theme, sz } = useTheme();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<SparqlResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const execute = useCallback(async () => {
    if (!onExecute) {
      setError("SPARQL endpoint not connected");
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsRunning(true);
    setError(null);
    setResult(null);
    setElapsed(null);
    const t0 = performance.now();

    try {
      const res = await onExecute(trimmed);
      setElapsed(performance.now() - t0);
      setResult(res);
    } catch (err) {
      setElapsed(performance.now() - t0);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [query, onExecute]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      execute();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setQuery(query.substring(0, start) + "  " + query.substring(end));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [execute, query]);

  const lineCount = useMemo(() => query.split("\n").length, [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <SectionLabel>SPARQL QUERY</SectionLabel>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setShowExamples(!showExamples); setShowPresets(false); }}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: `1px solid ${theme.border.default}`,
              background: "transparent",
              color: theme.text.subtle,
              fontSize: sz(10),
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
          >
            Examples
          </button>
          {showExamples && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              background: theme.surface.overlay,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
              padding: 4,
              zIndex: 20,
              minWidth: 180,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}>
              {EXAMPLE_QUERIES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(ex.query); setShowExamples(false); }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "6px 10px",
                    border: "none",
                    borderRadius: 4,
                    background: "transparent",
                    color: theme.text.muted,
                    fontSize: sz(11),
                    fontFamily: "'IBM Plex Mono', monospace",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = theme.surface.cardHover; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {presets && presets.length > 0 && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setShowPresets(!showPresets); setShowExamples(false); }}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: `1px solid ${theme.border.default}`,
                background: "transparent",
                color: theme.text.subtle,
                fontSize: sz(10),
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: "pointer",
              }}
            >
              Presets
            </button>
            {showPresets && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                background: theme.surface.overlay,
                border: `1px solid ${theme.border.default}`,
                borderRadius: 6,
                padding: 4,
                zIndex: 20,
                minWidth: 260,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}>
                {presets.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setQuery(p.query); setShowPresets(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "6px 10px",
                      border: "none",
                      borderRadius: 4,
                      background: "transparent",
                      color: theme.text.muted,
                      fontSize: sz(11),
                      fontFamily: "'IBM Plex Mono', monospace",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = theme.surface.cardHover; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                    title={p.description}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => { setQuery(""); setResult(null); setError(null); setElapsed(null); }}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: `1px solid ${theme.border.default}`,
            background: "transparent",
            color: theme.text.faint,
            fontSize: sz(10),
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: "pointer",
          }}
        >
          Clear
        </button>

        <button
          onClick={execute}
          disabled={isRunning || !onExecute}
          style={{
            padding: "4px 14px",
            borderRadius: 4,
            border: `1px solid ${onExecute ? theme.palette.emerald + "66" : theme.border.default}`,
            background: onExecute ? theme.palette.emerald + "18" : "transparent",
            color: onExecute ? theme.palette.emerald : theme.text.disabled,
            fontSize: sz(10),
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: onExecute ? "pointer" : "default",
            fontWeight: 600,
          }}
        >
          {isRunning ? "Running…" : "Execute"}
          <span style={{ marginLeft: 6, opacity: 0.5, fontWeight: 400 }}>Ctrl+Enter</span>
        </button>
      </div>

      {/* Editor */}
      <div style={{
        flex: "0 0 auto",
        maxHeight: "40%",
        minHeight: 120,
        display: "flex",
        borderBottom: `1px solid ${theme.border.default}`,
      }}>
        {/* Line numbers */}
        <div style={{
          padding: "12px 0",
          width: 40,
          textAlign: "right",
          paddingRight: 8,
          color: theme.text.hint,
          fontSize: sz(11),
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: "1.5",
          userSelect: "none",
          borderRight: `1px solid ${theme.border.default}`,
          overflow: "hidden",
        }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "transparent",
            border: "none",
            outline: "none",
            color: theme.text.primary,
            fontSize: sz(12),
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: "1.5",
            resize: "none",
            overflow: "auto",
          }}
        />
      </div>

      {/* Results area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Results header */}
        <div style={{
          padding: "6px 16px",
          borderBottom: `1px solid ${theme.border.default}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: sz(9), color: theme.text.hint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Results
          </span>
          {result && (
            <span style={{ fontSize: sz(9), color: theme.text.faint, fontFamily: "'IBM Plex Mono', monospace" }}>
              {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
              {elapsed !== null && ` · ${(elapsed / 1000).toFixed(2)}s`}
            </span>
          )}
          {error && (
            <span style={{ fontSize: sz(9), color: theme.palette.rose, fontFamily: "'IBM Plex Mono', monospace" }}>
              Error{elapsed !== null && ` · ${(elapsed / 1000).toFixed(2)}s`}
            </span>
          )}
        </div>

        {/* Results content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {isRunning && (
            <div style={{ padding: 32, textAlign: "center", color: theme.text.faint, fontSize: sz(12), fontFamily: "'IBM Plex Mono', monospace" }}>
              Executing query…
            </div>
          )}

          {error && (
            <div style={{
              margin: 16,
              padding: 16,
              borderRadius: 8,
              background: theme.palette.rose + "10",
              border: `1px solid ${theme.palette.rose}33`,
            }}>
              <div style={{ fontSize: sz(11), color: theme.palette.rose, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap" }}>
                {error}
              </div>
            </div>
          )}

          {!isRunning && !error && !result && (
            <div style={{ padding: 32, textAlign: "center", color: theme.text.hint, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace" }}>
              {onExecute
                ? "Write a query and press Ctrl+Enter to execute."
                : "SPARQL endpoint not connected."}
            </div>
          )}

          {result && result.rows.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: theme.text.faint, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace" }}>
              Query returned no results.
            </div>
          )}

          {result && result.rows.length > 0 && (
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: sz(11),
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <thead>
                <tr>
                  {result.columns.map(col => (
                    <th
                      key={col}
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        color: theme.palette.cyan,
                        fontWeight: 600,
                        fontSize: sz(10),
                        borderBottom: `1px solid ${theme.border.default}`,
                        position: "sticky",
                        top: 0,
                        background: theme.surface.base,
                        zIndex: 1,
                      }}
                    >
                      ?{col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "transparent" : theme.surface.card }}
                  >
                    {result.columns.map(col => {
                      const val = row[col] || "";
                      const isUri = val.startsWith("http://") || val.startsWith("https://");
                      return (
                        <td
                          key={col}
                          title={val}
                          style={{
                            padding: "6px 12px",
                            color: isUri ? theme.palette.blue : theme.text.muted,
                            borderBottom: `1px solid ${theme.border.subtle}`,
                            maxWidth: 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isUri ? shortenUri(val) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
