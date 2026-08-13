import {
  SchemaWorkbench,
  SectionLabel,
  useTheme,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

export function SchemaPage() {
  const { theme, sz } = useTheme();
  return (
    <>
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <SectionLabel>SCHEMA MANAGEMENT</SectionLabel>
        <span style={{
          fontSize: sz(11),
          color: theme.text.subtle,
          fontStyle: "italic",
          marginLeft: 8,
        }}>
          Define and manage structured data schemas.
        </span>
      </div>

      <SchemaWorkbench />

      <DevPanel
        explanation="This page demonstrates the schema management workbench. It provides a two-panel layout: schema list with inline creation, and a full editor with field management, type selection, primary key/required flags, enum value editing, and index configuration. Validation runs on save."
        codeSamples={[
          {
            label: "Full workbench (recommended)",
            code: `import { SchemaWorkbench } from "@trustgraph/trustkit";

<SchemaWorkbench />`,
          },
          {
            label: "Custom: composing individual pieces",
            code: `import {
  SchemaEditor,
  SchemaBasicInfo,
  SchemaFieldsList,
  SchemaFieldEditor,
  SchemaIndexesSection,
  SchemaValidationErrors,
  useSchemaForm,
} from "@trustgraph/trustkit";
import { useSchemas } from "@trustgraph/react-state";

function MySchemaUI() {
  const { schemas, updateSchema } = useSchemas();
  const form = useSchemaForm({ schemaId: "my-schema" });
  // Wire up your own layout with the domain pieces
}`,
          },
        ]}
        components={[
          { name: "SchemaWorkbench", tier: "3", description: "Full two-panel schema editor" },
          { name: "SchemaEditor", tier: "2", description: "Complete schema edit form" },
          { name: "SchemaBasicInfo", tier: "2", description: "ID, name, description fields" },
          { name: "SchemaFieldsList", tier: "2", description: "Field list with add/remove" },
          { name: "SchemaFieldEditor", tier: "2", description: "Single field editor" },
          { name: "SchemaIndexesSection", tier: "2", description: "Index management" },
          { name: "SchemaValidationErrors", tier: "2", description: "Validation error display" },
        ]}
        hooks={[
          { name: "useSchemas", tier: "1", description: "CRUD operations for schemas via config service" },
          { name: "useSchemaForm", tier: "1", description: "Form state management for schema editing" },
        ]}
      />
    </>
  );
}
