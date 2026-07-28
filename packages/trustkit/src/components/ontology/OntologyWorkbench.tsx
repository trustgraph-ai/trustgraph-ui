import { useState, useRef } from "react";
import { useOntologies } from "@trustgraph/react-state";
import type { Ontology, OWLClass, OWLObjectProperty, OWLDatatypeProperty } from "@trustgraph/react-state";
import { OntologyList } from "./OntologyList";
import { OntologyClassTree } from "./OntologyClassTree";
import { OntologyPropertyTree } from "./OntologyPropertyTree";
import { OntologyClassEditor } from "./OntologyClassEditor";
import { OntologyPropertyEditor } from "./OntologyPropertyEditor";
import { OntologyMetadataEditor } from "./OntologyMetadataEditor";
import { OntologyValidationPanel } from "./OntologyValidationPanel";
import { OntologyValidator } from "../../utils/ontology-validator";
import { OntologyExporter } from "../../utils/ontology-exporter";
import { OntologyImporter } from "../../utils/ontology-importer";
import { LoadingState } from "../common";
import { useTheme } from "../../theme/ThemeContext";

type View = "metadata" | "class" | "property";

export function OntologyWorkbench() {
  const { ontologies, ontologiesLoading, ontologiesError, createOntology, updateOntology, deleteOntology } = useOntologies();
  const { theme, sz } = useTheme();

  const [selectedOntologyId, setSelectedOntologyId] = useState<string | null>(null);
  const [view, setView] = useState<View>("metadata");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState<"object" | "datatype" | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typedOntologies = ontologies as Array<[string, Ontology]>;
  const selectedOntology = typedOntologies.find(([id]) => id === selectedOntologyId);
  const ontology: Ontology | null = selectedOntology ? selectedOntology[1] : null;

  if (ontologiesLoading) return <LoadingState />;
  if (ontologiesError) return <LoadingState variant="error" message={String(ontologiesError)} />;

  const handleCreate = async (id: string, name: string) => {
    const newOntology: Ontology = {
      metadata: { name, description: "", version: "1.0.0", created: new Date().toISOString(), modified: new Date().toISOString(), creator: "", namespace: "" },
      classes: {},
      objectProperties: {},
      datatypeProperties: {},
    };
    createOntology({ id, ontology: newOntology });
    setSelectedOntologyId(id);
  };

  const handleDelete = async (id: string) => {
    deleteOntology({ id });
    if (selectedOntologyId === id) {
      setSelectedOntologyId(null);
      setSelectedClassId(null);
      setSelectedPropertyId(null);
    }
  };

  const save = (updated: Ontology) => {
    if (!selectedOntologyId) return;
    updateOntology({ id: selectedOntologyId, ontology: updated });
  };

  const handleUpdateClass = (classId: string, updated: OWLClass) => {
    if (!ontology) return;
    save({ ...ontology, classes: { ...ontology.classes, [classId]: updated } });
  };

  const handleDeleteClass = (classId: string) => {
    if (!ontology) return;
    const { [classId]: _, ...rest } = ontology.classes;
    save({ ...ontology, classes: rest });
    if (selectedClassId === classId) setSelectedClassId(null);
  };

  const handleCreateClass = (name: string) => {
    if (!ontology) return;
    const id = name.replace(/\s+/g, "");
    const cls: OWLClass = { uri: `${ontology.metadata.namespace || "#"}${id}`, type: "owl:Class", "rdfs:label": [{ value: name, lang: "en" }] };
    save({ ...ontology, classes: { ...ontology.classes, [id]: cls } });
    setSelectedClassId(id);
    setView("class");
  };

  const handleUpdateProperty = (id: string, updated: OWLObjectProperty | OWLDatatypeProperty, type: "object" | "datatype") => {
    if (!ontology) return;
    if (type === "object") save({ ...ontology, objectProperties: { ...ontology.objectProperties, [id]: updated as OWLObjectProperty } });
    else save({ ...ontology, datatypeProperties: { ...ontology.datatypeProperties, [id]: updated as OWLDatatypeProperty } });
  };

  const handleDeleteProperty = (id: string, type: "object" | "datatype") => {
    if (!ontology) return;
    if (type === "object") {
      const { [id]: _, ...rest } = ontology.objectProperties;
      save({ ...ontology, objectProperties: rest });
    } else {
      const { [id]: _, ...rest } = ontology.datatypeProperties;
      save({ ...ontology, datatypeProperties: rest });
    }
    if (selectedPropertyId === id) { setSelectedPropertyId(null); setSelectedPropertyType(null); }
  };

  const handleCreateObjectProperty = (name: string) => {
    if (!ontology) return;
    const id = name.replace(/\s+/g, "").charAt(0).toLowerCase() + name.replace(/\s+/g, "").slice(1);
    const prop: OWLObjectProperty = { uri: `${ontology.metadata.namespace || "#"}${id}`, type: "owl:ObjectProperty", "rdfs:label": [{ value: name, lang: "en" }] };
    save({ ...ontology, objectProperties: { ...ontology.objectProperties, [id]: prop } });
    setSelectedPropertyId(id);
    setSelectedPropertyType("object");
    setView("property");
  };

  const handleCreateDatatypeProperty = (name: string) => {
    if (!ontology) return;
    const id = name.replace(/\s+/g, "").charAt(0).toLowerCase() + name.replace(/\s+/g, "").slice(1);
    const prop: OWLDatatypeProperty = { uri: `${ontology.metadata.namespace || "#"}${id}`, type: "owl:DatatypeProperty", "rdfs:label": [{ value: name, lang: "en" }] };
    save({ ...ontology, datatypeProperties: { ...ontology.datatypeProperties, [id]: prop } });
    setSelectedPropertyId(id);
    setSelectedPropertyType("datatype");
    setView("property");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const result = OntologyImporter.import(content, file.name);
      const id = file.name.replace(/\.(owl|rdf|ttl|xml)$/i, "").replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
      const existing = typedOntologies.find(([eid]) => eid === id);
      const finalId = existing ? `${id}-${Date.now()}` : id;
      createOntology({ id: finalId, ontology: result.ontology });
      setSelectedOntologyId(finalId);
      setSelectedClassId(null);
      setSelectedPropertyId(null);
      setView("metadata");
      if (result.warnings.length > 0) setImportError("Imported with warnings: " + result.warnings.join("; "));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
    e.target.value = "";
  };

  const validationResult = ontology ? OntologyValidator.validate(ontology) : null;

  const handleExport = (format: "owl" | "rdf" | "turtle") => {
    if (!ontology || !selectedOntologyId) return;
    const content = OntologyExporter.export(ontology, { format });
    OntologyExporter.downloadFile(content, `${selectedOntologyId}.${OntologyExporter.getFileExtension(format)}`, OntologyExporter.getMimeType(format));
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 160px)" }}>
      {/* Ontology list */}
      <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${theme.border.default}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <OntologyList ontologies={typedOntologies} selectedId={selectedOntologyId} onSelect={(id) => { setSelectedOntologyId(id); setSelectedClassId(null); setSelectedPropertyId(null); setView("metadata"); }} onCreate={handleCreate} />
        <div style={{ marginTop: "auto", padding: "8px 16px", borderTop: `1px solid ${theme.border.default}` }}>
          <input ref={fileInputRef} type="file" accept=".owl,.rdf,.ttl,.xml" onChange={handleImportFile} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()}
            style={{ width: "100%", padding: "5px 10px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: "transparent", color: theme.text.faint, fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
            Import OWL/Turtle...
          </button>
          {importError && (
            <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 4, background: `${theme.palette.red}1a`, color: theme.palette.red, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.4 }}>
              {importError}
            </div>
          )}
        </div>
      </div>

      {!ontology && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: theme.text.hint, fontSize: sz(13), fontStyle: "italic" }}>
          Select an ontology to edit
        </div>
      )}

      {ontology && (
        <>
          {/* Class/Property tree sidebar */}
          <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${theme.border.default}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ borderBottom: `1px solid ${theme.border.default}` }}>
              <OntologyClassTree classes={ontology.classes} selectedClassId={view === "class" ? selectedClassId : null}
                onSelectClass={(id) => { setSelectedClassId(id); setView("class"); }}
                onCreateClass={handleCreateClass} />
            </div>
            <OntologyPropertyTree objectProperties={ontology.objectProperties} datatypeProperties={ontology.datatypeProperties}
              selectedPropertyId={view === "property" ? selectedPropertyId : null} selectedPropertyType={view === "property" ? selectedPropertyType : null}
              onSelectProperty={(id, type) => { setSelectedPropertyId(id); setSelectedPropertyType(type); setView("property"); }}
              onCreateObjectProperty={handleCreateObjectProperty} onCreateDatatypeProperty={handleCreateDatatypeProperty} />

            {/* Toolbar */}
            <div style={{ marginTop: "auto", padding: 12, borderTop: `1px solid ${theme.border.default}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setView("metadata")}
                style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${view === "metadata" ? theme.palette.cyan + "44" : theme.border.default}`, background: view === "metadata" ? `${theme.palette.cyan}1a` : "transparent", color: view === "metadata" ? theme.palette.cyan : theme.text.faint, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
                Metadata
              </button>
              <button onClick={() => setShowValidation(!showValidation)}
                style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${showValidation ? theme.palette.amber + "44" : theme.border.default}`, background: showValidation ? `${theme.palette.amber}1a` : "transparent", color: showValidation ? theme.palette.amber : theme.text.faint, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
                Validate
              </button>
              <select onChange={(e) => { if (e.target.value) handleExport(e.target.value as "owl" | "rdf" | "turtle"); e.target.value = ""; }}
                style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: "transparent", color: theme.text.faint, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
                <option value="">Export...</option>
                <option value="owl">OWL/XML</option>
                <option value="rdf">RDF/XML</option>
                <option value="turtle">Turtle</option>
              </select>
              <button onClick={() => { if (selectedOntologyId && window.confirm(`Delete ontology "${ontology.metadata.name || selectedOntologyId}"? This cannot be undone.`)) handleDelete(selectedOntologyId); }}
                style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${theme.palette.red}44`, background: "transparent", color: theme.palette.red, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>

          {/* Main editor area */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {showValidation && validationResult && (
              <OntologyValidationPanel result={validationResult}
                onNavigateToItem={(itemId, itemType) => {
                  if (itemType === "class") { setSelectedClassId(itemId); setView("class"); }
                  else { setSelectedPropertyId(itemId); setSelectedPropertyType(itemType === "objectProperty" ? "object" : "datatype"); setView("property"); }
                }}
                onClose={() => setShowValidation(false)} />
            )}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {view === "metadata" && (
                <OntologyMetadataEditor metadata={ontology.metadata}
                  onUpdateMetadata={(metadata) => save({ ...ontology, metadata })} />
              )}
              {view === "class" && selectedClassId && ontology.classes[selectedClassId] && (
                <OntologyClassEditor classId={selectedClassId} owlClass={ontology.classes[selectedClassId]}
                  ontology={ontology} onUpdateClass={handleUpdateClass} onDeleteClass={handleDeleteClass} />
              )}
              {view === "property" && selectedPropertyId && selectedPropertyType && (
                <OntologyPropertyEditor
                  propertyId={selectedPropertyId}
                  property={selectedPropertyType === "object" ? ontology.objectProperties[selectedPropertyId] : ontology.datatypeProperties[selectedPropertyId]}
                  propertyType={selectedPropertyType}
                  ontology={ontology}
                  onUpdateProperty={handleUpdateProperty}
                  onDeleteProperty={handleDeleteProperty} />
              )}
              {view === "class" && !selectedClassId && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: theme.text.hint, fontSize: sz(12), fontStyle: "italic" }}>Select a class to edit</div>
              )}
              {view === "property" && !selectedPropertyId && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: theme.text.hint, fontSize: sz(12), fontStyle: "italic" }}>Select a property to edit</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
