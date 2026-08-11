import { useState, useEffect } from "react";
import { useConfigItems } from "../../hooks/useConfigItems";
import type { ConfigKind, SelectedItem } from "./types";
import { useTheme } from "../../theme/ThemeContext";
import type { Theme } from "../../theme/types";

interface ConfigSidebarProps {
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  generation?: number;
}

interface SectionDef {
  kind: ConfigKind;
  label: string;
  paletteKey: keyof Theme["palette"];
}

const sections: SectionDef[] = [
  { kind: "agent-pattern", label: "Patterns", paletteKey: "cyan" },
  { kind: "agent-task-type", label: "Task Types", paletteKey: "amber" },
  { kind: "tool", label: "Tools", paletteKey: "emerald" },
  { kind: "mcp", label: "MCP Tools", paletteKey: "purple" },
  { kind: "tool-service", label: "Tool Services", paletteKey: "pink" },
];

export function ConfigSidebar({ selected, onSelect, generation }: ConfigSidebarProps) {
  const { theme, sz } = useTheme();

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
        fontSize: sz(10),
        fontFamily: theme.font.mono,
        fontWeight: 600,
        color: theme.text.faint,
        letterSpacing: "0.1em",
      }}>
        AGENT CONFIG
      </div>

      {sections.map((section) => (
        <ConfigSection
          key={section.kind}
          section={section}
          sectionColor={theme.palette[section.paletteKey]}
          selected={selected}
          onSelect={onSelect}
          generation={generation}
        />
      ))}
    </div>
  );
}

function ConfigSection({
  section,
  sectionColor,
  selected,
  onSelect,
  generation,
}: {
  section: SectionDef;
  sectionColor: string;
  selected: SelectedItem | null;
  onSelect: (item: SelectedItem) => void;
  generation?: number;
}) {
  const { theme, sz } = useTheme();
  const { keys, isLoading, error, create, reload } = useConfigItems(section.kind);

  useEffect(() => {
    if (generation) reload();
  }, [generation, reload]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState("");

  const handleCreate = async () => {
    if (!newKey.trim()) return;
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
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <div style={{
          fontSize: sz(9),
          fontFamily: theme.font.mono,
          color: sectionColor,
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
            border: `1px solid ${showCreate ? sectionColor + "44" : theme.border.default}`,
            background: showCreate ? `${sectionColor}1a` : "transparent",
            color: showCreate ? sectionColor : theme.text.faint,
            fontSize: sz(9),
            fontFamily: theme.font.mono,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

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
              border: `1px solid ${theme.border.default}`,
              background: theme.surface.card,
              color: theme.text.primary,
              fontSize: sz(10),
              fontFamily: theme.font.mono,
              outline: "none",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newKey.trim()}
            style={{
              padding: "3px 8px",
              borderRadius: 3,
              border: `1px solid ${sectionColor}44`,
              background: `${sectionColor}1a`,
              color: !newKey.trim() ? theme.text.disabled : sectionColor,
              fontSize: sz(9),
              fontFamily: theme.font.mono,
              cursor: "pointer",
            }}
          >
            ✓
          </button>
        </div>
      )}

      {isLoading && (
        <div style={{ fontSize: sz(10), color: theme.text.hint, fontStyle: "italic" }}>
          loading...
        </div>
      )}
      {error && (
        <div style={{ fontSize: sz(10), color: theme.palette.red }}>{error}</div>
      )}

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
              border: isSelected ? `1px solid ${sectionColor}44` : "1px solid transparent",
              background: isSelected ? `${sectionColor}1a` : "transparent",
              color: isSelected ? sectionColor : theme.text.secondary,
              fontSize: sz(10),
              fontFamily: theme.font.mono,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.background = theme.surface.cardHover;
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
