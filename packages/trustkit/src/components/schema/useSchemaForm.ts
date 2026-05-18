import { useState, useEffect } from "react";
import type { SchemaField, Schema } from "../../utils/schema-validation";
import { DEFAULT_FIELD } from "../../utils/schema-validation";

interface UseSchemaFormProps {
  schemaId?: string;
  initialSchema?: Schema;
}

export const useSchemaForm = ({ schemaId, initialSchema }: UseSchemaFormProps) => {
  const [id, setId] = useState(schemaId || "");
  const [name, setName] = useState(initialSchema?.name || "");
  const [description, setDescription] = useState(initialSchema?.description || "");
  const [fields, setFields] = useState<SchemaField[]>(
    initialSchema?.fields?.map((f) => ({ ...f, id: f.id || crypto.randomUUID() })) || [{ ...DEFAULT_FIELD, id: crypto.randomUUID() }],
  );
  const [indexes, setIndexes] = useState<string[]>(initialSchema?.indexes || []);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setId(schemaId || "");
    setName(initialSchema?.name || "");
    setDescription(initialSchema?.description || "");
    setFields(initialSchema?.fields?.map((f) => ({ ...f, id: f.id || crypto.randomUUID() })) || [{ ...DEFAULT_FIELD, id: crypto.randomUUID() }]);
    setIndexes(initialSchema?.indexes || []);
  }, [schemaId, initialSchema]);

  const handleAddField = () => {
    setFields([...fields, { ...DEFAULT_FIELD, id: crypto.randomUUID() }]);
  };

  const handleRemoveField = (index: number) => {
    const removedName = fields[index].name;
    setFields(fields.filter((_, i) => i !== index));
    setIndexes(indexes.filter((idx) => idx !== removedName));
  };

  const handleFieldChange = (index: number, update: Partial<SchemaField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...update };
    if (update.type && update.type !== "enum") delete updated[index].enum;
    setFields(updated);
  };

  const handleAddEnumValue = (fieldIndex: number, value: string) => {
    if (!value.trim()) return;
    const field = fields[fieldIndex];
    const vals = field.enum || [];
    if (!vals.includes(value.trim())) handleFieldChange(fieldIndex, { enum: [...vals, value.trim()] });
  };

  const handleRemoveEnumValue = (fieldIndex: number, value: string) => {
    const field = fields[fieldIndex];
    handleFieldChange(fieldIndex, { enum: (field.enum || []).filter((v) => v !== value) });
  };

  const handleAddIndex = (fieldName: string) => {
    if (fieldName && !indexes.includes(fieldName)) setIndexes([...indexes, fieldName]);
  };

  const handleRemoveIndex = (fieldName: string) => {
    setIndexes(indexes.filter((idx) => idx !== fieldName));
  };

  const getSchema = (): Schema => ({ name, description, fields, indexes: indexes.length > 0 ? indexes : undefined });

  const resetForm = () => {
    setId(""); setName(""); setDescription("");
    setFields([{ ...DEFAULT_FIELD, id: crypto.randomUUID() }]);
    setIndexes([]); setErrors([]);
  };

  return {
    id, setId, name, setName, description, setDescription,
    fields, indexes, errors, setErrors,
    handleAddField, handleRemoveField, handleFieldChange,
    handleAddEnumValue, handleRemoveEnumValue,
    handleAddIndex, handleRemoveIndex,
    getSchema, resetForm,
  };
};
