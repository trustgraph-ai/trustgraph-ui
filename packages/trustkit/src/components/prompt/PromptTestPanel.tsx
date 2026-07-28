import { useState, useCallback, useMemo } from "react";
import type { PromptTestResult } from "../../hooks/usePromptTest";
import { useTheme } from "../../theme/ThemeContext";

type InputMode = "json" | "fields";

interface PromptTestPanelProps {
  promptId: string;
  templateText: string;
  result: PromptTestResult;
  onRun: (promptId: string, variables: Record<string, unknown>) => void;
  onReset: () => void;
}

function extractVariableHints(template: string): string[] {
  const vars = new Set<string>();
  const internal = new Set<string>();

  const forRe = /\{%-?\s*for\s+([\w,\s]+?)\s+in\s+(\w+)/g;
  let match;
  while ((match = forRe.exec(template)) !== null) {
    for (const name of match[1].split(",")) {
      const trimmed = name.trim();
      if (trimmed) internal.add(trimmed);
    }
    vars.add(match[2]);
  }

  const exprRe = /\{\{-?\s*([a-zA-Z_]\w*)/g;
  while ((match = exprRe.exec(template)) !== null) {
    vars.add(match[1]);
  }

  const ifRe = /\{%-?\s*(?:if|elif)\s+(\w+)/g;
  while ((match = ifRe.exec(template)) !== null) {
    vars.add(match[1]);
  }

  for (const v of internal) vars.delete(v);
  vars.delete("true");
  vars.delete("false");
  vars.delete("none");
  vars.delete("loop");

  return Array.from(vars).sort();
}

export function PromptTestPanel({
  promptId,
  templateText,
  result,
  onRun,
  onReset,
}: PromptTestPanelProps) {
  const { theme, sz } = useTheme();
  const [variablesJson, setVariablesJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("fields");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const hints = useMemo(() => extractVariableHints(templateText), [templateText]);

  const updateField = useCallback((name: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleRun = useCallback(() => {
    if (inputMode === "json") {
      try {
        const parsed = JSON.parse(variablesJson);
        setJsonError(null);
        onRun(promptId, parsed);
      } catch {
        setJsonError("Invalid JSON");
      }
    } else {
      const vars: Record<string, unknown> = {};
      for (const key of hints) {
        const raw = fieldValues[key] ?? "";
        if (raw.startsWith("[") || raw.startsWith("{")) {
          try { vars[key] = JSON.parse(raw); continue; } catch { /* use as string */ }
        }
        vars[key] = raw;
      }
      onRun(promptId, vars);
    }
  }, [inputMode, variablesJson, fieldValues, hints, promptId, onRun]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      {/* Header */}
      <div style={{
        fontSize: sz(10),
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        color: theme.text.faint,
        letterSpacing: "0.1em",
        marginBottom: 12,
      }}>
        TEST
      </div>

      {/* Input mode toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {(["fields", "json"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setInputMode(mode)}
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              fontSize: sz(10),
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              cursor: "pointer",
              background: inputMode === mode ? theme.surface.cardHover : "transparent",
              border: `1px solid ${inputMode === mode ? theme.border.default : "transparent"}`,
              color: inputMode === mode ? theme.text.muted : theme.text.hint,
              textTransform: "capitalize",
            }}
          >
            {mode === "fields" ? "Fields" : "JSON"}
          </button>
        ))}
      </div>

      {/* Fields input */}
      {inputMode === "fields" && (
        <div style={{ marginBottom: 12 }}>
          {hints.length === 0 ? (
            <div style={{ fontSize: sz(11), color: theme.text.hint, fontStyle: "italic", padding: "8px 0" }}>
              No variables detected in template.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {hints.map(name => (
                <div key={name}>
                  <label style={{
                    display: "block",
                    fontSize: sz(10),
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: theme.palette.amber,
                    marginBottom: 4,
                  }}>
                    {name}
                  </label>
                  <textarea
                    value={fieldValues[name] ?? ""}
                    onChange={(e) => updateField(name, e.target.value)}
                    spellCheck={false}
                    rows={1}
                    placeholder={`Value for ${name}...`}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: `1px solid ${theme.border.default}`,
                      background: theme.surface.card,
                      color: theme.text.primary,
                      fontSize: sz(12),
                      fontFamily: "'IBM Plex Mono', monospace",
                      lineHeight: 1.5,
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Variables JSON editor */}
      {inputMode === "json" && (
        <div style={{ marginBottom: 12 }}>
          {hints.length > 0 && (
            <div style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: sz(10),
                fontFamily: "'IBM Plex Mono', monospace",
                color: theme.text.hint,
              }}>
                variables:
              </span>
              {hints.map(v => (
                <span
                  key={v}
                  style={{
                    fontSize: sz(10),
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: theme.palette.amber,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: `${theme.palette.amber}15`,
                    border: `1px solid ${theme.palette.amber}22`,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          )}
          <textarea
            value={variablesJson}
            onChange={(e) => { setVariablesJson(e.target.value); setJsonError(null); }}
            spellCheck={false}
            placeholder='{"variable": "value"}'
            style={{
              width: "100%",
              height: 100,
              padding: 10,
              borderRadius: 6,
              border: `1px solid ${jsonError ? theme.palette.red + "44" : theme.border.default}`,
              background: theme.surface.card,
              color: theme.text.primary,
              fontSize: sz(12),
              fontFamily: "'IBM Plex Mono', monospace",
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
            }}
          />
          {jsonError && (
            <div style={{ fontSize: sz(10), color: theme.palette.red, marginTop: 4 }}>{jsonError}</div>
          )}
        </div>
      )}

      {/* Run / Reset buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleRun}
          disabled={result.isStreaming}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: `1px solid ${theme.palette.emerald}44`,
            background: result.isStreaming ? "transparent" : `${theme.palette.emerald}1a`,
            color: result.isStreaming ? theme.text.disabled : theme.palette.emerald,
            fontSize: sz(11),
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            cursor: result.isStreaming ? "wait" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {result.isStreaming ? "Running..." : "Run"}
        </button>

        {(result.response || result.error) && (
          <button
            onClick={onReset}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${theme.border.default}`,
              background: "transparent",
              color: theme.text.faint,
              fontSize: sz(11),
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Response */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: 14,
        borderRadius: 8,
        border: `1px solid ${theme.border.default}`,
        background: theme.surface.card,
        minHeight: 120,
      }}>
        {result.error && (
          <div style={{
            fontSize: sz(12),
            color: theme.palette.red,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Error: {result.error}
          </div>
        )}

        {result.response && (
          <pre style={{
            margin: 0,
            fontSize: sz(12),
            fontFamily: "'IBM Plex Mono', monospace",
            color: theme.text.primary,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {result.response}
            {result.isStreaming && (
              <span style={{ color: theme.palette.cyan, opacity: 0.6 }}>▌</span>
            )}
          </pre>
        )}

        {!result.response && !result.error && !result.isStreaming && (
          <div style={{
            fontSize: sz(12),
            color: theme.text.hint,
            fontStyle: "italic",
          }}>
            Enter variables and click Run to test this prompt
          </div>
        )}
      </div>

      {/* Token counts */}
      {result.isComplete && (result.inTokens || result.outTokens) && (
        <div style={{
          display: "flex",
          gap: 16,
          marginTop: 10,
          fontSize: sz(10),
          fontFamily: "'IBM Plex Mono', monospace",
          color: theme.text.subtle,
        }}>
          {result.inTokens && (
            <span>in: {result.inTokens.toLocaleString()} tokens</span>
          )}
          {result.outTokens && (
            <span>out: {result.outTokens.toLocaleString()} tokens</span>
          )}
          {result.model && (
            <span>model: {result.model}</span>
          )}
        </div>
      )}
    </div>
  );
}
