import { useState, useRef, useEffect } from "react";
import {
  useWorkspace,
  useCollections,
  useFlows,
  useSessionStore,
  useSettings,
} from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";

const FONT = "${theme.font.mono}";

function Pill({
  label,
  value,
  color,
  items,
  onSelect,
}: {
  label: string;
  value: string;
  color: string;
  items: string[];
  onSelect: (id: string) => void;
}) {
  const { theme, sz } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const single = items.length <= 1;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => !single && setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: sz(6),
          padding: `${sz(4)}px ${sz(10)}px`,
          borderRadius: 6,
          border: `1px solid ${color}33`,
          background: `${color}0D`,
          color: color,
          fontSize: sz(11),
          fontFamily: FONT,
          cursor: single ? "default" : "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ opacity: 0.6, fontSize: sz(10) }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}</span>
        {!single && (
          <span style={{ fontSize: sz(8), opacity: 0.5 }}>▼</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 160,
            maxHeight: "min(400px, 60vh)",
            overflowY: "auto",
            background: theme.surface.base,
            border: `1px solid ${color}33`,
            borderRadius: 8,
            padding: 4,
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {[...items].sort((a, b) => a.localeCompare(b)).map((id) => (
            <div
              key={id}
              onClick={() => {
                onSelect(id);
                setOpen(false);
              }}
              style={{
                padding: `${sz(6)}px ${sz(10)}px`,
                borderRadius: 4,
                cursor: "pointer",
                fontSize: sz(11),
                fontFamily: FONT,
                color: id === value ? color : theme.text.muted,
                fontWeight: id === value ? 600 : 400,
                background: id === value ? `${color}11` : "transparent",
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                if (id !== value) e.currentTarget.style.background = `${color}0A`;
              }}
              onMouseLeave={(e) => {
                if (id !== value) e.currentTarget.style.background = "transparent";
              }}
            >
              {id}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSwitcher() {
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const { collections } = useCollections();
  const { flows } = useFlows();
  const flowId = useSessionStore((s) => s.flowId);
  const setFlowId = useSessionStore((s) => s.setFlowId);
  const { settings, updateSetting } = useSettings();
  const collection = settings.collection;
  const { theme, sz } = useTheme();

  const workspaceIds = workspaces.map((w) => w.id);

  const collList = Array.isArray(collections) ? collections as Array<{ collection?: string; name?: string }> : [];
  const collectionIds = collList.length > 0
    ? collList.map((c) => c.collection || c.name || "default")
    : ["default"];

  const flowList = Array.isArray(flows) ? flows as Array<{ id: string }> : [];
  const flowIds = flowList.length > 0
    ? flowList.map((f) => f.id)
    : [flowId];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: sz(6) }}>
      {workspaceIds.length > 0 && (
        <Pill
          label="WS"
          value={activeWorkspace || "—"}
          color={theme.palette.cyan}
          items={workspaceIds}
          onSelect={switchWorkspace}
        />
      )}
      <Pill
        label="COL"
        value={collection}
        color={theme.palette.emerald}
        items={collectionIds}
        onSelect={(id) => updateSetting("collection", id)}
      />
      <Pill
        label="FLOW"
        value={flowId}
        color={theme.palette.amber}
        items={flowIds}
        onSelect={setFlowId}
      />
    </div>
  );
}
