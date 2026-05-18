import { useState } from "react";
import { useLogin, useAuth, useAuthStore } from "@trustgraph/react-state";

type Mode = "credentials" | "api-key";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#E5E5E5", fontSize: 14, marginBottom: 16,
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, color: "#999", marginBottom: 6,
  fontFamily: "'IBM Plex Mono', monospace",
};

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("api-key");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const { login, isLoading, error } = useLogin();
  const { error: authError } = useAuth();
  const setToken = useAuthStore((s) => s.setToken);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    await login(username, password);
  };

  const handleApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) return;
    setToken(key);
  };

  const displayError = mode === "credentials" ? error : authError;

  return (
    <div style={{
      width: "100%", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#0A0A0F",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
    }}>
      <div style={{
        width: 360, padding: 32, borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/tg.svg" alt="TrustGraph" style={{
            width: 48, height: 48, borderRadius: 10, marginBottom: 12,
          }} />
          <div style={{
            fontWeight: 700, fontSize: 18, color: "#fff",
            letterSpacing: "-0.02em",
          }}>
            TrustGraph
          </div>
          <div style={{
            fontSize: 12, color: "#666", marginTop: 4,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Sign in to continue
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 20, padding: 3,
          borderRadius: 8, background: "rgba(255,255,255,0.04)",
        }}>
          {(["api-key", "credentials"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 6,
                border: "none", fontSize: 12, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                background: mode === m
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
                color: mode === m ? "#fff" : "#666",
                transition: "all 0.15s",
              }}
            >
              {m === "api-key" ? "API Key" : "Username"}
            </button>
          ))}
        </div>

        {displayError && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 16,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171", fontSize: 13,
          }}>
            {displayError}
          </div>
        )}

        {mode === "api-key" ? (
          <form onSubmit={handleApiKey}>
            <label style={labelStyle}>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
              placeholder="tg_..."
              autoComplete="off"
              style={{ ...inputStyle, marginBottom: 24 }}
            />
            <button
              type="submit"
              disabled={!apiKey.trim()}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 8,
                background: !apiKey.trim()
                  ? "rgba(99,102,241,0.3)"
                  : "rgba(99,102,241,0.8)",
                border: "none", color: "#fff", fontSize: 14,
                fontWeight: 600, cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              Connect
            </button>
          </form>
        ) : (
          <form onSubmit={handleCredentials}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              style={inputStyle}
            />
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ ...inputStyle, marginBottom: 24 }}
            />
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 8,
                background: (isLoading || !username || !password)
                  ? "rgba(99,102,241,0.3)"
                  : "rgba(99,102,241,0.8)",
                border: "none", color: "#fff", fontSize: 14,
                fontWeight: 600, cursor: isLoading ? "wait" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
