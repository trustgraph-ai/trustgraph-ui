import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useTheme, Button, toast } from "@trustgraph/trustkit";
import type { IamUser, CreateUserParams } from "@trustgraph/react-provider";

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

function UserDetail({
  user, onClose, onRefresh,
}: {
  user: IamUser; onClose: () => void; onRefresh: () => void;
}) {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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
    await socket.iam().updateUser(user.id, { name, email });
    toast.success("User updated");
    onRefresh();
  };

  const handleToggleEnabled = async () => {
    if (user.enabled) {
      await socket.iam().disableUser(user.id);
      toast.success("User disabled");
    } else {
      await socket.iam().enableUser(user.id);
      toast.success("User enabled");
    }
    onRefresh();
  };

  const handleResetPassword = async () => {
    const pw = await socket.iam().resetPassword(user.id);
    setTempPassword(pw);
    toast.success("Password reset");
  };

  const handleDelete = async () => {
    await socket.iam().deleteUser(user.id);
    toast.success("User deleted");
    onRefresh();
    onClose();
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
          {user.username}
        </div>
        <Button size="sm" onClick={onClose}>Close</Button>
      </div>

      <div style={{ display: "flex", gap: sz(12) }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Email</div>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: sz(4), flexWrap: "wrap" }}>
        <Button size="sm" onClick={handleSave}>Save</Button>
        <Button size="sm" onClick={handleToggleEnabled}>
          {user.enabled ? "Disable" : "Enable"}
        </Button>
        <Button size="sm" onClick={handleResetPassword}>Reset Password</Button>
        <Button size="sm" onClick={handleDelete}>Delete</Button>
      </div>

      {tempPassword && (
        <div style={{
          padding: sz(8), borderRadius: 4,
          background: theme.surface.base,
          border: `1px solid ${theme.border.default}`,
          fontSize: sz(11), fontFamily: theme.font.mono,
          color: theme.text.primary,
        }}>
          Temporary password: <strong>{tempPassword}</strong>
        </div>
      )}
    </div>
  );
}

function CreateUserForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workspace, setWorkspace] = useState("");

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
    if (!username.trim() || !password.trim()) {
      toast.error("Username and password are required");
      return;
    }
    const params: CreateUserParams = {
      username: username.trim(),
      password: password.trim(),
    };
    if (name.trim()) params.name = name.trim();
    if (email.trim()) params.email = email.trim();
    if (workspace.trim()) params.workspace = workspace.trim();
    await socket.iam().createUser(params);
    toast.success("User created");
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
        Create User
      </div>
      <div style={{ display: "flex", gap: sz(12) }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Username *</div>
          <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Password *</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", gap: sz(12) }}>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelStyle}>Email</div>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ width: "50%" }}>
        <div style={labelStyle}>Default Workspace</div>
        <input value={workspace} onChange={e => setWorkspace(e.target.value)} style={inputStyle} placeholder="default" />
      </div>
      <div style={{ display: "flex", gap: sz(4) }}>
        <Button size="sm" onClick={handleCreate}>Create</Button>
        <Button size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function UserAdmin() {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [users, setUsers] = useState<IamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<IamUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const us = await socket.iam().listUsers();
      setUsers(us);
    } finally {
      setLoading(false);
    }
  }, [socket]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = users.filter(u =>
    !search
    || u.username.toLowerCase().includes(search.toLowerCase())
    || u.name.toLowerCase().includes(search.toLowerCase())
  );

  const cellStyle: React.CSSProperties = {
    padding: `${sz(6)}px ${sz(12)}px`,
    fontSize: sz(11),
    fontFamily: theme.font.mono,
    borderBottom: `1px solid ${theme.border.default}`,
  };

  const inputStyle: React.CSSProperties = {
    padding: `${sz(4)}px ${sz(8)}px`, fontSize: sz(11),
    fontFamily: theme.font.mono, background: theme.surface.base,
    border: `1px solid ${theme.border.default}`, borderRadius: 4,
    color: theme.text.primary, width: 220,
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
          User Admin
        </div>
        <div style={{ flex: 1 }} />
        <input
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />
        <Button size="sm" onClick={() => { setShowCreate(true); setSelectedUser(null); }}>Create User</Button>
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {showCreate && (
          <CreateUserForm
            onCreated={() => { setShowCreate(false); refresh(); }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {selectedUser && (
          <UserDetail
            key={selectedUser.id}
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
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
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Username</th>
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Name</th>
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Email</th>
                <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Workspace</th>
                <th style={{ ...cellStyle, textAlign: "center", color: theme.text.muted }}>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <TableRow key={u.id} hover>
                  <td
                    style={{ ...cellStyle, cursor: "pointer", color: theme.text.primary }}
                    onClick={() => { setSelectedUser(u); setShowCreate(false); }}
                  >
                    {u.username}
                  </td>
                  <td style={cellStyle}>{u.name}</td>
                  <td style={cellStyle}>{u.email}</td>
                  <td style={cellStyle}>{u.default_workspace}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {u.enabled ? "✓" : "✗"}
                  </td>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, textAlign: "center", color: theme.text.hint }}>
                    {search ? "No matching users" : "No users found"}
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
