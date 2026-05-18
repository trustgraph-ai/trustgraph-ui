import { text } from "../../theme";

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
        <div style={{ fontSize: 24, color: text.disabled }}>
          {icon}
        </div>
      )}
      <div style={{
        fontSize: 13,
        color: text.hint,
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
            fontSize: 12,
            color: text.muted,
            background: "none",
            border: `1px solid ${text.disabled}`,
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
