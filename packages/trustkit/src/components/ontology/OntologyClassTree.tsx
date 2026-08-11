import { useState, useRef } from "react";
import type { OWLClass } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { SelectableListItem } from "../common/SelectableListItem";

interface OntologyClassTreeProps {
  classes: Record<string, OWLClass>;
  selectedClassId: string | null;
  onSelectClass: (classId: string) => void;
  onCreateClass: (className: string) => void;
}

function getLabel(cls: OWLClass, id: string): string {
  return cls["rdfs:label"]?.[0]?.value || id;
}

export function OntologyClassTree({ classes, selectedClassId, onSelectClass, onCreateClass }: OntologyClassTreeProps) {
  const { theme, sz } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateClass(newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  const rootClasses = Object.entries(classes).filter(([, cls]) => !cls["rdfs:subClassOf"] || !classes[cls["rdfs:subClassOf"]]);
  const childrenOf = (parentId: string) => Object.entries(classes).filter(([, cls]) => cls["rdfs:subClassOf"] === parentId);

  const renderClass = (id: string, cls: OWLClass, depth: number) => {
    const isSelected = selectedClassId === id;
    const children = childrenOf(id);
    return (
      <div key={id}>
        <div style={{ paddingLeft: depth * 16 }}>
          <SelectableListItem isSelected={isSelected} onClick={() => onSelectClass(id)}
            style={{ padding: "5px 8px", borderRadius: 4, marginBottom: 1 }}>
            {getLabel(cls, id)}
          </SelectableListItem>
        </div>
        {children.map(([childId, childCls]) => renderClass(childId, childCls, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.hint, letterSpacing: "0.1em" }}>CLASSES ({Object.keys(classes).length})</div>
        <Button size="sm" color={showCreate ? theme.palette.emerald : undefined} active={showCreate}
          onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}>
          + New
        </Button>
      </div>

      {showCreate && (
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <Input ref={inputRef} value={newName} onChange={setNewName}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setNewName(""); }}
            placeholder="Class name"
            style={{ flex: 1, padding: "4px 6px", fontSize: sz(10) }} />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()} color={theme.palette.emerald}>
            Add
          </Button>
        </div>
      )}

      {rootClasses.map(([id, cls]) => renderClass(id, cls, 0))}

      {Object.keys(classes).length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: theme.text.hint, fontSize: sz(10), fontFamily: theme.font.mono, fontStyle: "italic" }}>No classes yet</div>
      )}
    </div>
  );
}
