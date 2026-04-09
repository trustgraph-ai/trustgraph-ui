import { useState, useCallback } from "react";
import type { PromptTestResult } from "../../hooks/usePromptTest";
import { text, border, surface, palette } from "../../theme";

interface PromptTestPanelProps {
  promptId: string;
  templateText: string;
  result: PromptTestResult;
  onRun: (promptId: string, variables: Record<string, unknown>) => void;
  onReset: () => void;
}

// Extract variable names from Jinja template for hints
function extractVariableHints(template: string): string[] {
  const vars = new Set<string>();

  // {{ variable }} or {{ variable.something }}
  const simpleRe = /\{\{\s*([a-zA-Z_]\w*)(?:\.\w+)*\s*\}\}/g;
  let match;
  while ((match = simpleRe.exec(template)) !== null) {
    vars.add(match[1]);
  }

  // {% for x in variable %}
  const forRe = /\{%\s*for\s+\w+\s+in\s+(\w+)/g;
  while ((match = forRe.exec(template)) !== null) {
    vars.add(match[1]);
  }

  // {% if variable %}
  const ifRe = /\{%\s*if\s+(\w+)/g;
  while ((match = ifRe.exec(template)) !== null) {
    vars.add(match[1]);
  }

  return Array.from(vars).sort();
}

export function PromptTestPanel({
  promptId,
  templateText,
  result,
  onRun,
  onReset,
}: PromptTestPanelProps) {
  const [variablesJson, setVariablesJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const hints = extractVariableHints(templateText);

  const handleRun = useCallback(() => {
    try {
      const parsed = JSON.parse(variablesJson);
      setJsonError(null);
      onRun(promptId, parsed);
    } catch {
      setJsonError("Invalid JSON");
    }
  }, [variablesJson, promptId, onRun]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      {/* Header */}
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        color: text.faint,
        letterSpacing: "0.1em",
        marginBottom: 12,
      }}>
        TEST
      </div>

      {/* Variable hints */}
      {hints.length > 0 && (
        <div style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: text.hint,
          }}>
            variables:
          </span>
          {hints.map(v => (
            <span
              key={v}
              style={{
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                color: palette.amber,
                padding: "1px 6px",
                borderRadius: 3,
                background: `${palette.amber}15`,
                border: `1px solid ${palette.amber}22`,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Variables JSON editor */}
      <div style={{ marginBottom: 12 }}>
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
            border: `1px solid ${jsonError ? palette.red + "44" : border.default}`,
            background: surface.card,
            color: text.primary,
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1.5,
            resize: "vertical",
            outline: "none",
          }}
        />
        {jsonError && (
          <div style={{ fontSize: 10, color: palette.red, marginTop: 4 }}>{jsonError}</div>
        )}
      </div>

      {/* Run / Reset buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleRun}
          disabled={result.isStreaming}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: `1px solid ${palette.emerald}44`,
            background: result.isStreaming ? "transparent" : `${palette.emerald}1a`,
            color: result.isStreaming ? text.disabled : palette.emerald,
            fontSize: 11,
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
              border: `1px solid ${border.default}`,
              background: "transparent",
              color: text.faint,
              fontSize: 11,
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
        border: `1px solid ${border.default}`,
        background: surface.card,
        minHeight: 120,
      }}>
        {result.error && (
          <div style={{
            fontSize: 12,
            color: palette.red,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Error: {result.error}
          </div>
        )}

        {result.response && (
          <pre style={{
            margin: 0,
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            color: text.primary,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {result.response}
            {result.isStreaming && (
              <span style={{ color: palette.cyan, opacity: 0.6 }}>▌</span>
            )}
          </pre>
        )}

        {!result.response && !result.error && !result.isStreaming && (
          <div style={{
            fontSize: 12,
            color: text.hint,
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
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.subtle,
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
