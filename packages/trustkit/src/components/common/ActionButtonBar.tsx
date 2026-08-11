import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";
import { useActionButtons } from "../../hooks/useActionButtons";
import type { ActionButtonEntry } from "../../hooks/useActionButtons";
import type { ThemePalette } from "../../theme/types";

function resolveColor(color: string | undefined, palette: ThemePalette): string {
  if (!color) return palette.cyan;
  if (color in palette) return palette[color as keyof ThemePalette];
  return color;
}

interface ActionButtonProps {
  entry: ActionButtonEntry;
}

function ActionButton({ entry }: ActionButtonProps) {
  const { theme, sz } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };

    document.addEventListener("keydown", handleEsc);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, dismiss]);

  const accentColor = resolveColor(entry.color, theme.palette);
  const popoverBg = theme.surface.elevated;
  const borderColor = theme.border.medium;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: `${sz(6)}px ${sz(12)}px`,
          borderRadius: 6,
          border: `1px solid ${open ? accentColor + "44" : theme.border.default}`,
          background: open ? withGlow(accentColor, 0.12) : "transparent",
          color: open ? accentColor : theme.text.muted,
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {entry.icon && <span>{entry.icon}</span>}
        {entry.label}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          zIndex: 1000,
          width: 380,
          borderRadius: 12,
          background: popoverBg,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 16px 36px -8px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05)",
        }}>
          {/* Caret */}
          <div style={{
            position: "absolute",
            top: -6,
            right: 18,
            width: 12,
            height: 12,
            background: popoverBg,
            borderTop: `1px solid ${borderColor}`,
            borderLeft: `1px solid ${borderColor}`,
            transform: "rotate(45deg)",
            zIndex: 1,
          }} />

          <div style={{ padding: 20, position: "relative", zIndex: 2 }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: sz(14),
                fontWeight: 600,
                color: theme.text.primary,
                fontFamily: theme.font.sans,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                {entry.icon && <span>{entry.icon}</span>}
                {entry.label}
              </div>
              <button
                onClick={dismiss}
                style={{
                  background: "none",
                  border: "none",
                  color: theme.text.muted,
                  fontSize: sz(13),
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0,
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
              >
                ✕
              </button>
            </div>
            <div style={{
              fontSize: sz(12),
              color: theme.text.muted,
              lineHeight: 1.7,
              fontFamily: theme.font.sans,
            }}>
              <Markdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: accentColor, textDecoration: "underline" }}
                    >
                      {children}
                    </a>
                  ),
                  p: ({ children }) => (
                    <p style={{ margin: "0 0 8px", lineHeight: 1.7 }}>{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ margin: "0 0 8px", paddingLeft: 20 }}>{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: 4 }}>{children}</li>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontSize: sz(13), fontWeight: 600, color: theme.text.primary, margin: "0 0 8px" }}>{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontSize: sz(12), fontWeight: 600, color: theme.text.primary, margin: "0 0 6px" }}>{children}</h3>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ color: theme.text.primary }}>{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em style={{ color: theme.text.subtle }}>{children}</em>
                  ),
                }}
              >
                {entry.body}
              </Markdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionButtonBarProps {
  configKey: string;
}

export function ActionButtonBar({ configKey }: ActionButtonBarProps) {
  const { buttons, isLoading } = useActionButtons(configKey);

  if (isLoading || buttons.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {buttons.map(entry => (
        <ActionButton key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
