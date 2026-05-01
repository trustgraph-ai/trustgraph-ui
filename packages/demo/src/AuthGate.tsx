import { useAuth, useBootstrapStatus } from "@trustgraph/react-state";
import { SocketProvider } from "@trustgraph/react-provider";
import { LoginPage } from "./pages/LoginPage";
import App from "./App";

export function AuthGate() {
  const { phase, error: bsError } = useBootstrapStatus();
  const { token, isAuthenticated } = useAuth();

  if (phase === "checking") {
    return (
      <CenteredMessage>
        Connecting to TrustGraph…
      </CenteredMessage>
    );
  }

  if (phase === "pre-bootstrap") {
    return (
      <CenteredMessage>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Backend unreachable
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>
          {bsError || "Could not contact the TrustGraph gateway."}
        </div>
      </CenteredMessage>
    );
  }

  if (phase === "needs-bootstrap") {
    return (
      <CenteredMessage>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          System needs bootstrapping
        </div>
        <div style={{ fontSize: 13, color: "#888" }}>
          Run the bootstrap CLI to create the initial workspace and admin
          user, then reload this page.
        </div>
      </CenteredMessage>
    );
  }

  if (!isAuthenticated || !token) {
    return <LoginPage />;
  }

  return (
    <SocketProvider token={token}>
      <App />
    </SocketProvider>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#0A0A0F", color: "#E5E5E5",
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      textAlign: "center",
    }}>
      <div style={{
        padding: 32, borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        maxWidth: 400,
      }}>
        {children}
      </div>
    </div>
  );
}
