import { useTheme } from "../../theme/ThemeContext";

interface EmptyStateProps {
  /** Descriptive text */
  message: string;
  /** Optional icon above text */
  icon?: string;
  /** Optional action button */
  action?: { label: string; onClick: () => void };
}

/**
 * Standardised empty state display. Italic muted text, centered.
 */
export function EmptyState({ message, icon, action }: EmptyStateProps) {
  const { theme, sz } = useTheme();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      gap: 12,
    }}>
      {icon && (
        <div style={{ fontSize: sz(24), color: theme.text.disabled }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: sz(13),
        color: theme.text.hint,
        fontStyle: "italic",
        textAlign: "center",
        lineHeight: 1.6,
      }}>
        {message}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            fontSize: sz(12),
            color: theme.text.muted,
            background: "none",
            border: `1px solid ${theme.text.disabled}`,
            borderRadius: 6,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
