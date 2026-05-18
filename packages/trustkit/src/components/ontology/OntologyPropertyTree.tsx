import { useState, useRef } from "react";
import type { OWLObjectProperty, OWLDatatypeProperty } from "@trustgraph/react-state";
import { text, border, surface, palette } from "../../theme";

interface OntologyPropertyTreeProps {
  objectProperties: Record<string, OWLObjectProperty>;
  datatypeProperties: Record<string, OWLDatatypeProperty>;
  selectedPropertyId: string | null;
  selectedPropertyType: "object" | "datatype" | null;
  onSelectProperty: (id: string, type: "object" | "datatype") => void;
  onCreateObjectProperty: (name: string) => void;
  onCreateDatatypeProperty: (name: string) => void;
}

function getLabel(prop: OWLObjectProperty | OWLDatatypeProperty, id: string): string {
  return prop["rdfs:label"]?.[0]?.value || id;
}

function PropertySection({ label, count, items, type, selectedId, selectedType, onSelect, onCreate }: {
  label: string; count: number; items: [string, OWLObjectProperty | OWLDatatypeProperty][]; type: "object" | "datatype";
  selectedId: string | null; selectedType: "object" | "datatype" | null;
  onSelect: (id: string, type: "object" | "datatype") => void;
  onCreate: (name: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: text.hint, letterSpacing: "0.1em" }}>{label} ({count})</div>
        <button onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}
          style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${showCreate ? palette.emerald + "44" : border.default}`, background: showCreate ? `${palette.emerald}1a` : "transparent", color: showCreate ? palette.emerald : text.faint, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
          + New
        </button>
      </div>

      {showCreate && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          <input ref={inputRef} type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowCreate(false); setNewName(""); } }}
            placeholder="Property name"
            style={{ flex: 1, padding: "4px 6px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", outline: "none" }} />
          <button onClick={handleCreate} disabled={!newName.trim()}
            style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${palette.emerald}44`, background: `${palette.emerald}1a`, color: !newName.trim() ? text.disabled : palette.emerald, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Add
          </button>
        </div>
      )}

      {items.map(([id, prop]) => {
        const isSelected = selectedId === id && selectedType === type;
        return (
          <button key={id} onClick={() => onSelect(id, type)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", marginBottom: 1, borderRadius: 4, border: isSelected ? `1px solid ${palette.cyan}44` : "1px solid transparent", background: isSelected ? `${palette.cyan}1a` : "transparent", color: isSelected ? palette.cyan : text.secondary, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = surface.cardHover; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
            {getLabel(prop, id)}
          </button>
        );
      })}

      {items.length === 0 && (
        <div style={{ padding: 8, textAlign: "center", color: text.hint, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>None</div>
      )}
    </div>
  );
}

export function OntologyPropertyTree({ objectProperties, datatypeProperties, selectedPropertyId, selectedPropertyType, onSelectProperty, onCreateObjectProperty, onCreateDatatypeProperty }: OntologyPropertyTreeProps) {
  return (
    <div style={{ padding: 12 }}>
      <PropertySection label="OBJECT PROPERTIES" count={Object.keys(objectProperties).length}
        items={Object.entries(objectProperties)} type="object"
        selectedId={selectedPropertyId} selectedType={selectedPropertyType}
        onSelect={onSelectProperty} onCreate={onCreateObjectProperty} />
      <PropertySection label="DATATYPE PROPERTIES" count={Object.keys(datatypeProperties).length}
        items={Object.entries(datatypeProperties)} type="datatype"
        selectedId={selectedPropertyId} selectedType={selectedPropertyType}
        onSelect={onSelectProperty} onCreate={onCreateDatatypeProperty} />
    </div>
  );
}
