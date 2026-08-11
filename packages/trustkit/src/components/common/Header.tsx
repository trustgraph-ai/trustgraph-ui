import type { TabKey } from "../../types";
import { useTheme } from "../../theme/ThemeContext";

export interface NavTab {
  key: string;
  label: string;
  icon?: string;
}

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabs?: NavTab[];
  /** @deprecated Use tabs array instead */
  showWorkflows?: boolean;
  /** @deprecated Use tabs array instead */
  showDemos?: boolean;
}

export function Header({ activeTab, onTabChange, tabs, showWorkflows = true, showDemos = true }: HeaderProps) {
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
          <div style={{ fontSize: sz(11), color: theme.text.subtle, fontFamily: theme.font.mono, letterSpacing: "0.05em" }}>
            CONTEXT GRAPH DEMO
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: sz(6), fontFamily: theme.font.mono, fontSize: sz(11) }}>
        {tabs ? tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key as TabKey)}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = theme.surface.cardHover; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              style={{
                padding: `${sz(6)}px ${sz(12)}px`, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${active ? theme.border.medium : theme.border.default}`,
                background: active ? theme.surface.cardHover : "transparent",
                color: active ? theme.text.primary : theme.text.muted,
                fontFamily: theme.font.mono, fontSize: sz(11), fontWeight: active ? 600 : 400,
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >
              {t.icon && <>{t.icon} </>}{t.label}
            </button>
          );
        }) : (
          <>
            {showWorkflows && (
              <button
                onClick={() => onTabChange("home" as TabKey)}
                style={{
                  padding: `${sz(6)}px ${sz(12)}px`, borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${activeTab === "home" ? theme.border.medium : theme.border.default}`,
                  background: activeTab === "home" ? theme.surface.cardHover : "transparent",
                  color: activeTab === "home" ? theme.text.primary : theme.text.muted,
                  fontFamily: theme.font.mono, fontSize: sz(11), fontWeight: activeTab === "home" ? 600 : 400,
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
                  padding: `${sz(6)}px ${sz(12)}px`, borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${activeTab === "demos" ? theme.border.medium : theme.border.default}`,
                  background: activeTab === "demos" ? theme.surface.cardHover : "transparent",
                  color: activeTab === "demos" ? theme.text.primary : theme.text.muted,
                  fontFamily: theme.font.mono, fontSize: sz(11), fontWeight: activeTab === "demos" ? 600 : 400,
                  transition: "all 0.2s",
                }}
              >
                ▷ Demos
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
