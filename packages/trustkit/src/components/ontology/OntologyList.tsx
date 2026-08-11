import { useState, useRef } from "react";
import type { Ontology } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { SelectableListItem } from "../common/SelectableListItem";

interface OntologyListProps {
  ontologies: Array<[string, Ontology]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate?: (id: string, name: string) => Promise<void>;
}

export function OntologyList({ ontologies, selectedId, onSelect, onCreate }: OntologyListProps) {
  const { theme, sz } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newId.trim() || !newName.trim() || !onCreate) return;
    setCreating(true);
    await onCreate(newId.trim(), newName.trim());
    setCreating(false);
    setNewId("");
    setNewName("");
    setShowCreate(false);
  };

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, fontWeight: 600, color: theme.text.faint, letterSpacing: "0.1em" }}>ONTOLOGIES</div>
        {onCreate && (
          <Button size="sm" color={showCreate ? theme.palette.emerald : undefined} active={showCreate}
            onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}>
            + New
          </Button>
        )}
      </div>

      {showCreate && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <Input ref={inputRef} value={newId} onChange={setNewId} placeholder="ontology-id" disabled={creating} />
          <div style={{ display: "flex", gap: 6 }}>
            <Input value={newName} onChange={setNewName}
              onSubmit={handleCreate}
              onCancel={() => { setShowCreate(false); setNewId(""); setNewName(""); }}
              placeholder="Display name" disabled={creating} style={{ flex: 1 }} />
            <Button onClick={handleCreate} disabled={creating || !newId.trim() || !newName.trim()}
              color={theme.palette.emerald} style={{ cursor: creating ? "wait" : "pointer" }}>
              {creating ? "..." : "Create"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {ontologies.map(([id, ont]) => {
          const classCount = Object.keys(ont.classes).length;
          const propCount = Object.keys(ont.objectProperties).length + Object.keys(ont.datatypeProperties).length;
          return (
            <SelectableListItem key={id} isSelected={selectedId === id} onClick={() => onSelect(id)}>
              <div>{ont.metadata.name || id}</div>
              <div style={{ fontSize: sz(9), color: theme.text.hint, marginTop: 2 }}>
                {classCount} class{classCount !== 1 ? "es" : ""} · {propCount} prop{propCount !== 1 ? "s" : ""}
              </div>
            </SelectableListItem>
          );
        })}
      </div>
    </div>
  );
}
