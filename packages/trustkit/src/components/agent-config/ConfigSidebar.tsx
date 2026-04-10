import { useState } from "react";
import { useConfigItems } from "../../hooks/useConfigItems";
import type { ConfigKind, SelectedItem } from "./types";
import { text, border, surface, palette } from "../../theme";

interface ConfigSidebarProps {
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
}

interface SectionDef {
  kind: ConfigKind;
  label: string;
  color: string;
}

const sections: SectionDef[] = [
  { kind: "agent-pattern", label: "Patterns", color: palette.cyan },
  { kind: "agent-task-type", label: "Task Types", color: palette.amber },
  { kind: "tool", label: "Tools", color: palette.emerald },
  { kind: "mcp", label: "MCP Tools", color: palette.purple },
  { kind: "tool-service", label: "Tool Services", color: palette.pink },
];

export function ConfigSidebar({ selected, onSelect }: ConfigSidebarProps) {
  return (
    <div style={{
      padding: 16,
      height: "100%",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        color: text.faint,
        letterSpacing: "0.1em",
      }}>
        AGENT CONFIG
      </div>

      {sections.map((section) => (
        <ConfigSection
          key={section.kind}
          section={section}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ConfigSection({
  section,
  selected,
  onSelect,
}: {
  section: SectionDef;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
}) {
  const { keys, isLoading, error, create, reload } = useConfigItems(section.kind);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState("");

  const handleCreate = async () => {
    if (!newKey.trim()) return;
    // Stub default values per kind
    const defaults: Record<ConfigKind, object> = {
      "agent-pattern": { name: newKey, description: "", max_iterations: 10 },
      "agent-task-type": { name: newKey, description: "", framing: "", valid_patterns: [] },
      "tool": { name: newKey, description: "", type: "knowledge-query", arguments: [] },
      "mcp": { "remote-name": "", url: "", "auth-token": "" },
      "tool-service": { id: newKey, "request-queue": "", "response-queue": "", "config-params": [] },
    };
    const ok = await create(newKey, defaults[section.kind]);
    if (ok) {
      setNewKey("");
      setShowCreate(false);
      onSelect({ kind: section.kind, key: newKey });
      reload();
    }
  };

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: 9,
          fontFamily: "'IBM Plex Mono', monospace",
          color: section.color,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          {section.label} ({keys.length})
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "1px 6px",
            borderRadius: 3,
            border: `1px solid ${showCreate ? section.color + "44" : border.default}`,
            background: showCreate ? `${section.color}1a` : "transparent",
            color: showCreate ? section.color : text.faint,
            fontSize: 9,
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {/* New item input */}
      {showCreate && (
        <div style={{ marginBottom: 6, display: "flex", gap: 4 }}>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setShowCreate(false); setNewKey(""); }
            }}
            placeholder="name"
            autoFocus
            style={{
              flex: 1,
              padding: "3px 6px",
              borderRadius: 3,
              border: `1px solid ${border.default}`,
              background: surface.card,
              color: text.primary,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              outline: "none",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newKey.trim()}
            style={{
              padding: "3px 8px",
              borderRadius: 3,
              border: `1px solid ${section.color}44`,
              background: `${section.color}1a`,
              color: !newKey.trim() ? text.disabled : section.color,
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
          >
            ✓
          </button>
        </div>
      )}

      {/* Loading / error */}
      {isLoading && (
        <div style={{ fontSize: 10, color: text.hint, fontStyle: "italic" }}>
          loading...
        </div>
      )}
      {error && (
        <div style={{ fontSize: 10, color: palette.red }}>{error}</div>
      )}

      {/* Items */}
      {keys.map((key) => {
        const isSelected = selected?.kind === section.kind && selected?.key === key;
        return (
          <button
            key={key}
            onClick={() => onSelect({ kind: section.kind, key })}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "4px 8px",
              marginBottom: 1,
              borderRadius: 4,
              border: isSelected ? `1px solid ${section.color}44` : "1px solid transparent",
              background: isSelected ? `${section.color}1a` : "transparent",
              color: isSelected ? section.color : text.secondary,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = surface.cardHover;
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.background = "transparent";
            }}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
