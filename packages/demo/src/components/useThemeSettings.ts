import { useState, useCallback } from "react";
import type { DeepPartial, Theme } from "@trustgraph/trustkit";
import { presets } from "./themePresets";

const STORAGE_KEY = "trustkit-theme-settings";

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
  return { presetIndex: 1, scale: 1 };
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
