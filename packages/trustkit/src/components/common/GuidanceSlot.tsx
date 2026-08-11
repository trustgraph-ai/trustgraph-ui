import { useState, useEffect, useRef, useCallback } from "react";
import Markdown from "react-markdown";
import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";
import { useGuidanceContext } from "./PageGuidance";
import type { ThemePalette } from "../../theme/types";

export type SlotPosition =
  | "below"
  | "below-right"
  | "below-left"
  | "above"
  | "above-right"
  | "above-left"
  | "left"
  | "right";

const positionStyles: Record<SlotPosition, React.CSSProperties> = {
  "below":       { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 10 },
  "below-right": { top: "100%", left: -12, marginTop: 10 },
  "below-left":  { top: "100%", right: -12, marginTop: 10 },
  "above":       { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 10 },
  "above-right": { bottom: "100%", left: -12, marginBottom: 10 },
  "above-left":  { bottom: "100%", right: -12, marginBottom: 10 },
  "left":        { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 10 },
  "right":       { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 10 },
};

type CaretEdge = "top" | "bottom" | "left" | "right";

const caretMap: Record<SlotPosition, { style: React.CSSProperties; edges: CaretEdge[] }> = {
  "below":       { style: { top: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)" }, edges: ["top", "left"] },
  "below-right": { style: { top: -6, left: 18, transform: "rotate(45deg)" }, edges: ["top", "left"] },
  "below-left":  { style: { top: -6, right: 18, transform: "rotate(45deg)" }, edges: ["top", "right"] },
  "above":       { style: { bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)" }, edges: ["bottom", "right"] },
  "above-right": { style: { bottom: -6, left: 18, transform: "rotate(45deg)" }, edges: ["bottom", "left"] },
  "above-left":  { style: { bottom: -6, right: 18, transform: "rotate(45deg)" }, edges: ["bottom", "right"] },
  "left":        { style: { right: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)" }, edges: ["top", "right"] },
  "right":       { style: { left: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)" }, edges: ["bottom", "left"] },
};

interface GuidanceSlotProps {
  id: string;
  buttonOffset?: React.CSSProperties;
}

function resolveColor(color: string | undefined, palette: ThemePalette): string {
  if (!color) return palette.cyan;
  if (color in palette) return palette[color as keyof ThemePalette];
  return color;
}

const defaultButtonOffset: React.CSSProperties = { top: -12, right: "2em" };

export function GuidanceSlot({ id, buttonOffset }: GuidanceSlotProps) {
  const { pageKey, entries, isLoading } = useGuidanceContext();
  const entry = entries.get(id);
  const { theme, sz } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const storageKey = `guidance-dismissed-${pageKey}-${id}`;
  const entryVersion = entry?.version ?? "1";
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!entry) return;
    try {
      const stored = localStorage.getItem(storageKey);
      setVisible(stored !== entryVersion);
    } catch {
      setVisible(true);
    }
  }, [entry, storageKey, entryVersion]);

  useEffect(() => {
    if (visible) {
      const t = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(t);
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    setOpacity(0);
    setTimeout(() => {
      setVisible(false);
      try { localStorage.setItem(storageKey, entryVersion); } catch {}
    }, 200);
  }, [storageKey, entryVersion]);

  const show = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setVisible(true);
  };

  useEffect(() => {
    if (!visible) return;

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
  }, [visible, dismiss]);

  const accentColor = resolveColor(entry?.color, theme.palette);
  const position: SlotPosition = (entry?.position as SlotPosition) || "below-right";
  const pos = positionStyles[position];
  const caret = caretMap[position];
  const ready = !isLoading && !!entry;

  const popoverBg = theme.surface.elevated;
  const borderColor = theme.border.medium;

  const caretBorders: React.CSSProperties = {};
  for (const edge of caret.edges) {
    const key = `border${edge[0].toUpperCase()}${edge.slice(1)}` as keyof React.CSSProperties;
    (caretBorders as Record<string, string>)[key as string] = `1px solid ${borderColor}`;
  }

  return (
    <div style={{
      position: "relative",
      display: "inline-block",
      width: 0,
      height: 0,
      overflow: "visible",
      verticalAlign: "middle",
    }}>
      {ready && (
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            ...(buttonOffset || defaultButtonOffset),
          }}
        >
          <button
            onClick={visible ? dismiss : show}
            title={visible ? "Dismiss guidance" : "Show guidance"}
            style={{
              position: "relative",
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: `1px solid ${accentColor}44`,
              background: visible ? withGlow(accentColor, 0.2) : withGlow(accentColor, 0.08),
              color: accentColor,
              fontSize: sz(12),
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: theme.font.sans,
              padding: 0,
              zIndex: 1000,
            }}
          >
            ?
          </button>

          {visible && (
            <div style={{
              position: "absolute",
              ...pos,
              zIndex: 1000,
              width: 380,
              borderRadius: 12,
              background: popoverBg,
              border: `1px solid ${borderColor}`,
              boxShadow: "0 16px 36px -8px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.05)",
              opacity,
              transition: "opacity 0.2s ease",
            }}>
              {/* Caret arrow */}
              <div style={{
                position: "absolute",
                width: 12,
                height: 12,
                background: popoverBg,
                ...caretBorders,
                ...caret.style,
                zIndex: 1,
              }} />

              <div style={{ padding: 20, position: "relative", zIndex: 2 }}>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: entry.title ? 12 : 0,
                }}>
                  {entry.title && (
                    <div style={{
                      fontSize: sz(14),
                      fontWeight: 600,
                      color: theme.text.primary,
                      fontFamily: theme.font.sans,
                    }}>
                      {entry.title}
                    </div>
                  )}
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
      )}
    </div>
  );
}
