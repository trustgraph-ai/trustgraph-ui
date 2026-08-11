import { useTheme } from "../../theme/ThemeContext";

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
  color,
  disabled,
}: ModeSelectorProps) {
  const { theme, sz } = useTheme();
  const accent = color ?? theme.palette.cyan;

  return (
    <div style={{ display: "flex", gap: sz(4) }}>
      {modes.map((mode) => {
        const isActive = activeMode === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => onChange(mode.key)}
            disabled={disabled}
            style={{
              padding: `${sz(5)}px ${sz(14)}px`,
              borderRadius: 6,
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              fontWeight: 600,
              cursor: disabled ? "default" : "pointer",
              background: isActive ? `${accent}26` : "transparent",
              border: `1px solid ${isActive ? `${accent}66` : theme.border.default}`,
              color: isActive ? accent : theme.text.muted,
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
