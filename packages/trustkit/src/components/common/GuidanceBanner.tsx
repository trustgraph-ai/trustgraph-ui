import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";

export type GuidancePosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right";

export interface GuidanceEntry {
  id: string;
  title?: string;
  body: string;
  color?: string;
  position?: GuidancePosition;
  version?: string;
}

interface GuidanceBannerProps {
  id: string;
  title?: string;
  body?: string;
  children?: React.ReactNode;
  color?: string;
  position?: GuidancePosition;
}

const positionStyles: Record<GuidancePosition, React.CSSProperties> = {
  "top-left":     { top: 20, left: 20 },
  "top-right":    { top: 20, right: 20 },
  "bottom-left":  { bottom: 20, left: 20 },
  "bottom-right": { bottom: 20, right: 20 },
  "top":          { top: 20, left: "50%", transform: "translateX(-50%)" },
  "bottom":       { bottom: 20, left: "50%", transform: "translateX(-50%)" },
  "left":         { top: "50%", left: 20, transform: "translateY(-50%)" },
  "right":        { top: "50%", right: 20, transform: "translateY(-50%)" },
};

export function GuidanceBanner({ id, title, body, children, color, position = "bottom-right" }: GuidanceBannerProps) {
  const { theme, sz } = useTheme();
  const accentColor = color || theme.palette.cyan;
  const pos = positionStyles[position];

  const storageKey = `guidance-dismissed-${id}`;
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(storageKey) !== "1"; }
    catch { return true; }
  });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (visible) {
      const t = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(t);
    }
  }, [visible]);

  const dismiss = () => {
    setOpacity(0);
    setTimeout(() => {
      setVisible(false);
      try { localStorage.setItem(storageKey, "1"); } catch {}
    }, 200);
  };

  const show = () => {
    try { localStorage.removeItem(storageKey); } catch {}
    setVisible(true);
  };

  if (!visible) {
    return (
      <button
        onClick={show}
        title="Show guidance"
        style={{
          position: "fixed",
          ...pos,
          zIndex: 1000,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `1px solid ${accentColor}44`,
          background: withGlow(accentColor, 0.12),
          color: accentColor,
          fontSize: sz(14),
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.font.sans,
          backdropFilter: "blur(8px)",
        }}
      >
        ?
      </button>
    );
  }

  const content = body ? (
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
          <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>{children}</p>
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
          <em style={{ color: theme.text.muted }}>{children}</em>
        ),
      }}
    >
      {body}
    </Markdown>
  ) : children;

  return (
    <div style={{
      position: "fixed",
      ...pos,
      zIndex: 1000,
      maxWidth: 420,
      borderRadius: 10,
      background: theme.surface.overlay,
      border: `1px solid ${accentColor}33`,
      boxShadow: `0 8px 32px ${theme.surface.base}cc`,
      backdropFilter: "blur(12px)",
      opacity,
      transition: "opacity 0.2s ease",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: 3,
        background: accentColor,
        borderRadius: "10px 0 0 10px",
      }} />

      <div style={{ padding: "14px 16px 14px 20px" }}>
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            {title && (
              <div style={{
                fontSize: sz(13),
                fontWeight: 600,
                color: accentColor,
                marginBottom: 6,
                fontFamily: theme.font.sans,
              }}>
                {title}
              </div>
            )}
            <div style={{
              fontSize: sz(12),
              color: theme.text.secondary,
              lineHeight: 1.6,
              fontFamily: theme.font.sans,
            }}>
              {content}
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              color: theme.text.disabled,
              fontSize: sz(14),
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
