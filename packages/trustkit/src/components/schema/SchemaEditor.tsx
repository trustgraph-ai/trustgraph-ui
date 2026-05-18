import type { Schema, SchemaTableRow } from "../../utils/schema-validation";
import { validateSchema } from "../../utils/schema-validation";
import { useSchemaForm } from "./useSchemaForm";
import { SchemaBasicInfo } from "./SchemaBasicInfo";
import { SchemaFieldsList } from "./SchemaFieldsList";
import { SchemaIndexesSection } from "./SchemaIndexesSection";
import { SchemaValidationErrors } from "./SchemaValidationErrors";
import { text, border, palette } from "../../theme";

interface SchemaEditorProps {
  schemaId: string;
  schema: Schema;
  existingSchemas: SchemaTableRow[];
  onSave: (id: string, schema: Schema) => void;
  onDelete: (id: string) => void;
}

export function SchemaEditor({ schemaId, schema, existingSchemas, onSave, onDelete }: SchemaEditorProps) {
  const form = useSchemaForm({ schemaId, initialSchema: schema });

  const handleSave = () => {
    const built = form.getSchema();
    const errs = validateSchema(built, existingSchemas);
    form.setErrors(errs);
    if (errs.length === 0) onSave(schemaId, built);
  };

  const isDirty = form.name !== (schema.name || "") || form.description !== (schema.description || "") ||
    JSON.stringify(form.fields) !== JSON.stringify(schema.fields) ||
    JSON.stringify(form.indexes) !== JSON.stringify(schema.indexes || []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: text.primary, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{form.name || schemaId}</div>
          <div style={{ fontSize: 10, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{schemaId}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <button onClick={handleSave}
              style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${palette.emerald}44`, background: `${palette.emerald}1a`, color: palette.emerald, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
              Save
            </button>
          )}
          <button onClick={() => { if (window.confirm(`Delete schema "${form.name || schemaId}"?`)) onDelete(schemaId); }}
            style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${palette.red}44`, background: "transparent", color: palette.red, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>

      <SchemaValidationErrors errors={form.errors} />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 600 }}>
          <SchemaBasicInfo id={schemaId} name={form.name} description={form.description}
            onNameChange={form.setName} onDescriptionChange={form.setDescription} />

          <div style={{ borderTop: `1px solid ${border.subtle}`, margin: "8px 0 16px" }} />

          <SchemaFieldsList fields={form.fields} onChange={form.handleFieldChange} onRemove={form.handleRemoveField} onAdd={form.handleAddField}
            onAddEnumValue={form.handleAddEnumValue} onRemoveEnumValue={form.handleRemoveEnumValue} />

          <div style={{ borderTop: `1px solid ${border.subtle}`, margin: "16px 0" }} />

          <SchemaIndexesSection indexes={form.indexes} fields={form.fields} onAddIndex={form.handleAddIndex} onRemoveIndex={form.handleRemoveIndex} />
        </div>
      </div>
    </div>
  );
}
