import type { TabKey } from "../../types";
import { useTheme } from "../../theme/ThemeContext";

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  showWorkflows?: boolean;
  showDemos?: boolean;
}

export function Header({ activeTab, onTabChange, showWorkflows = true, showDemos = true }: HeaderProps) {
  const { theme, sz } = useTheme();

  return (
    <div style={{
      padding: `${sz(16)}px ${sz(28)}px`, display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div
        onClick={() => onTabChange("home" as TabKey)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTabChange("home" as TabKey); }}
        title="Back to Workflows"
        style={{ display: "flex", alignItems: "center", gap: sz(14), cursor: "pointer" }}
      >
        <img
          src="/tg.svg"
          alt="TrustGraph"
          style={{ width: sz(36), height: sz(36), borderRadius: 8 }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: sz(16), letterSpacing: "-0.02em", color: theme.text.primary }}>
            TrustGraph
          </div>
          <div style={{ fontSize: sz(11), color: theme.text.subtle, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }}>
            CONTEXT GRAPH DEMO
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: sz(6), fontFamily: "'IBM Plex Mono', monospace", fontSize: sz(12) }}>
        {showWorkflows && (
          <button
            onClick={() => onTabChange("home" as TabKey)}
            style={{
              padding: `${sz(7)}px ${sz(16)}px`, borderRadius: 6, border: "none", cursor: "pointer",
              background: activeTab === "home" ? theme.surface.cardHover : "transparent",
              color: activeTab === "home" ? theme.text.primary : theme.text.muted,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: sz(12), fontWeight: activeTab === "home" ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            ⌂ Workflows
          </button>
        )}
        {showDemos && (
          <button
            onClick={() => onTabChange("demos" as TabKey)}
            style={{
              padding: `${sz(7)}px ${sz(16)}px`, borderRadius: 6, border: "none", cursor: "pointer",
              background: activeTab === "demos" ? theme.surface.cardHover : "transparent",
              color: activeTab === "demos" ? theme.text.primary : theme.text.muted,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: sz(12), fontWeight: activeTab === "demos" ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            ▷ Demos
          </button>
        )}
      </div>
    </div>
  );
}
