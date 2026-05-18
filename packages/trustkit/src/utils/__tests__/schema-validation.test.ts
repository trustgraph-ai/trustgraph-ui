import { describe, it, expect } from "vitest";
import { validateSchema, SCHEMA_TYPE_OPTIONS, DEFAULT_FIELD } from "../schema-validation";
import type { Schema, SchemaTableRow } from "../schema-validation";

function makeSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    name: "Users",
    description: "User records",
    fields: [
      { id: "1", name: "id", type: "integer", primary_key: true },
      { id: "2", name: "name", type: "string" },
    ],
    ...overrides,
  };
}

const existing: SchemaTableRow[] = [
  ["users", makeSchema()],
];

describe("validateSchema", () => {
  it("returns no errors for a valid schema", () => {
    const errors = validateSchema(makeSchema(), []);
    expect(errors).toHaveLength(0);
  });

  it("requires schema name", () => {
    const errors = validateSchema(makeSchema({ name: "" }), []);
    expect(errors).toContain("Schema name is required");
  });

  it("requires schema description", () => {
    const errors = validateSchema(makeSchema({ description: "" }), []);
    expect(errors).toContain("Schema description is required");
  });

  it("requires at least one field", () => {
    const errors = validateSchema(makeSchema({ fields: [] }), []);
    expect(errors).toContain("At least one field is required");
  });

  it("requires at least one primary key", () => {
    const schema = makeSchema({
      fields: [
        { id: "1", name: "name", type: "string", primary_key: false },
      ],
    });
    const errors = validateSchema(schema, []);
    expect(errors).toContain("At least one primary key field is required");
  });

  it("detects duplicate field names", () => {
    const schema = makeSchema({
      fields: [
        { id: "1", name: "name", type: "string", primary_key: true },
        { id: "2", name: "name", type: "string" },
      ],
    });
    const errors = validateSchema(schema, []);
    expect(errors.some((e) => e.includes("Duplicate field names"))).toBe(true);
  });

  it("requires field names", () => {
    const schema = makeSchema({
      fields: [
        { id: "1", name: "", type: "string", primary_key: true },
      ],
    });
    const errors = validateSchema(schema, []);
    expect(errors.some((e) => e.includes("must have a name"))).toBe(true);
  });

  it("requires enum fields to have values", () => {
    const schema = makeSchema({
      fields: [
        { id: "1", name: "id", type: "integer", primary_key: true },
        { id: "2", name: "status", type: "enum", enum: [] },
      ],
    });
    const errors = validateSchema(schema, []);
    expect(errors.some((e) => e.includes("must have at least one value"))).toBe(true);
  });

  it("validates indexes reference existing fields", () => {
    const schema = makeSchema({ indexes: ["nonexistent"] });
    const errors = validateSchema(schema, []);
    expect(errors.some((e) => e.includes("does not exist"))).toBe(true);
  });

  it("accepts valid indexes", () => {
    const schema = makeSchema({ indexes: ["name"] });
    const errors = validateSchema(schema, []);
    expect(errors.some((e) => e.includes("does not exist"))).toBe(false);
  });

  describe("new schema ID validation", () => {
    it("requires schema ID when creating new", () => {
      const errors = validateSchema(makeSchema(), [], "");
      expect(errors).toContain("Schema ID is required");
    });

    it("rejects duplicate schema ID", () => {
      const errors = validateSchema(makeSchema(), existing, "users");
      expect(errors.some((e) => e.includes("already exists"))).toBe(true);
    });

    it("accepts unique schema ID", () => {
      const errors = validateSchema(makeSchema(), existing, "orders");
      expect(errors.some((e) => e.includes("already exists"))).toBe(false);
    });
  });
});

describe("constants", () => {
  it("SCHEMA_TYPE_OPTIONS covers all field types", () => {
    const types = SCHEMA_TYPE_OPTIONS.map((o) => o.value);
    expect(types).toContain("string");
    expect(types).toContain("integer");
    expect(types).toContain("float");
    expect(types).toContain("boolean");
    expect(types).toContain("timestamp");
    expect(types).toContain("enum");
  });

  it("DEFAULT_FIELD has sensible defaults", () => {
    expect(DEFAULT_FIELD.name).toBe("");
    expect(DEFAULT_FIELD.type).toBe("string");
    expect(DEFAULT_FIELD.primary_key).toBe(false);
  });
});
