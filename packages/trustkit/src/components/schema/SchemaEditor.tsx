import type { Schema, SchemaTableRow } from "../../utils/schema-validation";
import { validateSchema } from "../../utils/schema-validation";
import { useSchemaForm } from "./useSchemaForm";
import { SchemaBasicInfo } from "./SchemaBasicInfo";
import { SchemaFieldsList } from "./SchemaFieldsList";
import { SchemaIndexesSection } from "./SchemaIndexesSection";
import { SchemaValidationErrors } from "./SchemaValidationErrors";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";

interface SchemaEditorProps {
  schemaId: string;
  schema: Schema;
  existingSchemas: SchemaTableRow[];
  onSave: (id: string, schema: Schema) => void;
  onDelete: (id: string) => void;
}

export function SchemaEditor({ schemaId, schema, existingSchemas, onSave, onDelete }: SchemaEditorProps) {
  const { theme, sz } = useTheme();
  const form = useSchemaForm({ schemaId, initialSchema: schema });

  const handleSave = () => {
    const built = form.getSchema();
    const errs = validateSchema(built, existingSchemas);
    form.setErrors(errs);
    if (errs.length === 0) onSave(schemaId, built);
  };

  const isDirty = form.name !== (schema.name || "") || form.description !== (schema.description || "") ||
    JSON.stringify(form.fields) !== JSON.stringify(schema.fields) ||
    JSON.stringify(form.queryIndexes) !== JSON.stringify(schema["query-indexes"] || []) ||
    JSON.stringify(form.vectorIndexes) !== JSON.stringify(schema["vector-indexes"] || []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: sz(14), color: theme.text.primary, fontFamily: theme.font.mono, fontWeight: 600 }}>{form.name || schemaId}</div>
          <div style={{ fontSize: sz(10), color: theme.text.hint, fontFamily: theme.font.mono, marginTop: 2 }}>{schemaId}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <Button size="lg" onClick={handleSave} color={theme.palette.emerald}>
              Save
            </Button>
          )}
          <Button size="lg" onClick={() => { if (window.confirm(`Delete schema "${form.name || schemaId}"?`)) onDelete(schemaId); }}
            color={theme.palette.red} active={false}
            style={{ border: `1px solid ${theme.palette.red}44`, color: theme.palette.red }}>
            Delete
          </Button>
        </div>
      </div>

      <SchemaValidationErrors errors={form.errors} />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 600 }}>
          <SchemaBasicInfo id={schemaId} name={form.name} description={form.description}
            onNameChange={form.setName} onDescriptionChange={form.setDescription} />

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />

          <SchemaFieldsList fields={form.fields} onChange={form.handleFieldChange} onRemove={form.handleRemoveField} onAdd={form.handleAddField}
            onAddEnumValue={form.handleAddEnumValue} onRemoveEnumValue={form.handleRemoveEnumValue} />

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "16px 0" }} />

          <SchemaIndexesSection queryIndexes={form.queryIndexes} vectorIndexes={form.vectorIndexes} fields={form.fields}
            onAddQueryIndex={form.handleAddQueryIndex} onRemoveQueryIndex={form.handleRemoveQueryIndex}
            onAddVectorIndex={form.handleAddVectorIndex} onRemoveVectorIndex={form.handleRemoveVectorIndex} />
        </div>
      </div>
    </div>
  );
}
