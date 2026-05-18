import { useState } from "react";
import type { SchemaField } from "../../utils/schema-validation";
import { text, border, surface, palette } from "../../theme";

interface SchemaIndexesSectionProps {
  indexes: string[];
  fields: SchemaField[];
  onAddIndex: (fieldName: string) => void;
  onRemoveIndex: (fieldName: string) => void;
}

const labelStyle = { fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: text.faint, letterSpacing: "0.1em", marginBottom: 8 };
const inputStyle = { padding: "5px 7px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none", cursor: "pointer" };

export function SchemaIndexesSection({ indexes, fields, onAddIndex, onRemoveIndex }: SchemaIndexesSectionProps) {
  const [selected, setSelected] = useState("");
  const indexableFields = fields.filter((f) => f.name.trim() && !indexes.includes(f.name));

  return (
    <div>
      <div style={labelStyle}>INDEXES</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {indexes.map((idx) => (
          <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: `${palette.blue}1a`, color: palette.blue, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
            {idx}
            <button onClick={() => onRemoveIndex(idx)}
              style={{ border: "none", background: "transparent", color: palette.blue, fontSize: 10, cursor: "pointer", padding: 0 }}>×</button>
          </span>
        ))}
        {indexes.length === 0 && (
          <span style={{ fontSize: 10, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>No indexes</span>
        )}
      </div>

      {indexableFields.length > 0 && (
        <div style={{ display: "flex", gap: 4 }}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            <option value="">Select field...</option>
            {indexableFields.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
          </select>
          <button onClick={() => { if (selected) { onAddIndex(selected); setSelected(""); } }} disabled={!selected}
            style={{ padding: "5px 10px", borderRadius: 4, border: `1px solid ${palette.blue}44`, background: `${palette.blue}1a`, color: !selected ? text.disabled : palette.blue, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Add
          </button>
        </div>
      )}

      <div style={{ fontSize: 9, color: text.hint, marginTop: 4 }}>Fields to index for faster lookups</div>
    </div>
  );
}
