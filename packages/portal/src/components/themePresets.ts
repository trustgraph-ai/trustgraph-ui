import type { DeepPartial, Theme } from "@trustgraph/trustkit";

export interface ThemePreset {
  label: string;
  theme?: DeepPartial<Theme>;
}

export const presets: ThemePreset[] = [
  { label: "Dark" },
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
