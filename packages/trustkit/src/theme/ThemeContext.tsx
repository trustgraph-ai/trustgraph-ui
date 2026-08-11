import { createContext, useContext, useMemo } from "react";
import { defaultTheme } from "./defaultTheme";
import { withGlow } from "./glow";
import type { Theme, DeepPartial } from "./types";

export interface ThemeContextValue {
  theme: Theme;
  scale: number;
  sz: (px: number) => number;
  withGlow: (hex: string, opacity?: number) => string;
  domainColors: Array<{ color: string; glow: string }>;
}

function buildDomainColors(p: Theme["palette"]): ThemeContextValue["domainColors"] {
  return [
    { color: p.emerald, glow: withGlow(p.emerald) },
    { color: p.pink, glow: withGlow(p.pink) },
    { color: p.blue, glow: withGlow(p.blue) },
    { color: p.amber, glow: withGlow(p.amber) },
    { color: p.purple, glow: withGlow(p.purple) },
    { color: p.rose, glow: withGlow(p.rose) },
    { color: p.cyan, glow: withGlow(p.cyan) },
    { color: p.red, glow: withGlow(p.red) },
  ];
}

function deepMerge(base: Theme, override: DeepPartial<Theme>): Theme {
  return {
    palette: { ...base.palette, ...override.palette },
    semantic: { ...base.semantic, ...override.semantic },
    text: { ...base.text, ...override.text },
    surface: { ...base.surface, ...override.surface },
    border: { ...base.border, ...override.border },
    font: { ...base.font, ...override.font },
  };
}

const defaultContextValue: ThemeContextValue = {
  theme: defaultTheme,
  scale: 1,
  sz: (px: number) => px,
  withGlow,
  domainColors: buildDomainColors(defaultTheme.palette),
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export interface ThemeProviderProps {
  theme?: DeepPartial<Theme>;
  scale?: number;
  children: React.ReactNode;
}

export function ThemeProvider({ theme: overrides, scale = 1, children }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(() => {
    const merged: Theme = overrides ? deepMerge(defaultTheme, overrides) : defaultTheme;
    const sz = scale === 1 ? (px: number) => px : (px: number) => Math.round(px * scale);
    return {
      theme: merged,
      scale,
      sz,
      withGlow,
      domainColors: buildDomainColors(merged.palette),
    };
  }, [overrides, scale]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
