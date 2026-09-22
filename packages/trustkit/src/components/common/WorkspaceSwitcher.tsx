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

interface PillItem {
  id: string;
  name?: string;
  description?: string;
}

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
  items: PillItem[];
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
          padding: `${sz(6)}px ${sz(12)}px`,
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
        <span style={{ fontWeight: 600 }}>{items.find((i) => i.id === value)?.name || value}</span>
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
          {[...items].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)).map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
              style={{
                padding: `${sz(6)}px ${sz(10)}px`,
                borderRadius: 4,
                cursor: "pointer",
                fontSize: sz(11),
                fontFamily: FONT,
                color: item.id === value ? color : theme.text.muted,
                fontWeight: item.id === value ? 600 : 400,
                background: item.id === value ? `${color}11` : "transparent",
                transition: "all 0.1s",
              }}
              onMouseEnter={(e) => {
                if (item.id !== value) e.currentTarget.style.background = `${color}0A`;
              }}
              onMouseLeave={(e) => {
                if (item.id !== value) e.currentTarget.style.background = "transparent";
              }}
            >
              <div>{item.name || item.id}</div>
              {item.description && (
                <div style={{
                  fontSize: sz(9), color: theme.text.muted,
                  fontWeight: 400, marginTop: 2,
                }}>
                  {item.description}
                </div>
              )}
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

  const workspaceItems: PillItem[] = workspaces.map((w) => ({
    id: w.id,
    name: (w as any).name || undefined,
  }));

  const collList = Array.isArray(collections) ? collections as Array<{ collection?: string; name?: string; description?: string }> : [];
  const collectionItems: PillItem[] = collList.length > 0
    ? collList.map((c) => ({
        id: c.collection || c.name || "default",
        name: c.name || undefined,
        description: c.description || undefined,
      }))
    : [{ id: "default", name: "Default" }];

  const flowList = Array.isArray(flows) ? flows as Array<{ id: string; description?: string; blueprint?: string }> : [];
  const flowItems: PillItem[] = flowList.length > 0
    ? flowList.map((f) => ({
        id: f.id,
        description: f.description || f.blueprint || undefined,
      }))
    : [{ id: flowId }];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: sz(6) }}>
      {workspaceItems.length > 0 && (
        <Pill
          label="WS"
          value={activeWorkspace || "—"}
          color={theme.palette.cyan}
          items={workspaceItems}
          onSelect={switchWorkspace}
        />
      )}
      <Pill
        label="COL"
        value={collection}
        color={theme.palette.emerald}
        items={collectionItems}
        onSelect={(id) => updateSetting("collection", id)}
      />
      <Pill
        label="FLOW"
        value={flowId}
        color={theme.palette.amber}
        items={flowItems}
        onSelect={setFlowId}
      />
    </div>
  );
}
