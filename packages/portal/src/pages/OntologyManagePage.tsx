import {
  OntologyWorkbench,
  SectionLabel,
  useTheme,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

export function OntologyManagePage() {
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
        <SectionLabel>ONTOLOGY MANAGEMENT</SectionLabel>
        <span style={{
          fontSize: sz(11),
          color: theme.text.subtle,
          fontStyle: "italic",
          marginLeft: 8,
        }}>
          Create, edit, validate, and export OWL ontologies.
        </span>
      </div>

      <OntologyWorkbench />

      <DevPanel
        explanation="This page demonstrates the ontology management workbench. It provides a three-panel layout: ontology list, class/property tree browser, and detail editor. Supports validation, metadata editing, and export to OWL/XML, RDF, and Turtle formats."
        codeSamples={[
          {
            label: "Full workbench (recommended)",
            code: `import { OntologyWorkbench } from "@trustgraph/trustkit";

<OntologyWorkbench />`,
          },
          {
            label: "Custom: composing individual pieces",
            code: `import {
  OntologyList,
  OntologyClassTree,
  OntologyClassEditor,
  OntologyPropertyTree,
  OntologyPropertyEditor,
  OntologyMetadataEditor,
  OntologyValidationPanel,
} from "@trustgraph/trustkit";
import { useOntologies } from "@trustgraph/react-state";

function MyOntologyUI() {
  const { ontologies, updateOntology } = useOntologies();
  // Wire up your own layout with the domain pieces
}`,
          },
        ]}
        components={[
          { name: "OntologyWorkbench", tier: "3", description: "Full three-panel ontology editor" },
          { name: "OntologyList", tier: "2", description: "Ontology list with create/delete" },
          { name: "OntologyClassTree", tier: "2", description: "Hierarchical class browser" },
          { name: "OntologyPropertyTree", tier: "2", description: "Object/datatype property browser" },
          { name: "OntologyClassEditor", tier: "2", description: "Class detail editor" },
          { name: "OntologyPropertyEditor", tier: "2", description: "Property detail editor" },
          { name: "OntologyMetadataEditor", tier: "2", description: "Ontology metadata form" },
          { name: "OntologyValidationPanel", tier: "2", description: "Validation results display" },
        ]}
        hooks={[
          { name: "useOntologies", tier: "1", description: "CRUD operations for ontologies via config service" },
        ]}
      />
    </>
  );
}
