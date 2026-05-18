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
  indexes?: string[];
}

export type SchemaTableRow = [string, Schema];
