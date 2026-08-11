import { useState } from "react";
import type { SchemaField } from "../../utils/schema-validation";
import { SCHEMA_TYPE_OPTIONS } from "../../utils/schema-validation";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";

interface SchemaFieldEditorProps {
  field: SchemaField;
  index: number;
  onChange: (index: number, update: Partial<SchemaField>) => void;
  onRemove: (index: number) => void;
  onAddEnumValue: (index: number, value: string) => void;
  onRemoveEnumValue: (index: number, value: string) => void;
}

export function SchemaFieldEditor({ field, index, onChange, onRemove, onAddEnumValue, onRemoveEnumValue }: SchemaFieldEditorProps) {
  const { theme, sz } = useTheme();
  const [enumInput, setEnumInput] = useState("");

  return (
    <div style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, border: `1px solid ${theme.border.subtle}`, background: theme.surface.card }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
        <Input value={field.name} onChange={(v) => onChange(index, { name: v })} placeholder="Field name"
          style={{ flex: 1 }} />
        <Select value={field.type} onChange={(v) => onChange(index, { type: v as SchemaField["type"] })}
          style={{ width: 100 }}>
          {SCHEMA_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </Select>
        <button onClick={() => onRemove(index)}
          style={{ padding: "3px 6px", border: "none", background: "transparent", color: theme.text.hint, fontSize: sz(11), cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.palette.red; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.text.hint; }}>
          ×
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={!!field.primary_key} onChange={(e) => onChange(index, { primary_key: e.target.checked })} />
          <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.secondary }}>Primary key</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={!!field.required} onChange={(e) => onChange(index, { required: e.target.checked })} />
          <span style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.secondary }}>Required</span>
        </label>
      </div>

      {field.type === "enum" && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            {(field.enum || []).map((val) => (
              <span key={val} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: 3, background: `${theme.palette.purple}1a`, color: theme.palette.purple, fontSize: sz(9), fontFamily: theme.font.mono }}>
                {val}
                <button onClick={() => onRemoveEnumValue(index, val)}
                  style={{ border: "none", background: "transparent", color: theme.palette.purple, fontSize: sz(9), cursor: "pointer", padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <Input value={enumInput} onChange={setEnumInput}
              onSubmit={() => { if (enumInput.trim()) { onAddEnumValue(index, enumInput); setEnumInput(""); } }}
              placeholder="Add enum value" style={{ flex: 1 }} />
            <Button size="sm" onClick={() => { if (enumInput.trim()) { onAddEnumValue(index, enumInput); setEnumInput(""); } }}
              color={theme.palette.purple}>
              +
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
