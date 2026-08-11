import { useState, useCallback } from "react";
import { useTheme } from "@trustgraph/trustkit";
import type { DeepPartial, Theme } from "@trustgraph/trustkit";

const STORAGE_KEY = "trustkit-theme-settings";

interface ThemePreset {
  label: string;
  theme?: DeepPartial<Theme>;
}

const presets: ThemePreset[] = [
  { label: "Dark (default)" },
  {
    label: "Midnight",
    theme: {
      surface: {
        base: "#050510",
        elevated: "#151520",
        overlay: "rgba(8,8,18,0.97)",
        overlayLight: "rgba(8,8,18,0.85)",
        card: "rgba(255,255,255,0.015)",
        cardHover: "rgba(255,255,255,0.03)",
      },
      text: {
        primary: "#c8c8d0",
        secondary: "#a0a0b0",
        muted: "#8888a0",
        subtle: "#686880",
        faint: "#505068",
        disabled: "#404058",
        hint: "#303048",
      },
      border: {
        subtle: "rgba(140,140,255,0.04)",
        default: "rgba(140,140,255,0.07)",
        medium: "rgba(140,140,255,0.12)",
        grid: "rgba(140,140,255,0.02)",
      },
    },
  },
  {
    label: "Light",
    theme: {
      palette: {
        emerald: "#059669",
        pink: "#DB2777",
        blue: "#2563EB",
        amber: "#D97706",
        purple: "#7C3AED",
        rose: "#E11D48",
        cyan: "#0891B2",
        red: "#DC2626",
        orange: "#EA580C",
      },
      surface: {
        base: "#F5F5F7",
        elevated: "#FFFFFF",
        overlay: "rgba(255,255,255,0.97)",
        overlayLight: "rgba(255,255,255,0.85)",
        card: "rgba(0,0,0,0.03)",
        cardHover: "rgba(0,0,0,0.06)",
      },
      text: {
        primary: "#1a1a1a",
        secondary: "#333333",
        muted: "#555555",
        subtle: "#777777",
        faint: "#999999",
        disabled: "#bbbbbb",
        hint: "#cccccc",
      },
      semantic: {
        success: "#059669",
        error: "#DC2626",
        warning: "#D97706",
        info: "#2563EB",
        thinking: "#2563EB",
        observation: "#7C3AED",
        answer: "#059669",
        user: "#D97706",
      },
      border: {
        subtle: "rgba(0,0,0,0.06)",
        default: "rgba(0,0,0,0.1)",
        medium: "rgba(0,0,0,0.15)",
        grid: "rgba(0,0,0,0.04)",
      },
    },
  },
  {
    label: "High Contrast",
    theme: {
      text: {
        primary: "#ffffff",
        secondary: "#e0e0e0",
        muted: "#cccccc",
        subtle: "#aaaaaa",
        faint: "#888888",
        disabled: "#666666",
        hint: "#555555",
      },
      border: {
        subtle: "rgba(255,255,255,0.08)",
        default: "rgba(255,255,255,0.12)",
        medium: "rgba(255,255,255,0.2)",
        grid: "rgba(255,255,255,0.04)",
      },
    },
  },
  {
    label: "Warm",
    theme: {
      surface: {
        base: "#0F0A08",
        elevated: "#221A14",
        overlay: "rgba(20,14,10,0.95)",
        overlayLight: "rgba(20,14,10,0.8)",
        card: "rgba(255,200,150,0.02)",
        cardHover: "rgba(255,200,150,0.04)",
      },
      text: {
        primary: "#e0d8d0",
        secondary: "#c0b8a8",
        muted: "#a09888",
        subtle: "#807868",
        faint: "#605848",
        disabled: "#504838",
        hint: "#403828",
      },
      border: {
        subtle: "rgba(255,200,150,0.04)",
        default: "rgba(255,200,150,0.06)",
        medium: "rgba(255,200,150,0.1)",
        grid: "rgba(255,200,150,0.015)",
      },
    },
  },
];

interface StoredSettings {
  presetIndex: number;
  scale: number;
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        presetIndex: typeof parsed.presetIndex === "number" ? parsed.presetIndex : 0,
        scale: typeof parsed.scale === "number" ? parsed.scale : 1,
      };
    }
  } catch { /* ignore */ }
  return { presetIndex: 0, scale: 1 };
}

function saveSettings(s: StoredSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export interface ThemeSettings {
  presetIndex: number;
  scale: number;
  theme?: DeepPartial<Theme>;
  setPresetIndex: (i: number) => void;
  setScale: (s: number) => void;
}

export function useThemeSettings(): ThemeSettings {
  const [presetIndex, setPresetIndexRaw] = useState(() => loadSettings().presetIndex);
  const [scale, setScaleRaw] = useState(() => loadSettings().scale);

  const setPresetIndex = useCallback((i: number) => {
    setPresetIndexRaw(i);
    saveSettings({ presetIndex: i, scale });
  }, [scale]);

  const setScale = useCallback((s: number) => {
    setScaleRaw(s);
    saveSettings({ presetIndex, scale: s });
  }, [presetIndex]);

  return {
    presetIndex,
    scale,
    theme: presets[presetIndex]?.theme,
    setPresetIndex,
    setScale,
  };
}

export function ThemePanel({ settings }: { settings: ThemeSettings }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: "fixed",
      bottom: 60,
      left: 28,
      zIndex: 900,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 8,
    }}>
      {open && (
        <div style={{
          width: 280,
          background: theme.surface.overlay,
          backdropFilter: "blur(16px)",
          border: `1px solid ${theme.border.medium}`,
          borderRadius: 12,
          padding: 20,
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

      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1px solid ${open ? theme.palette.emerald + "88" : theme.border.medium}`,
          background: open ? theme.palette.emerald + "20" : theme.surface.overlay,
          backdropFilter: "blur(8px)",
          color: open ? theme.palette.emerald : theme.text.subtle,
          fontSize: 18,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Theme settings"
      >
        &#9881;
      </button>
    </div>
  );
}
