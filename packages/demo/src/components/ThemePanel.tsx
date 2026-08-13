import { useState, useRef, useEffect } from "react";
import { useTheme } from "@trustgraph/trustkit";
import { presets } from "./themePresets";
import type { ThemeSettings } from "./useThemeSettings";

export { useThemeSettings } from "./useThemeSettings";
export type { ThemeSettings } from "./useThemeSettings";

export function ThemePanel({ settings }: { settings: ThemeSettings }) {
  const { theme, sz } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: `${sz(6)}px ${sz(12)}px`,
          borderRadius: 6,
          border: `1px solid ${open ? theme.palette.emerald + "88" : theme.border.default}`,
          background: open ? theme.palette.emerald + "20" : "transparent",
          color: open ? theme.palette.emerald : theme.text.muted,
          fontSize: sz(14),
          cursor: "pointer",
          fontFamily: theme.font.mono,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Theme settings"
      >
        &#9881;
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          width: 280,
          background: theme.surface.overlay,
          backdropFilter: "blur(16px)",
          border: `1px solid ${theme.border.medium}`,
          borderRadius: 12,
          padding: 20,
          zIndex: 900,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: theme.text.subtle,
            textTransform: "uppercase",
            marginBottom: 14,
          }}>
            Theme Settings
          </div>

          <label style={{
            fontSize: 11,
            color: theme.text.muted,
            display: "block",
            marginBottom: 6,
          }}>
            Preset
          </label>
          <select
            value={settings.presetIndex}
            onChange={(e) => settings.setPresetIndex(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 6,
              border: `1px solid ${theme.border.medium}`,
              background: theme.surface.base,
              color: theme.text.primary,
              fontSize: 12,
              fontFamily: theme.font.sans,
              marginBottom: 16,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {presets.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>

          <label style={{
            fontSize: 11,
            color: theme.text.muted,
            display: "block",
            marginBottom: 6,
          }}>
            Scale: {settings.scale.toFixed(1)}x
          </label>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.1}
            value={settings.scale}
            onChange={(e) => settings.setScale(Number(e.target.value))}
            style={{
              width: "100%",
              marginBottom: 4,
              accentColor: theme.palette.emerald,
            }}
          />
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: theme.text.faint,
          }}>
            <span>0.8x</span>
            <span>1.0x</span>
            <span>1.4x</span>
          </div>
        </div>
      )}
    </div>
  );
}
