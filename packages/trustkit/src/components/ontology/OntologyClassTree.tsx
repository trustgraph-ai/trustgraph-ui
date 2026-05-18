import { useState, useRef } from "react";
import type { OWLClass } from "@trustgraph/react-state";
import { text, border, surface, palette } from "../../theme";

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
          <button onClick={() => onSelectClass(id)}
            style={{ width: "100%", textAlign: "left", padding: "5px 8px", marginBottom: 1, borderRadius: 4, border: isSelected ? `1px solid ${palette.cyan}44` : "1px solid transparent", background: isSelected ? `${palette.cyan}1a` : "transparent", color: isSelected ? palette.cyan : text.secondary, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = surface.cardHover; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
            {getLabel(cls, id)}
          </button>
        </div>
        {children.map(([childId, childCls]) => renderClass(childId, childCls, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: text.hint, letterSpacing: "0.1em" }}>CLASSES ({Object.keys(classes).length})</div>
        <button onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}
          style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${showCreate ? palette.emerald + "44" : border.default}`, background: showCreate ? `${palette.emerald}1a` : "transparent", color: showCreate ? palette.emerald : text.faint, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
          + New
        </button>
      </div>

      {showCreate && (
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <input ref={inputRef} type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowCreate(false); setNewName(""); } }}
            placeholder="Class name"
            style={{ flex: 1, padding: "4px 6px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", outline: "none" }} />
          <button onClick={handleCreate} disabled={!newName.trim()}
            style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${palette.emerald}44`, background: `${palette.emerald}1a`, color: !newName.trim() ? text.disabled : palette.emerald, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Add
          </button>
        </div>
      )}

      {rootClasses.map(([id, cls]) => renderClass(id, cls, 0))}

      {Object.keys(classes).length === 0 && (
        <div style={{ padding: 16, textAlign: "center", color: text.hint, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>No classes yet</div>
      )}
    </div>
  );
}
