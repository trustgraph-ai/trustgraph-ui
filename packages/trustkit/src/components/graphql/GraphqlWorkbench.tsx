import { useState, useCallback, useRef, useMemo } from "react";
import { text, border, palette } from "../../theme";
import { SectionLabel } from "../common";

type ResultView = "raw" | "table";

function extractTable(data: unknown): { columns: string[]; rows: Record<string, unknown>[] } | null {
  if (!data || typeof data !== "object") return null;
  const entries = Object.values(data as Record<string, unknown>);
  let arr: unknown[] | null = null;
  if (Array.isArray(data)) {
    arr = data;
  } else if (entries.length === 1 && Array.isArray(entries[0])) {
    arr = entries[0];
  } else {
    for (const v of entries) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = Object.values(v as Record<string, unknown>);
        if (inner.length === 1 && Array.isArray(inner[0])) {
          arr = inner[0];
          break;
        }
      }
    }
  }
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  const columns = Object.keys(first as Record<string, unknown>);
  if (columns.length === 0) return null;
  return { columns, rows: arr as Record<string, unknown>[] };
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface GraphqlResult {
  data?: unknown;
  errors?: unknown[];
}

export interface GraphqlPreset {
  key: string;
  title: string;
  description: string;
  query: string;
}

export interface GraphqlWorkbenchProps {
  onExecute?: (query: string) => Promise<GraphqlResult>;
  presets?: GraphqlPreset[];
}

const EXAMPLE_QUERIES: { label: string; query: string }[] = [
  {
    label: "Introspect types",
    query: `{
  __schema {
    types {
      name
      kind
    }
  }
}`,
  },
  {
    label: "Introspect fields",
    query: `{
  __schema {
    queryType {
      fields {
        name
        type { name kind }
      }
    }
  }
}`,
  },
];

const DEFAULT_QUERY = EXAMPLE_QUERIES[0].query;

export function GraphqlWorkbench({ onExecute, presets }: GraphqlWorkbenchProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [result, setResult] = useState<GraphqlResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [resultView, setResultView] = useState<ResultView>("table");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const execute = useCallback(async () => {
    if (!onExecute) {
      setError("GraphQL endpoint not connected");
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
      if (res.errors && (res.errors as unknown[]).length > 0) {
        setError(JSON.stringify(res.errors, null, 2));
      }
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

  const formattedResult = useMemo(() => {
    if (!result?.data) return null;
    return JSON.stringify(result.data, null, 2);
  }, [result]);

  const tableData = useMemo(() => {
    if (!result?.data) return null;
    return extractTable(result.data);
  }, [result]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        padding: "8px 16px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <SectionLabel>GRAPHQL QUERY</SectionLabel>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setShowExamples(!showExamples); setShowPresets(false); }}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: `1px solid ${border.default}`,
              background: "transparent",
              color: text.subtle,
              fontSize: 10,
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
              background: "#1a1a22",
              border: `1px solid ${border.default}`,
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
                    color: text.muted,
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
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
                border: `1px solid ${border.default}`,
                background: "transparent",
                color: text.subtle,
                fontSize: 10,
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
                background: "#1a1a22",
                border: `1px solid ${border.default}`,
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
                      color: text.muted,
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
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
            border: `1px solid ${border.default}`,
            background: "transparent",
            color: text.faint,
            fontSize: 10,
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
            border: `1px solid ${onExecute ? palette.emerald + "66" : border.default}`,
            background: onExecute ? palette.emerald + "18" : "transparent",
            color: onExecute ? palette.emerald : text.disabled,
            fontSize: 10,
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
        borderBottom: `1px solid ${border.default}`,
      }}>
        <div style={{
          padding: "12px 0",
          width: 40,
          textAlign: "right",
          paddingRight: 8,
          color: text.hint,
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: "1.5",
          userSelect: "none",
          borderRight: `1px solid ${border.default}`,
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
            color: text.primary,
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: "1.5",
            resize: "none",
            overflow: "auto",
          }}
        />
      </div>

      {/* Results area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          padding: "6px 16px",
          borderBottom: `1px solid ${border.default}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Results
          </span>
          {result && !error && (
            <span style={{ fontSize: 9, color: text.faint, fontFamily: "'IBM Plex Mono', monospace" }}>
              {elapsed !== null && `${(elapsed / 1000).toFixed(2)}s`}
              {tableData && ` · ${tableData.rows.length} rows`}
            </span>
          )}
          {error && (
            <span style={{ fontSize: 9, color: palette.rose, fontFamily: "'IBM Plex Mono', monospace" }}>
              Error{elapsed !== null && ` · ${(elapsed / 1000).toFixed(2)}s`}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {formattedResult && (
            <div style={{ display: "flex", gap: 2 }}>
              {(["table", "raw"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setResultView(v)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 3,
                    border: `1px solid ${resultView === v ? border.default : "transparent"}`,
                    background: resultView === v ? "rgba(255,255,255,0.06)" : "transparent",
                    color: resultView === v ? text.muted : text.hint,
                    fontSize: 9,
                    fontFamily: "'IBM Plex Mono', monospace",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {isRunning && (
            <div style={{ padding: 32, textAlign: "center", color: text.faint, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
              Executing query…
            </div>
          )}

          {error && (
            <div style={{
              margin: 16,
              padding: 16,
              borderRadius: 8,
              background: palette.rose + "10",
              border: `1px solid ${palette.rose}33`,
            }}>
              <div style={{ fontSize: 11, color: palette.rose, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap" }}>
                {error}
              </div>
            </div>
          )}

          {!isRunning && !error && !result && (
            <div style={{ padding: 32, textAlign: "center", color: text.hint, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
              {onExecute
                ? "Write a query and press Ctrl+Enter to execute."
                : "GraphQL endpoint not connected."}
            </div>
          )}

          {formattedResult && resultView === "raw" && (
            <pre style={{
              margin: 0,
              padding: "12px 16px",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.muted,
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {formattedResult}
            </pre>
          )}

          {formattedResult && resultView === "table" && tableData && (
            <div style={{ padding: "8px 16px" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                <thead>
                  <tr>
                    {tableData.columns.map((col) => (
                      <th key={col} style={{
                        padding: "6px 10px",
                        textAlign: "left",
                        color: text.subtle,
                        fontWeight: 600,
                        borderBottom: `1px solid ${border.default}`,
                        whiteSpace: "nowrap",
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border.default}22` }}>
                      {tableData.columns.map((col) => (
                        <td key={col} style={{
                          padding: "5px 10px",
                          color: text.muted,
                          maxWidth: 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {formattedResult && resultView === "table" && !tableData && (
            <pre style={{
              margin: 0,
              padding: "12px 16px",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.muted,
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {formattedResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
