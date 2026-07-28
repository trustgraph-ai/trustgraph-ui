import { useState, useRef } from "react";
import type { Ontology } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";

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
        <div style={{ fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: theme.text.faint, letterSpacing: "0.1em" }}>ONTOLOGIES</div>
        {onCreate && (
          <button onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${showCreate ? theme.palette.emerald + "44" : theme.border.default}`, background: showCreate ? `${theme.palette.emerald}1a` : "transparent", color: showCreate ? theme.palette.emerald : theme.text.faint, fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", transition: "all 0.15s" }}>
            + New
          </button>
        )}
      </div>

      {showCreate && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <input ref={inputRef} type="text" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="ontology-id" disabled={creating}
            style={{ padding: "5px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", outline: "none" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowCreate(false); setNewId(""); setNewName(""); } }} placeholder="Display name" disabled={creating}
              style={{ flex: 1, padding: "5px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", outline: "none" }} />
            <button onClick={handleCreate} disabled={creating || !newId.trim() || !newName.trim()}
              style={{ padding: "5px 10px", borderRadius: 4, border: `1px solid ${theme.palette.emerald}44`, background: `${theme.palette.emerald}1a`, color: !newId.trim() || !newName.trim() ? theme.text.disabled : theme.palette.emerald, fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: creating ? "wait" : "pointer" }}>
              {creating ? "..." : "Create"}
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {ontologies.map(([id, ont]) => {
          const isSelected = selectedId === id;
          const classCount = Object.keys(ont.classes).length;
          const propCount = Object.keys(ont.objectProperties).length + Object.keys(ont.datatypeProperties).length;
          return (
            <button key={id} onClick={() => onSelect(id)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginBottom: 2, borderRadius: 6, border: isSelected ? `1px solid ${theme.palette.cyan}44` : "1px solid transparent", background: isSelected ? `${theme.palette.cyan}1a` : "transparent", color: isSelected ? theme.palette.cyan : theme.text.secondary, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = theme.surface.cardHover; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
              <div>{ont.metadata.name || id}</div>
              <div style={{ fontSize: sz(9), color: theme.text.hint, marginTop: 2 }}>
                {classCount} class{classCount !== 1 ? "es" : ""} · {propCount} prop{propCount !== 1 ? "s" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
