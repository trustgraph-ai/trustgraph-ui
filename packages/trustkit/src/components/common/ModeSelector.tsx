import { border, text } from "../../theme";

interface Mode {
  key: string;
  label: string;
}

interface ModeSelectorProps {
  /** Available modes */
  modes: Mode[];
  /** Currently selected mode key */
  activeMode: string;
  /** Mode changed */
  onChange: (key: string) => void;
  /** Active accent colour */
  color?: string;
  /** Disable all buttons */
  disabled?: boolean;
}

/**
 * Horizontal row of mode buttons for switching between views or query types.
 */
export function ModeSelector({
  modes,
  activeMode,
  onChange,
  color = "#67E8F9",
  disabled,
}: ModeSelectorProps) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {modes.map((mode) => {
        const isActive = activeMode === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => onChange(mode.key)}
            disabled={disabled}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              cursor: disabled ? "default" : "pointer",
              background: isActive ? `${color}26` : "transparent",
              border: `1px solid ${isActive ? `${color}66` : border.default}`,
              color: isActive ? color : text.muted,
              opacity: disabled ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
