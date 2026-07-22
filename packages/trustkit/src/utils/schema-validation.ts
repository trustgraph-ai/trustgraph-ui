export interface SchemaField {
  id: string;
  name: string;
  type: "string" | "integer" | "float" | "boolean" | "timestamp" | "enum";
  primary_key?: boolean;
  required?: boolean;
  enum?: string[];
}

export interface Schema {
  name: string;
  description: string;
  fields: SchemaField[];
  "query-indexes"?: string[];
  "vector-indexes"?: string[];
}

export type SchemaTableRow = [string, Schema];

export interface SchemaTypeOption {
  value: SchemaField["type"];
  label: string;
  description: string;
}

export const SCHEMA_TYPE_OPTIONS: SchemaTypeOption[] = [
  { value: "string", label: "String", description: "Text data of variable length" },
  { value: "integer", label: "Integer", description: "Whole numbers (e.g., 1, 42, -10)" },
  { value: "float", label: "Float", description: "Decimal numbers (e.g., 3.14, -2.5)" },
  { value: "boolean", label: "Boolean", description: "True or false values" },
  { value: "timestamp", label: "Timestamp", description: "Date and time values" },
  { value: "enum", label: "Enum", description: "Predefined set of allowed values" },
];

export const DEFAULT_FIELD: Omit<SchemaField, "id"> = {
  name: "",
  type: "string",
  primary_key: false,
  required: false,
};

export const validateSchema = (
  schema: Schema,
  existingSchemas: SchemaTableRow[],
  newSchemaId?: string,
): string[] => {
  const errors: string[] = [];

  if (newSchemaId !== undefined) {
    if (!newSchemaId.trim()) errors.push("Schema ID is required");
    else if (existingSchemas.some(([id]) => id === newSchemaId)) errors.push(`Schema with ID "${newSchemaId}" already exists`);
  }

  if (!schema.name.trim()) errors.push("Schema name is required");
  if (!schema.description.trim()) errors.push("Schema description is required");
  if (schema.fields.length === 0) errors.push("At least one field is required");

  const fieldNames = schema.fields.map((f) => f.name);
  const duplicateFields = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
  if (duplicateFields.length > 0) errors.push(`Duplicate field names: ${duplicateFields.join(", ")}`);

  schema.fields.forEach((field, index) => {
    if (!field.name.trim()) errors.push(`Field ${index + 1} must have a name`);
  });

  if (!schema.fields.some((f) => f.primary_key)) errors.push("At least one primary key field is required");

  schema.fields.forEach((field) => {
    if (field.type === "enum" && (!field.enum || field.enum.length === 0)) {
      errors.push(`Enum field "${field.name}" must have at least one value`);
    }
  });

  if (schema["query-indexes"]) {
    schema["query-indexes"].forEach((indexField) => {
      if (!fieldNames.includes(indexField)) errors.push(`Query-indexed field "${indexField}" does not exist`);
    });
  }

  if (schema["vector-indexes"]) {
    schema["vector-indexes"].forEach((indexField) => {
      if (!fieldNames.includes(indexField)) errors.push(`Vector-indexed field "${indexField}" does not exist`);
    });
  }

  return errors;
};
