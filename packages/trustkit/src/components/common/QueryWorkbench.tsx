import { useState, useCallback, useRef, useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { SectionLabel } from "./SectionLabel";
import { Button } from "./Button";
import { SelectableListItem } from "./SelectableListItem";

export interface QueryExample {
  label: string;
  query: string;
}

export interface QueryPresetItem {
  key: string;
  title: string;
  description: string;
  query: string;
}

export interface QueryWorkbenchProps<TResult> {
  language: string;
  defaultQuery: string;
  examples: QueryExample[];
  presets?: QueryPresetItem[];
  onExecute?: (query: string) => Promise<TResult>;
  renderResults: (result: TResult, elapsed: number | null, theme: ReturnType<typeof useTheme>) => React.ReactNode;
  renderResultsHeader?: (result: TResult, elapsed: number | null) => React.ReactNode;
  processResponse?: (result: TResult) => { error?: string };
  notConnectedMessage?: string;
}

export function QueryWorkbench<TResult>({
  language,
  defaultQuery,
  examples,
  presets,
  onExecute,
  renderResults,
  renderResultsHeader,
  processResponse,
  notConnectedMessage,
}: QueryWorkbenchProps<TResult>) {
  const themeCtx = useTheme();
  const { theme, sz } = themeCtx;
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState<TResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const execute = useCallback(async () => {
    if (!onExecute) {
      setError(notConnectedMessage || `${language} endpoint not connected`);
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
      if (processResponse) {
        const { error: resError } = processResponse(res);
        if (resError) setError(resError);
      }
      setResult(res);
    } catch (err) {
      setElapsed(performance.now() - t0);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [query, onExecute, processResponse, notConnectedMessage, language]);

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

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    background: theme.surface.overlay,
    border: `1px solid ${theme.border.default}`,
    borderRadius: 6,
    padding: 4,
    zIndex: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
  };

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
        <SectionLabel>{language} QUERY</SectionLabel>

        <div style={{ position: "relative" }}>
          <Button size="md" active={false}
            onClick={() => { setShowExamples(!showExamples); setShowPresets(false); }}
            style={{ padding: "4px 10px" }}>
            Examples
          </Button>
          {showExamples && (
            <div style={{ ...dropdownStyle, minWidth: 180 }}>
              {examples.map((ex, i) => (
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
              <div style={{ ...dropdownStyle, minWidth: 260 }}>
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
          {error && (
            <span style={{ fontSize: sz(9), color: theme.palette.rose, fontFamily: theme.font.mono }}>
              Error{elapsed !== null && ` · ${(elapsed / 1000).toFixed(2)}s`}
            </span>
          )}
          {result && !error && renderResultsHeader?.(result, elapsed)}
          {result && !error && !renderResultsHeader && elapsed !== null && (
            <span style={{ fontSize: sz(9), color: theme.text.faint, fontFamily: theme.font.mono }}>
              {(elapsed / 1000).toFixed(2)}s
            </span>
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
                : (notConnectedMessage || `${language} endpoint not connected.`)}
            </div>
          )}

          {result && renderResults(result, elapsed, themeCtx)}
        </div>
      </div>
    </div>
  );
}
