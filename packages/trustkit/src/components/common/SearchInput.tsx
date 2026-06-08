import { useState } from "react";
import { text, surface, border, palette } from "../../theme";

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
  buttonColor = palette.blue,
  disabled = false,
  presets,
}: SearchInputProps) {
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
              border: `1px solid ${border.medium}`,
              background: surface.card,
              color: text.subtle,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
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
              border: `1px solid ${border.default}`,
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
                    color: text.muted,
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
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
          border: `1px solid ${border.medium}`,
          background: surface.card,
          color: text.primary,
          fontSize: 14,
          fontFamily: "'IBM Plex Sans', sans-serif",
          outline: "none",
        }}
      />
      <button
        onClick={onSubmit}
        disabled={isDisabled}
        style={{
          padding: "12px 20px",
          borderRadius: 8,
          border: `1px solid ${buttonColor}44`,
          background: isDisabled ? surface.card : `${buttonColor}1a`,
          color: isDisabled ? text.disabled : buttonColor,
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {isLoading ? "..." : buttonText}
      </button>
    </div>
  );
}
