import { useState } from "react";
import type { SchemaField } from "../../utils/schema-validation";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { Select } from "../common/Select";
import { FormLabel } from "../common/FormLabel";

interface IndexGroupProps {
  label: string;
  color: string;
  indexes: string[];
  fields: SchemaField[];
  onAdd: (fieldName: string) => void;
  onRemove: (fieldName: string) => void;
}

function IndexGroup({ label, color, indexes, fields, onAdd, onRemove }: IndexGroupProps) {
  const { theme, sz } = useTheme();
  const [selected, setSelected] = useState("");
  const indexableFields = fields.filter((f) => f.name.trim() && !indexes.includes(f.name));

  return (
    <div>
      <FormLabel marginBottom={8}>{label}</FormLabel>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {indexes.map((idx) => (
          <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: `${color}1a`, color, fontSize: sz(10), fontFamily: theme.font.mono }}>
            {idx}
            <button onClick={() => onRemove(idx)}
              style={{ border: "none", background: "transparent", color, fontSize: sz(10), cursor: "pointer", padding: 0 }}>×</button>
          </span>
        ))}
        {indexes.length === 0 && (
          <span style={{ fontSize: sz(10), color: theme.text.hint, fontFamily: theme.font.mono, fontStyle: "italic" }}>None</span>
        )}
      </div>

      {indexableFields.length > 0 && (
        <div style={{ display: "flex", gap: 4 }}>
          <Select value={selected} onChange={setSelected} style={{ flex: 1 }}>
            <option value="">Select field...</option>
            {indexableFields.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
          </Select>
          <Button size="md" onClick={() => { if (selected) { onAdd(selected); setSelected(""); } }}
            disabled={!selected} color={color}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

interface SchemaIndexesSectionProps {
  queryIndexes: string[];
  vectorIndexes: string[];
  fields: SchemaField[];
  onAddQueryIndex: (fieldName: string) => void;
  onRemoveQueryIndex: (fieldName: string) => void;
  onAddVectorIndex: (fieldName: string) => void;
  onRemoveVectorIndex: (fieldName: string) => void;
}

export function SchemaIndexesSection({ queryIndexes, vectorIndexes, fields, onAddQueryIndex, onRemoveQueryIndex, onAddVectorIndex, onRemoveVectorIndex }: SchemaIndexesSectionProps) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <IndexGroup label="QUERY INDEXES" color={theme.palette.blue} indexes={queryIndexes} fields={fields} onAdd={onAddQueryIndex} onRemove={onRemoveQueryIndex} />
      <IndexGroup label="VECTOR INDEXES" color={theme.palette.purple} indexes={vectorIndexes} fields={fields} onAdd={onAddVectorIndex} onRemove={onRemoveVectorIndex} />
    </div>
  );
}
