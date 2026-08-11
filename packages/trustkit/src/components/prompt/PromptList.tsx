import { useState, useRef } from "react";
import type { PromptListItem } from "../../hooks/usePromptList";
import { useTheme } from "../../theme/ThemeContext";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { SelectableListItem } from "../common/SelectableListItem";

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
  const { theme, sz } = useTheme();
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
          fontSize: sz(10),
          fontFamily: theme.font.mono,
          fontWeight: 600,
          color: theme.text.faint,
          letterSpacing: "0.1em",
        }}>
          PROMPTS
        </div>

        {onCreate && (
          <Button size="sm" color={showCreate ? theme.palette.emerald : undefined} active={showCreate}
            onClick={() => { setShowCreate(!showCreate); setTimeout(() => inputRef.current?.focus(), 50); }}>
            + New
          </Button>
        )}
      </div>

      {showCreate && (
        <div style={{ marginBottom: 12, display: "flex", gap: 6 }}>
          <Input
            ref={inputRef}
            value={newName}
            onChange={setNewName}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setNewName(""); }}
            placeholder="prompt-name"
            disabled={creating}
            style={{ flex: 1 }}
          />
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}
            color={theme.palette.emerald} style={{ cursor: creating ? "wait" : "pointer" }}>
            {creating ? "..." : "Create"}
          </Button>
        </div>
      )}

      {isLoading && (
        <div style={{
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          color: theme.palette.amber,
          marginBottom: 8,
        }}>
          loading...
        </div>
      )}

      {error && (
        <div style={{
          fontSize: sz(11),
          color: theme.palette.red,
          marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {systemPrompts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: sz(9),
              fontFamily: theme.font.mono,
              color: theme.text.hint,
              letterSpacing: "0.1em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}>
              System
            </div>
            {systemPrompts.map(p => (
              <SelectableListItem key={p.id} isSelected={selectedId === p.id} onClick={() => onSelect(p.id)}>
                {p.label}
              </SelectableListItem>
            ))}
          </div>
        )}

        {templates.length > 0 && (
          <div>
            <div style={{
              fontSize: sz(9),
              fontFamily: theme.font.mono,
              color: theme.text.hint,
              letterSpacing: "0.1em",
              marginBottom: 6,
              textTransform: "uppercase",
            }}>
              Templates ({templates.length})
            </div>
            {templates.map(p => (
              <SelectableListItem key={p.id} isSelected={selectedId === p.id} onClick={() => onSelect(p.id)}>
                {p.label}
              </SelectableListItem>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
