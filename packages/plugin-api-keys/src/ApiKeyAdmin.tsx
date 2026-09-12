import { useState, useEffect, useCallback } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useTheme, Button, toast } from "@trustgraph/trustkit";
import type { IamUser, IamApiKey } from "@trustgraph/react-provider";

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

function UserKeysList({ user, onBack }: { user: IamUser; onBack: () => void }) {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [keys, setKeys] = useState<IamApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expires, setExpires] = useState("");
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ks = await socket.iam().listApiKeys(user.id);
      setKeys(ks);
    } finally {
      setLoading(false);
    }
  }, [socket, user.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!keyName.trim()) {
      toast.error("Key name is required");
      return;
    }
    const res = await socket.iam().createApiKey(
      user.id, keyName.trim(), expires.trim() || undefined,
    );
    setNewKeyPlaintext(res.plaintext);
    setKeyName("");
    setExpires("");
    setShowCreate(false);
    toast.success("API key created");
    refresh();
  };

  const handleRevoke = async (keyId: string) => {
    await socket.iam().revokeApiKey(keyId);
    toast.success("API key revoked");
    if (newKeyPlaintext) setNewKeyPlaintext(null);
    refresh();
  };

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
    color: theme.text.primary,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: sz(10), fontFamily: theme.font.sans,
    color: theme.text.muted, marginBottom: sz(2),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
      <div style={{
        padding: `${sz(8)}px ${sz(16)}px`,
        display: "flex", alignItems: "center", gap: sz(8),
        borderBottom: `1px solid ${theme.border.default}`,
      }}>
        <Button size="sm" onClick={onBack}>Back</Button>
        <div style={{ fontSize: sz(13), fontWeight: 600, fontFamily: theme.font.sans, color: theme.text.primary }}>
          API Keys for {user.username}
        </div>
        <div style={{
          fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.hint,
        }}>
          {user.name ? `(${user.name})` : ""}
        </div>
        <div style={{ flex: 1 }} />
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Key"}
        </Button>
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      {showCreate && (
        <div style={{
          display: "flex", gap: sz(8), alignItems: "flex-end",
          padding: sz(16),
          borderBottom: `1px solid ${theme.border.default}`,
          background: theme.surface.overlay,
        }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Name *</div>
            <input
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              placeholder="e.g. ci-pipeline"
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Expires (ISO date, blank = never)</div>
            <input
              value={expires}
              onChange={e => setExpires(e.target.value)}
              placeholder="e.g. 2027-01-01T00:00:00Z"
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <Button size="sm" onClick={handleCreate}>Create</Button>
        </div>
      )}

      {newKeyPlaintext && (
        <div style={{
          margin: `${sz(8)}px ${sz(16)}px`,
          padding: sz(12), borderRadius: 4,
          background: theme.surface.base,
          border: `1px solid ${theme.border.default}`,
          fontSize: sz(11), fontFamily: theme.font.mono,
          color: theme.text.primary,
        }}>
          <div style={{ fontSize: sz(10), color: theme.text.muted, marginBottom: sz(4) }}>
            Copy this key now — it will not be shown again
          </div>
          <strong>{newKeyPlaintext}</strong>
        </div>
      )}

      {loading ? (
        <div style={{ padding: sz(16), color: theme.text.hint, fontFamily: theme.font.mono, fontSize: sz(11) }}>
          Loading...
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${theme.border.default}` }}>
              <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Name</th>
              <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Prefix</th>
              <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Expires</th>
              <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Created</th>
              <th style={{ ...cellStyle, textAlign: "left", color: theme.text.muted }}>Last Used</th>
              <th style={{ ...cellStyle, textAlign: "right", color: theme.text.muted, width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id}>
                <td style={cellStyle}>{k.name}</td>
                <td style={cellStyle}>{k.prefix}...</td>
                <td style={cellStyle}>{k.expires || "never"}</td>
                <td style={cellStyle}>{k.created}</td>
                <td style={cellStyle}>{k.last_used || "never"}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>
                  <Button size="sm" onClick={() => handleRevoke(k.id)}>Revoke</Button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...cellStyle, color: theme.text.hint, textAlign: "center" }}>
                  No API keys
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ApiKeyAdmin() {
  const socket = useSocket();
  const { theme, sz } = useTheme();
  const [users, setUsers] = useState<IamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<IamUser | null>(null);
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

  if (selectedUser) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
        <UserKeysList user={selectedUser} onBack={() => setSelectedUser(null)} />
      </div>
    );
  }

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
          API Key Management
        </div>
        <div style={{ flex: 1 }} />
        <input
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />
        <Button size="sm" onClick={refresh}>Refresh</Button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
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
                    onClick={() => setSelectedUser(u)}
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
