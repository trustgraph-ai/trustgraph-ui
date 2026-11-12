import { useState, useRef } from "react";
import type { OntologyProperty } from "@trustgraph/react-state";
import { getLocalName } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { SelectableListItem } from "../common/SelectableListItem";

interface OntologyPropertyTreeProps {
  objectProperties: Map<string, OntologyProperty>;
  datatypeProperties: Map<string, OntologyProperty>;
  selectedPropertyId: string | null;
  selectedPropertyType: "object" | "datatype" | null;
  onSelectProperty: (id: string, type: "object" | "datatype") => void;
  onCreateObjectProperty: (name: string) => void;
  onCreateDatatypeProperty: (name: string) => void;
}

function propLabel(prop: OntologyProperty, id: string): string {
  return prop.labels[0]?.value || getLocalName(id);
}

function PropertySection({ label, count, items, type, selectedId, selectedType, onSelect, onCreate }: {
  label: string; count: number; items: [string, OntologyProperty][]; type: "object" | "datatype";
  selectedId: string | null; selectedType: "object" | "datatype" | null;
  onSelect: (id: string, type: "object" | "datatype") => void;
  onCreate: (name: string) => void;
}) {
  const { theme, sz } = useTheme();
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
        <div style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.hint, letterSpacing: "0.1em" }}>{label} ({count})</div>
        <Button size="sm" color={showCreate ? theme.palette.emerald : undefined} active={showCreate}
          onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}>
          + New
        </Button>
      </div>

      {showCreate && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          <Input ref={inputRef} value={newName} onChange={setNewName}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setNewName(""); }}
            placeholder="Property name"
            style={{ flex: 1, padding: "4px 6px", fontSize: sz(10) }} />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()} color={theme.palette.emerald}>
            Add
          </Button>
        </div>
      )}

      {items.map(([id, prop]) => {
        const isSelected = selectedId === id && selectedType === type;
        return (
          <SelectableListItem key={id} isSelected={isSelected} onClick={() => onSelect(id, type)}
            style={{ padding: "5px 8px", borderRadius: 4, marginBottom: 1 }}>
            {propLabel(prop, id)}
          </SelectableListItem>
        );
      })}

      {items.length === 0 && (
        <div style={{ padding: 8, textAlign: "center", color: theme.text.hint, fontSize: sz(10), fontFamily: theme.font.mono, fontStyle: "italic" }}>None</div>
      )}
    </div>
  );
}

export function OntologyPropertyTree({ objectProperties, datatypeProperties, selectedPropertyId, selectedPropertyType, onSelectProperty, onCreateObjectProperty, onCreateDatatypeProperty }: OntologyPropertyTreeProps) {
  return (
    <div style={{ padding: 12 }}>
      <PropertySection label="OBJECT PROPERTIES" count={objectProperties.size}
        items={[...objectProperties.entries()]} type="object"
        selectedId={selectedPropertyId} selectedType={selectedPropertyType}
        onSelect={onSelectProperty} onCreate={onCreateObjectProperty} />
      <PropertySection label="DATATYPE PROPERTIES" count={datatypeProperties.size}
        items={[...datatypeProperties.entries()]} type="datatype"
        selectedId={selectedPropertyId} selectedType={selectedPropertyType}
        onSelect={onSelectProperty} onCreate={onCreateDatatypeProperty} />
    </div>
  );
}
