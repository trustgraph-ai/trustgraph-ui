import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeContext";

interface DetailPanelProps {
  /** Panel heading */
  title?: string;
  /** Secondary text (e.g. type label) */
  subtitle?: string;
  /** Subtitle colour */
  subtitleColor?: string;
  /** Close handler */
  onClose?: () => void;
  /** Panel content */
  children: ReactNode;
  /** Internal padding */
  padding?: number;
}

/**
 * Panel content for inspecting a selected item. Provides a header
 * with title, subtitle, and close button, plus a scrollable content area.
 *
 * This is the *content* of a panel — use inside SplitPane's `panel` prop
 * or any other container. It does not handle its own positioning.
 */
export function DetailPanel({
  title,
  subtitle,
  subtitleColor,
  onClose,
  children,
  padding = 24,
}: DetailPanelProps) {
  const { theme, sz } = useTheme();

  return (
    <div style={{ padding }}>
      {/* Header */}
      {(subtitle || onClose) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}>
          {subtitle && (
            <div style={{
              color: subtitleColor || theme.text.muted,
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              fontWeight: 600,
            }}>
              {subtitle}
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: theme.text.faint,
                cursor: "pointer",
                fontSize: sz(18),
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Title */}
      {title && (
        <div style={{
          fontSize: sz(20),
          fontWeight: 700,
          color: "#fff",
          marginBottom: 6,
        }}>
          {title}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}
