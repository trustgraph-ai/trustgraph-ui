import type { ReactNode } from "react";
import { text } from "../../theme";

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
              color: subtitleColor || text.muted,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
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
                color: text.faint,
                cursor: "pointer",
                fontSize: 18,
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
          fontSize: 20,
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
