import { useState } from "react";
import type { SchemaField } from "../../utils/schema-validation";
import { text, border, surface, palette } from "../../theme";

interface IndexGroupProps {
  label: string;
  color: string;
  indexes: string[];
  fields: SchemaField[];
  onAdd: (fieldName: string) => void;
  onRemove: (fieldName: string) => void;
}

const labelStyle = { fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: text.faint, letterSpacing: "0.1em", marginBottom: 8 };
const inputStyle = { padding: "5px 7px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none", cursor: "pointer" };

function IndexGroup({ label, color, indexes, fields, onAdd, onRemove }: IndexGroupProps) {
  const [selected, setSelected] = useState("");
  const indexableFields = fields.filter((f) => f.name.trim() && !indexes.includes(f.name));

  return (
    <div>
      <div style={labelStyle}>{label}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {indexes.map((idx) => (
          <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: `${color}1a`, color, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
            {idx}
            <button onClick={() => onRemove(idx)}
              style={{ border: "none", background: "transparent", color, fontSize: 10, cursor: "pointer", padding: 0 }}>×</button>
          </span>
        ))}
        {indexes.length === 0 && (
          <span style={{ fontSize: 10, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>None</span>
        )}
      </div>

      {indexableFields.length > 0 && (
        <div style={{ display: "flex", gap: 4 }}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            <option value="">Select field...</option>
            {indexableFields.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
          </select>
          <button onClick={() => { if (selected) { onAdd(selected); setSelected(""); } }} disabled={!selected}
            style={{ padding: "5px 10px", borderRadius: 4, border: `1px solid ${color}44`, background: `${color}1a`, color: !selected ? text.disabled : color, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Add
          </button>
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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <IndexGroup label="QUERY INDEXES" color={palette.blue} indexes={queryIndexes} fields={fields} onAdd={onAddQueryIndex} onRemove={onRemoveQueryIndex} />
      <IndexGroup label="VECTOR INDEXES" color={palette.purple} indexes={vectorIndexes} fields={fields} onAdd={onAddVectorIndex} onRemove={onRemoveVectorIndex} />
    </div>
  );
}
