import { useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "./Button";
import { SelectableListItem } from "./SelectableListItem";
import { GuidanceSlot } from "./GuidanceSlot";

export interface SearchPreset {
  key: string;
  title: string;
  query: string;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  buttonText?: string;
  isLoading?: boolean;
  buttonColor?: string;
  disabled?: boolean;
  presets?: SearchPreset[];
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Search...",
  buttonText = "Search",
  isLoading = false,
  buttonColor,
  disabled = false,
  presets,
}: SearchInputProps) {
  const { theme, sz } = useTheme();
  const resolvedButtonColor = buttonColor ?? theme.palette.blue;
  const [showPresets, setShowPresets] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const isDisabled = disabled || isLoading || !value.trim();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {presets && presets.length > 0 && (
        <div style={{ position: "relative" }}>
          <Button size="lg" onClick={() => setShowPresets(!showPresets)} active={false}
            style={{ padding: "12px 14px", border: `1px solid ${theme.border.medium}`, background: theme.surface.card, color: theme.text.subtle }}>
            Examples ▾
          </Button>
          {showPresets && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              background: "#1a1a22",
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
              padding: 4,
              zIndex: 20,
              minWidth: 280,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}>
              {presets.map((p) => (
                <SelectableListItem
                  key={p.key}
                  isSelected={false}
                  onClick={() => { onChange(p.query); setShowPresets(false); }}
                  style={{ padding: "6px 10px", marginBottom: 0, borderRadius: 4, color: theme.text.muted }}>
                  {p.title}
                </SelectableListItem>
              ))}
            </div>
          )}
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        style={{
          flex: 1,
          padding: "12px 16px",
          borderRadius: 8,
          border: `1px solid ${theme.border.medium}`,
          background: theme.surface.card,
          color: theme.text.primary,
          fontSize: sz(14),
          fontFamily: theme.font.sans,
          outline: "none",
        }}
      />
      <Button size="lg" onClick={onSubmit} disabled={isDisabled}
        color={resolvedButtonColor} active={!isDisabled}
        style={{ padding: "12px 20px", fontSize: sz(13) }}>
        {isLoading ? "..." : buttonText}
      </Button>
      <GuidanceSlot id="query-input" buttonOffset={{ top: -12, left: -12 }} />
    </div>
  );
}
