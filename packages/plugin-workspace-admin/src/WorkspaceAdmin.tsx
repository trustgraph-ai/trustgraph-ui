import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useTheme, Button, toast } from "@trustgraph/trustkit";
import type { Workspace } from "@trustgraph/react-provider";

function TableRow({ children, hover }: { children: React.ReactNode; hover?: boolean }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hover && hovered ? theme.surface.overlay : "transparent",
        cursor: hover ? "pointer" : undefined,
      }}
    >
      {children}
    </tr>
  );
}

function WorkspaceDetail({
  workspace, onClose, onRefresh,
}: {
  workspace: Workspace; onClose: () => void; onRefresh: () => void;
}) {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [name, setName] = useState(workspace.name);

  const inputStyle: React.CSSProperties = {
    padding: `${sz(4)}px ${sz(8)}px`, fontSize: sz(12),
    fontFamily: theme.font.mono, background: theme.surface.base,
    border: `1px solid ${theme.border.default}`, borderRadius: 4,
    color: theme.text.primary, width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: sz(10), fontFamily: theme.font.sans,
    color: theme.text.muted, marginBottom: sz(2),
  };

  const handleSave = async () => {
    await socket.iam().updateWorkspace(workspace.id, { name });
    toast.success("Workspace updated");
    onRefresh();
  };

  const handleEnable = async () => {
    await socket.iam().updateWorkspace(workspace.id, { enabled: true });
    toast.success("Workspace enabled");
    onRefresh();
  };

  const handleDisable = async () => {
    await socket.iam().disableWorkspace(workspace.id);
    toast.success("Workspace disabled (users disabled, API keys revoked)");
    onRefresh();
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: sz(12),
      padding: sz(16),
      borderBottom: `1px solid ${theme.border.default}`,
      background: theme.surface.overlay,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: sz(14), fontWeight: 600, fontFamily: theme.font.sans, color: theme.text.primary }}>
          {workspace.id}
        </div>
        <Button size="sm" onClick={onClose}>Close</Button>
      </div>

      <div style={{ display: "flex", gap: sz(12) }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>ID</div>
          <div style={{
            padding: `${sz(4)}px ${sz(8)}px`, fontSize: sz(12),
            fontFamily: theme.font.mono, color: theme.text.muted,
          }}>
            {workspace.id}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: sz(4) }}>
        <Button size="sm" onClick={handleSave}>Save</Button>
        {workspace.enabled ? (
          <Button size="sm" onClick={handleDisable}>Disable</Button>
        ) : (
          <Button size="sm" onClick={handleEnable}>Enable</Button>
        )}
      </div>

      {!workspace.enabled && (
        <div style={{
          padding: sz(8), borderRadius: 4,
          background: theme.surface.base,
          border: `1px solid ${theme.border.default}`,
          fontSize: sz(11), fontFamily: theme.font.mono,
          color: theme.text.muted,
        }}>
          This workspace is disabled. Users in this workspace have been disabled and their API keys revoked.
          Re-enabling the workspace will not automatically re-enable users or restore API keys.
        </div>
      )}
    </div>
  );
}

function CreateWorkspaceForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const inputStyle: React.CSSProperties = {
    padding: `${sz(4)}px ${sz(8)}px`, fontSize: sz(12),
    fontFamily: theme.font.mono, background: theme.surface.base,
    border: `1px solid ${theme.border.default}`, borderRadius: 4,
    color: theme.text.primary, width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: sz(10), fontFamily: theme.font.sans,
    color: theme.text.muted, marginBottom: sz(2),
  };

  const handleCreate = async () => {
    if (!id.trim()) {
      toast.error("Workspace ID is required");
      return;
    }
    await socket.iam().createWorkspace(id.trim(), name.trim() || undefined);
    toast.success("Workspace created");
    onCreated();
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: sz(8),
      padding: sz(16),
      borderBottom: `1px solid ${theme.border.default}`,
      background: theme.surface.overlay,
    }}>
      <div style={{ fontSize: sz(14), fontWeight: 600, fontFamily: theme.font.sans, color: theme.text.primary }}>
        Create Workspace
      </div>
      <div style={{ display: "flex", gap: sz(12) }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>ID *</div>
          <input value={id} onChange={e => setId(e.target.value)} style={inputStyle} placeholder="e.g. acme-prod" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Display name" />
        </div>
      </div>
      <div style={{ display: "flex", gap: sz(4) }}>
        <Button size="sm" onClick={handleCreate}>Create</Button>
        <Button size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function WorkspaceAdmin() {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ws = await socket.iam().listWorkspaces();
      setWorkspaces(ws);
    } finally {
      setLoading(false);
    }
  }, [socket]);

  useEffect(() => { refresh(); }, [refresh]);

  const cellStyle: React.CSSProperties = {
    padding: `${sz(6)}px ${sz(12)}px`,
    fontSize: sz(11),
    fontFamily: theme.font.mono,
    borderBottom: `1px solid ${theme.border.default}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
      <div style={{
        padding: "8px 28px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{ fontSize: sz(13), fontWeight: 600, fontFamily: theme.font.sans, color: theme.text.primary }}>
          Workspace Admin
        </div>
        <div style={{ flex: 1 }} />
        <Button size="sm" onClick={() => { setShowCreate(true); setSelectedWorkspace(null); }}>Create Workspace</Button>
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {showCreate && (
          <CreateWorkspaceForm
            onCreated={() => { setShowCreate(false); refresh(); }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {selectedWorkspace && (
          <WorkspaceDetail
            key={selectedWorkspace.id}
            workspace={selectedWorkspace}
            onClose={() => setSelectedWorkspace(null)}
            onRefresh={refresh}
          />
        )}

        {loading ? (
          <div style={{ padding: sz(16), color: theme.text.hint, fontFamily: theme.font.mono, fontSize: sz(11) }}>
            Loading...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border.default}` }}>
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>ID</th>
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Name</th>
                <th style={{ ...cellStyle, textAlign: "center", color: theme.text.muted }}>Enabled</th>
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map(w => (
                <TableRow key={w.id} hover>
                  <td
                    style={{ ...cellStyle, cursor: "pointer", color: theme.text.primary }}
                    onClick={() => { setSelectedWorkspace(w); setShowCreate(false); }}
                  >
                    {w.id}
                  </td>
                  <td style={cellStyle}>{w.name}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {w.enabled ? "✓" : "✗"}
                  </td>
                  <td style={cellStyle}>{w.created}</td>
                </TableRow>
              ))}
              {workspaces.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, textAlign: "center", color: theme.text.hint }}>
                    No workspaces found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
