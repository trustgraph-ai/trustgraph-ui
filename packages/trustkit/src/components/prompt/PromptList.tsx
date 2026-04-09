import type { PromptListItem } from "../../hooks/usePromptList";
import { text, surface, palette } from "../../theme";

interface PromptListProps {
  prompts: PromptListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PromptList({
  prompts,
  selectedId,
  onSelect,
  isLoading,
  error,
}: PromptListProps) {
  const systemPrompts = prompts.filter(p => p.isSystem);
  const templates = prompts.filter(p => !p.isSystem);

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        color: text.faint,
        letterSpacing: "0.1em",
        marginBottom: 12,
      }}>
        PROMPTS
      </div>

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
