import type { Theme } from "./types";

export const defaultTheme: Theme = {
  palette: {
    emerald: "#6EE7B7",
    pink: "#F9A8D4",
    blue: "#93C5FD",
    amber: "#FCD34D",
    purple: "#C4B5FD",
    rose: "#FDA4AF",
    cyan: "#67E8F9",
    red: "#FCA5A5",
    orange: "#F97316",
  },
  semantic: {
    success: "#6EE7B7",
    error: "#f66",
    warning: "#F97316",
    info: "#93C5FD",
    thinking: "#93C5FD",
    observation: "#C4B5FD",
    answer: "#6EE7B7",
    user: "#FCD34D",
  },
  text: {
    primary: "#ddd",
    secondary: "#bbb",
    muted: "#aaa",
    subtle: "#888",
    faint: "#666",
    disabled: "#555",
    hint: "#444",
  },
  surface: {
    base: "#0A0A0F",
    overlay: "rgba(15,15,20,0.95)",
    overlayLight: "rgba(15,15,20,0.8)",
    card: "rgba(255,255,255,0.02)",
    cardHover: "rgba(255,255,255,0.04)",
  },
  border: {
    subtle: "rgba(255,255,255,0.04)",
    default: "rgba(255,255,255,0.06)",
    medium: "rgba(255,255,255,0.1)",
    grid: "rgba(255,255,255,0.015)",
  },
  font: {
    mono: "'IBM Plex Mono', monospace",
    sans: "'IBM Plex Sans', -apple-system, sans-serif",
  },
};
