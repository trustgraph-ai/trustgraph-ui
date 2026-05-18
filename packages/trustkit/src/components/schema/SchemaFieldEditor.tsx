import { useState } from "react";
import type { SchemaField } from "../../utils/schema-validation";
import { SCHEMA_TYPE_OPTIONS } from "../../utils/schema-validation";
import { text, border, surface, palette } from "../../theme";

interface SchemaFieldEditorProps {
  field: SchemaField;
  index: number;
  onChange: (index: number, update: Partial<SchemaField>) => void;
  onRemove: (index: number) => void;
  onAddEnumValue: (index: number, value: string) => void;
  onRemoveEnumValue: (index: number, value: string) => void;
}

const inputStyle = { padding: "5px 7px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none" };

export function SchemaFieldEditor({ field, index, onChange, onRemove, onAddEnumValue, onRemoveEnumValue }: SchemaFieldEditorProps) {
  const [enumInput, setEnumInput] = useState("");

  return (
    <div style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, border: `1px solid ${border.subtle}`, background: surface.card }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
        <input type="text" value={field.name} onChange={(e) => onChange(index, { name: e.target.value })} placeholder="Field name"
          style={{ ...inputStyle, flex: 1 }} />
        <select value={field.type} onChange={(e) => onChange(index, { type: e.target.value as SchemaField["type"] })}
          style={{ ...inputStyle, cursor: "pointer", width: 100 }}>
          {SCHEMA_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button onClick={() => onRemove(index)}
          style={{ padding: "3px 6px", border: "none", background: "transparent", color: text.hint, fontSize: 11, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = palette.red; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = text.hint; }}>
          ×
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={!!field.primary_key} onChange={(e) => onChange(index, { primary_key: e.target.checked })} />
          <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: text.secondary }}>Primary key</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={!!field.required} onChange={(e) => onChange(index, { required: e.target.checked })} />
          <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: text.secondary }}>Required</span>
        </label>
      </div>

      {field.type === "enum" && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            {(field.enum || []).map((val) => (
              <span key={val} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 3, background: `${palette.purple}1a`, color: palette.purple, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                {val}
                <button onClick={() => onRemoveEnumValue(index, val)}
                  style={{ border: "none", background: "transparent", color: palette.purple, fontSize: 9, cursor: "pointer", padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input type="text" value={enumInput} onChange={(e) => setEnumInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && enumInput.trim()) { onAddEnumValue(index, enumInput); setEnumInput(""); } }}
              placeholder="Add enum value" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => { if (enumInput.trim()) { onAddEnumValue(index, enumInput); setEnumInput(""); } }}
              style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${palette.purple}44`, background: `${palette.purple}1a`, color: palette.purple, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
