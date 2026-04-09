import { useState, useEffect } from "react";
import type { PromptData } from "../../hooks/usePromptDetail";
import { text, border, surface, palette } from "../../theme";

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

  // Reset when data changes (different prompt selected)
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

  const isDirty =
    promptText !== data.prompt ||
    responseType !== data.responseType;

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
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: text.faint,
          letterSpacing: "0.1em",
        }}>
          TEMPLATE
        </div>

        {!readOnly && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saveError && (
              <span style={{ fontSize: 11, color: palette.red }}>{saveError}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: `1px solid ${isDirty ? palette.emerald + "44" : border.default}`,
                background: isDirty ? `${palette.emerald}1a` : "transparent",
                color: isDirty ? palette.emerald : text.faint,
                fontSize: 11,
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
          border: `1px solid ${border.default}`,
          background: surface.card,
          color: text.primary,
          fontSize: 12,
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
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.faint,
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
              border: `1px solid ${responseType === rt ? palette.cyan + "44" : border.default}`,
              background: responseType === rt ? `${palette.cyan}1a` : "transparent",
              color: responseType === rt ? palette.cyan : text.subtle,
              fontSize: 10,
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
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.faint,
              letterSpacing: "0.1em",
            }}>
              {responseType === "json" ? "RESPONSE SCHEMA" : "OBJECT SCHEMA"}
            </span>
            {schemaError && (
              <span style={{ fontSize: 10, color: palette.red }}>{schemaError}</span>
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
              border: `1px solid ${schemaError ? palette.red + "44" : border.default}`,
              background: surface.card,
              color: text.secondary,
              fontSize: 11,
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
