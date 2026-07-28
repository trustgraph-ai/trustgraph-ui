import type { SchemaField } from "../../utils/schema-validation";
import { SchemaFieldEditor } from "./SchemaFieldEditor";
import { useTheme } from "../../theme/ThemeContext";

interface SchemaFieldsListProps {
  fields: SchemaField[];
  onChange: (index: number, update: Partial<SchemaField>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onAddEnumValue: (index: number, value: string) => void;
  onRemoveEnumValue: (index: number, value: string) => void;
}

export function SchemaFieldsList({ fields, onChange, onRemove, onAdd, onAddEnumValue, onRemoveEnumValue }: SchemaFieldsListProps) {
  const { theme, sz } = useTheme();
  const labelStyle = { fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: theme.text.faint, letterSpacing: "0.1em", marginBottom: 8 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...labelStyle }}>
        <span>FIELDS ({fields.length})</span>
        <button onClick={onAdd}
          style={{ padding: "2px 8px", borderRadius: 3, border: `1px solid ${theme.palette.emerald}44`, background: `${theme.palette.emerald}1a`, color: theme.palette.emerald, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
          + Add Field
        </button>
      </div>
      {fields.map((field, i) => (
        <SchemaFieldEditor key={field.id} field={field} index={i} onChange={onChange} onRemove={onRemove} onAddEnumValue={onAddEnumValue} onRemoveEnumValue={onRemoveEnumValue} />
      ))}
      {fields.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: theme.text.hint, fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic", border: `1px dashed ${theme.border.subtle}`, borderRadius: 6 }}>
          No fields — add one to get started
        </div>
      )}
    </div>
  );
}
