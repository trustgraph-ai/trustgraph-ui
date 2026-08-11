import { useState } from "react";
import { useTheme } from "../../theme/ThemeContext";

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
          <button
            onClick={() => setShowPresets(!showPresets)}
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: `1px solid ${theme.border.medium}`,
              background: theme.surface.card,
              color: theme.text.subtle,
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Examples ▾
          </button>
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
                <button
                  key={p.key}
                  onClick={() => {
                    onChange(p.query);
                    setShowPresets(false);
                  }}
                  title={p.query}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "6px 10px",
                    border: "none",
                    borderRadius: 4,
                    background: "transparent",
                    color: theme.text.muted,
                    fontSize: sz(11),
                    fontFamily: theme.font.mono,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                >
                  {p.title}
                </button>
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
      <button
        onClick={onSubmit}
        disabled={isDisabled}
        style={{
          padding: "12px 20px",
          borderRadius: 8,
          border: `1px solid ${resolvedButtonColor}44`,
          background: isDisabled ? theme.surface.card : `${resolvedButtonColor}1a`,
          color: isDisabled ? theme.text.disabled : resolvedButtonColor,
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontSize: sz(13),
          fontWeight: 600,
          fontFamily: theme.font.mono,
        }}
      >
        {isLoading ? "..." : buttonText}
      </button>
    </div>
  );
}
