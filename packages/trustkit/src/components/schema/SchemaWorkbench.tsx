import { useState } from "react";
import { useSchemas } from "@trustgraph/react-state";
import type { Schema, SchemaTableRow } from "../../utils/schema-validation";
import { SchemaBasicInfo } from "./SchemaBasicInfo";
import { SchemaValidationErrors } from "./SchemaValidationErrors";
import { SchemaEditor } from "./SchemaEditor";
import { LoadingState } from "../common";
import { Button } from "../common/Button";
import { SelectableListItem } from "../common/SelectableListItem";
import { useTheme } from "../../theme/ThemeContext";

function SchemaList({ schemas, selectedId, onSelect, onCreate }: {
  schemas: SchemaTableRow[]; selectedId: string | null;
  onSelect: (id: string) => void; onCreate: (id: string, schema: Schema) => void;
}) {
  const { theme, sz } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleCreate = () => {
    const errs: string[] = [];
    if (!newId.trim()) errs.push("Schema ID is required");
    else if (schemas.some(([id]) => id === newId.trim())) errs.push(`Schema with ID "${newId.trim()}" already exists`);
    if (!newName.trim()) errs.push("Schema name is required");
    setErrors(errs);
    if (errs.length > 0) return;
    onCreate(newId.trim(), { name: newName.trim(), description: newDescription.trim(), fields: [] });
    setNewId(""); setNewName(""); setNewDescription(""); setErrors([]);
    setShowCreate(false);
  };

  const handleCancelCreate = () => {
    setShowCreate(false); setNewId(""); setNewName(""); setNewDescription(""); setErrors([]);
  };

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, fontWeight: 600, color: theme.text.faint, letterSpacing: "0.1em" }}>SCHEMAS</div>
        <Button size="sm" color={showCreate ? theme.palette.emerald : undefined} active={showCreate}
          onClick={() => setShowCreate(!showCreate)}>
          + New
        </Button>
      </div>

      {showCreate && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, border: `1px solid ${theme.border.default}`, background: theme.surface.card }}>
          <SchemaValidationErrors errors={errors} />
          <SchemaBasicInfo id={newId} name={newName} description={newDescription} isNew
            onIdChange={setNewId} onNameChange={setNewName} onDescriptionChange={setNewDescription} />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <Button size="md" active={false} onClick={handleCancelCreate}
              style={{ padding: "4px 10px" }}>
              Cancel
            </Button>
            <Button size="md" onClick={handleCreate} color={theme.palette.emerald}
              style={{ padding: "4px 10px" }}>
              Create
            </Button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {schemas.map(([id, schema]) => (
          <SelectableListItem key={id} isSelected={selectedId === id} onClick={() => onSelect(id)}>
            <div>{schema.name || id}</div>
            <div style={{ fontSize: sz(9), color: theme.text.hint, marginTop: 2 }}>{schema.fields.length} field{schema.fields.length !== 1 ? "s" : ""}</div>
          </SelectableListItem>
        ))}
      </div>
    </div>
  );
}

export function SchemaWorkbench() {
  const { theme, sz } = useTheme();
  const { schemas, schemasLoading, schemasError, createSchema, updateSchema, deleteSchema } = useSchemas();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (schemasLoading) return <LoadingState />;
  if (schemasError) return <LoadingState variant="error" message={String(schemasError)} />;

  const typedSchemas = schemas as SchemaTableRow[];
  const selectedSchema = typedSchemas.find(([id]) => id === selectedId);

  const handleCreate = (id: string, schema: Schema) => {
    createSchema({ id, schema } as any);
    setSelectedId(id);
  };

  const handleSave = (id: string, schema: Schema) => {
    updateSchema({ id, schema } as any);
  };

  const handleDelete = (id: string) => {
    deleteSchema({ id } as any);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 160px)" }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${theme.border.default}`, overflowY: "auto" }}>
        <SchemaList schemas={typedSchemas} selectedId={selectedId} onSelect={setSelectedId} onCreate={handleCreate} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedSchema && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: theme.text.hint, fontSize: sz(13), fontStyle: "italic" }}>
            Select a schema to edit
          </div>
        )}
        {selectedSchema && (
          <SchemaEditor schemaId={selectedSchema[0]} schema={selectedSchema[1]} existingSchemas={typedSchemas} onSave={handleSave} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
