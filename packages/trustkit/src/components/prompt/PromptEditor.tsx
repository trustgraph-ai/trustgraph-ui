import { useState, useEffect } from "react";
import type { PromptData } from "../../hooks/usePromptDetail";
import { useTheme } from "../../theme/ThemeContext";

interface PromptEditorProps {
  data: PromptData;
  onSave: (updated: PromptData) => void;
  isSaving?: boolean;
  saveError?: string | null;
  readOnly?: boolean;
}

export function PromptEditor({
  data,
  onSave,
  isSaving,
  saveError,
  readOnly,
}: PromptEditorProps) {
  const { theme, sz } = useTheme();
  const [promptText, setPromptText] = useState(data.prompt);
  const [responseType, setResponseType] = useState(data.responseType);
  const [schemaText, setSchemaText] = useState(
    data.responseType === "json" && data.schema
      ? JSON.stringify(data.schema, null, 2)
      : data.responseType === "jsonl" && data.objectSchema
      ? JSON.stringify(data.objectSchema, null, 2)
      : ""
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    setPromptText(data.prompt);
    setResponseType(data.responseType);
    setSchemaText(
      data.responseType === "json" && data.schema
        ? JSON.stringify(data.schema, null, 2)
        : data.responseType === "jsonl" && data.objectSchema
        ? JSON.stringify(data.objectSchema, null, 2)
        : ""
    );
    setSchemaError(null);
  }, [data]);

  const originalSchema =
    data.responseType === "json" && data.schema
      ? JSON.stringify(data.schema, null, 2)
      : data.responseType === "jsonl" && data.objectSchema
      ? JSON.stringify(data.objectSchema, null, 2)
      : "";

  const isDirty =
    promptText !== data.prompt ||
    responseType !== data.responseType ||
    schemaText !== originalSchema;

  const handleSave = () => {
    let schema: object | undefined;
    let objectSchema: object | undefined;

    if ((responseType === "json" || responseType === "jsonl") && schemaText.trim()) {
      try {
        const parsed = JSON.parse(schemaText);
        if (responseType === "json") schema = parsed;
        else objectSchema = parsed;
        setSchemaError(null);
      } catch {
        setSchemaError("Invalid JSON schema");
        return;
      }
    }

    onSave({
      prompt: promptText,
      responseType,
      schema,
      objectSchema,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: sz(10),
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: theme.text.faint,
          letterSpacing: "0.1em",
        }}>
          TEMPLATE
        </div>

        {!readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saveError && (
              <span style={{ fontSize: sz(11), color: theme.palette.red }}>{saveError}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: `1px solid ${isDirty ? theme.palette.emerald + "44" : theme.border.default}`,
                background: isDirty ? `${theme.palette.emerald}1a` : "transparent",
                color: isDirty ? theme.palette.emerald : theme.text.faint,
                fontSize: sz(11),
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                cursor: isSaving ? "wait" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Prompt template editor */}
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          flex: 1,
          minHeight: 200,
          padding: 14,
          borderRadius: 8,
          border: `1px solid ${theme.border.default}`,
          background: theme.surface.card,
          color: theme.text.primary,
          fontSize: sz(12),
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: 1.6,
          resize: "none",
          outline: "none",
          tabSize: 2,
        }}
      />

      {/* Response type selector */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
      }}>
        <span style={{
          fontSize: sz(10),
          fontFamily: "'IBM Plex Mono', monospace",
          color: theme.text.faint,
          letterSpacing: "0.1em",
        }}>
          RESPONSE TYPE
        </span>
        {(["text", "json", "jsonl"] as const).map(rt => (
          <button
            key={rt}
            onClick={() => !readOnly && setResponseType(rt)}
            disabled={readOnly}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: `1px solid ${responseType === rt ? theme.palette.cyan + "44" : theme.border.default}`,
              background: responseType === rt ? `${theme.palette.cyan}1a` : "transparent",
              color: responseType === rt ? theme.palette.cyan : theme.text.subtle,
              fontSize: sz(10),
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: readOnly ? "default" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {rt}
          </button>
        ))}
      </div>

      {/* Schema editor (json/jsonl only) */}
      {(responseType === "json" || responseType === "jsonl") && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}>
            <span style={{
              fontSize: sz(10),
              fontFamily: "'IBM Plex Mono', monospace",
              color: theme.text.faint,
              letterSpacing: "0.1em",
            }}>
              {responseType === "json" ? "RESPONSE SCHEMA" : "OBJECT SCHEMA"}
            </span>
            {schemaError && (
              <span style={{ fontSize: sz(10), color: theme.palette.red }}>{schemaError}</span>
            )}
          </div>
          <textarea
            value={schemaText}
            onChange={(e) => { setSchemaText(e.target.value); setSchemaError(null); }}
            readOnly={readOnly}
            spellCheck={false}
            placeholder="JSON Schema..."
            style={{
              width: "100%",
              height: 120,
              padding: 10,
              borderRadius: 6,
              border: `1px solid ${schemaError ? theme.palette.red + "44" : theme.border.default}`,
              background: theme.surface.card,
              color: theme.text.secondary,
              fontSize: sz(11),
              fontFamily: "'IBM Plex Mono', monospace",
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
