import { useState, useRef } from "react";
import type { PromptListItem } from "../../hooks/usePromptList";
import { text, border, surface, palette } from "../../theme";

interface PromptListProps {
  prompts: PromptListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate?: (name: string) => Promise<string | null>;
  isLoading?: boolean;
  error?: string | null;
}

export function PromptList({
  prompts,
  selectedId,
  onSelect,
  onCreate,
  isLoading,
  error,
}: PromptListProps) {
  const systemPrompts = prompts.filter(p => p.isSystem);
  const templates = prompts.filter(p => !p.isSystem);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !onCreate) return;
    setCreating(true);
    const newId = await onCreate(newName);
    setCreating(false);
    setNewName("");
    setShowCreate(false);
    if (newId) onSelect(newId);
  };

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: text.faint,
          letterSpacing: "0.1em",
        }}>
          PROMPTS
        </div>

        {onCreate && (
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${showCreate ? palette.emerald + "44" : border.default}`,
              background: showCreate ? `${palette.emerald}1a` : "transparent",
              color: showCreate ? palette.emerald : text.faint,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            + New
          </button>
        )}
      </div>

      {/* New prompt input */}
      {showCreate && (
        <div style={{ marginBottom: 12, display: "flex", gap: 6 }}>
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setShowCreate(false); setNewName(""); }
            }}
            placeholder="prompt-name"
            disabled={creating}
            style={{
              flex: 1,
              padding: "5px 8px",
              borderRadius: 4,
              border: `1px solid ${border.default}`,
              background: surface.card,
              color: text.primary,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              outline: "none",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              border: `1px solid ${palette.emerald}44`,
              background: `${palette.emerald}1a`,
              color: !newName.trim() ? text.disabled : palette.emerald,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              cursor: creating ? "wait" : "pointer",
            }}
          >
            {creating ? "..." : "Create"}
          </button>
        </div>
      )}

      {isLoading && (
        <div style={{
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: palette.amber,
          marginBottom: 8,
        }}>
          loading...
        </div>
      )}

      {error && (
        <div style={{
          fontSize: 11,
          color: palette.red,
          marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {/* System prompt */}
        {systemPrompts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.hint,
              letterSpacing: "0.1em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}>
              System
            </div>
            {systemPrompts.map(p => (
              <PromptItem
                key={p.id}
                item={p}
                isSelected={selectedId === p.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}

        {/* Templates */}
        {templates.length > 0 && (
          <div>
            <div style={{
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              color: text.hint,
              letterSpacing: "0.1em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}>
              Templates ({templates.length})
            </div>
            {templates.map(p => (
              <PromptItem
                key={p.id}
                item={p}
                isSelected={selectedId === p.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PromptItem({
  item,
  isSelected,
  onSelect,
}: {
  item: PromptListItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        marginBottom: 2,
        borderRadius: 6,
        border: isSelected ? `1px solid ${palette.cyan}44` : "1px solid transparent",
        background: isSelected ? `${palette.cyan}1a` : "transparent",
        color: isSelected ? palette.cyan : text.secondary,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = surface.cardHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {item.label}
    </button>
  );
}
