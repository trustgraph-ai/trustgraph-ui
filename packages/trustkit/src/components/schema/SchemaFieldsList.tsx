import type { SchemaField } from "../../utils/schema-validation";
import { SchemaFieldEditor } from "./SchemaFieldEditor";
import { useTheme } from "../../theme/ThemeContext";
import { FormLabel } from "../common/FormLabel";

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

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <FormLabel marginBottom={0}>FIELDS ({fields.length})</FormLabel>
        <button onClick={onAdd}
          style={{ padding: "2px 8px", borderRadius: 3, border: `1px solid ${theme.palette.emerald}44`, background: `${theme.palette.emerald}1a`, color: theme.palette.emerald, fontSize: sz(9), fontFamily: theme.font.mono, fontWeight: 600, cursor: "pointer" }}>
          + Add Field
        </button>
      </div>
      {fields.map((field, i) => (
        <SchemaFieldEditor key={field.id} field={field} index={i} onChange={onChange} onRemove={onRemove} onAddEnumValue={onAddEnumValue} onRemoveEnumValue={onRemoveEnumValue} />
      ))}
      {fields.length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: theme.text.hint, fontSize: sz(10), fontFamily: theme.font.mono, fontStyle: "italic", border: `1px dashed ${theme.border.subtle}`, borderRadius: 6 }}>
          No fields — add one to get started
        </div>
      )}
    </div>
  );
}
