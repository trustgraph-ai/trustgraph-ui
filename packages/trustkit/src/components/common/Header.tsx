import type { TabKey } from "../../types";

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <div style={{
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "linear-gradient(180deg, rgba(15,15,22,1) 0%, rgba(10,10,15,1) 100%)",
    }}>
      <div
        onClick={() => onTabChange("home" as TabKey)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTabChange("home" as TabKey); }}
        title="Back to Workflows"
        style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
      >
        <img
          src="/tg.svg"
          alt="TrustGraph"
          style={{ width: 36, height: 36, borderRadius: 8 }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "#fff" }}>
            TrustGraph
          </div>
          <div style={{ fontSize: 11, color: "#666", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }}>
            CONTEXT GRAPH DEMO
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button
          onClick={() => onTabChange("home" as TabKey)}
          style={{
            padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer",
            background: activeTab === "home" ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeTab === "home" ? "#fff" : "#666",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: activeTab === "home" ? 600 : 400,
            transition: "all 0.2s",
          }}
        >
          ⌂ Workflows
        </button>
        <button
          onClick={() => onTabChange("demos" as TabKey)}
          style={{
            padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer",
            background: activeTab === "demos" ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeTab === "demos" ? "#fff" : "#666",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: activeTab === "demos" ? 600 : 400,
            transition: "all 0.2s",
          }}
        >
          ▷ Demos
        </button>
      </div>
    </div>
  );
}
