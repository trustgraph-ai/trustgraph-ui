import { useState, useCallback, useRef, useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { SectionLabel } from "../common";
import { Button } from "../common/Button";
import { SelectableListItem } from "../common/SelectableListItem";

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
  const { theme, sz } = useTheme();
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
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <SectionLabel>GRAPHQL QUERY</SectionLabel>

        <div style={{ position: "relative" }}>
          <Button size="md" active={false}
            onClick={() => { setShowExamples(!showExamples); setShowPresets(false); }}
            style={{ padding: "4px 10px" }}>
            Examples
          </Button>
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
                <SelectableListItem key={i} isSelected={false}
                  onClick={() => { setQuery(ex.query); setShowExamples(false); }}
                  style={{ padding: "6px 10px", marginBottom: 0, borderRadius: 4, color: theme.text.muted }}>
                  {ex.label}
                </SelectableListItem>
              ))}
            </div>
          )}
        </div>

        {presets && presets.length > 0 && (
          <div style={{ position: "relative" }}>
            <Button size="md" active={false}
              onClick={() => { setShowPresets(!showPresets); setShowExamples(false); }}
              style={{ padding: "4px 10px" }}>
              Presets
            </Button>
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
                  <SelectableListItem key={p.key} isSelected={false}
                    onClick={() => { setQuery(p.query); setShowPresets(false); }}
                    style={{ padding: "6px 10px", marginBottom: 0, borderRadius: 4, color: theme.text.muted }}>
                    {p.title}
                  </SelectableListItem>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <Button size="md" active={false}
          onClick={() => { setQuery(""); setResult(null); setError(null); setElapsed(null); }}
          style={{ padding: "4px 10px" }}>
          Clear
        </Button>

        <Button size="md" onClick={execute} disabled={isRunning || !onExecute}
          color={theme.palette.emerald} active={!!onExecute}
          style={{ padding: "4px 14px" }}>
          {isRunning ? "Running…" : "Execute"}
          <span style={{ marginLeft: 6, opacity: 0.5, fontWeight: 400 }}>Ctrl+Enter</span>
        </Button>
      </div>

      {/* Editor */}
      <div style={{
        flex: "0 0 auto",
        maxHeight: "40%",
        minHeight: 120,
        display: "flex",
        borderBottom: `1px solid ${theme.border.default}`,
      }}>
        <div style={{
          padding: "12px 0",
          width: 40,
          textAlign: "right",
          paddingRight: 8,
          color: theme.text.hint,
          fontSize: sz(11),
          fontFamily: theme.font.mono,
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
            fontFamily: theme.font.mono,
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
          borderBottom: `1px solid ${theme.border.default}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: sz(9), color: theme.text.hint, fontFamily: theme.font.mono, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Results
          </span>
          {result && !error && (
            <span style={{ fontSize: sz(9), color: theme.text.faint, fontFamily: theme.font.mono }}>
              {elapsed !== null && `${(elapsed / 1000).toFixed(2)}s`}
              {tableData && ` · ${tableData.rows.length} rows`}
            </span>
          )}
          {error && (
            <span style={{ fontSize: sz(9), color: theme.palette.rose, fontFamily: theme.font.mono }}>
              Error{elapsed !== null && ` · ${(elapsed / 1000).toFixed(2)}s`}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {formattedResult && (
            <div style={{ display: "flex", gap: 2 }}>
              {(["table", "raw"] as const).map((v) => (
                <Button key={v} size="sm"
                  onClick={() => setResultView(v)}
                  active={resultView === v}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 3,
                    border: `1px solid ${resultView === v ? theme.border.default : "transparent"}`,
                    background: resultView === v ? theme.surface.cardHover : "transparent",
                    color: resultView === v ? theme.text.muted : theme.text.hint,
                    textTransform: "capitalize",
                  }}>
                  {v}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {isRunning && (
            <div style={{ padding: 32, textAlign: "center", color: theme.text.faint, fontSize: sz(12), fontFamily: theme.font.mono }}>
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
              <div style={{ fontSize: sz(11), color: theme.palette.rose, fontFamily: theme.font.mono, whiteSpace: "pre-wrap" }}>
                {error}
              </div>
            </div>
          )}

          {!isRunning && !error && !result && (
            <div style={{ padding: 32, textAlign: "center", color: theme.text.hint, fontSize: sz(11), fontFamily: theme.font.mono }}>
              {onExecute
                ? "Write a query and press Ctrl+Enter to execute."
                : "GraphQL endpoint not connected."}
            </div>
          )}

          {formattedResult && resultView === "raw" && (
            <pre style={{
              margin: 0,
              padding: "12px 16px",
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              color: theme.text.muted,
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
                fontSize: sz(11),
                fontFamily: theme.font.mono,
              }}>
                <thead>
                  <tr>
                    {tableData.columns.map((col) => (
                      <th key={col} style={{
                        padding: "6px 10px",
                        textAlign: "left",
                        color: theme.text.subtle,
                        fontWeight: 600,
                        borderBottom: `1px solid ${theme.border.default}`,
                        whiteSpace: "nowrap",
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${theme.border.subtle}` }}>
                      {tableData.columns.map((col) => (
                        <td key={col} style={{
                          padding: "5px 10px",
                          color: theme.text.muted,
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
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              color: theme.text.muted,
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
