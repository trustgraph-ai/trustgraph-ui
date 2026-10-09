import { useConnectionState } from "@trustgraph/react-provider";
import { useProgressStateStore } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { useVersionCheck } from "../../hooks/useVersionCheck";
import { VersionOverlay } from "./VersionOverlay";

export function StatusBar() {
  const connectionState = useConnectionState();
  const activity = useProgressStateStore((state) => state.activity);
  const { theme } = useTheme();
  const versionCheck = useVersionCheck();

  const getStatusDisplay = () => {
    if (!connectionState) return { color: theme.text.subtle, text: "Initializing..." };
    switch (connectionState.status) {
      case "authenticated":
        return { color: theme.semantic.success, text: "Authenticated" };
      case "authenticating":
        return { color: theme.palette.amber, text: "Authenticating..." };
      case "auth-failed":
        return { color: theme.semantic.error, text: "Auth failed" };
      case "connecting":
        return { color: theme.palette.amber, text: "Connecting..." };
      case "reconnecting":
        return { color: theme.semantic.warning, text: `Reconnecting (${connectionState.reconnectAttempt}/${connectionState.maxAttempts})...` };
      case "failed":
        return { color: theme.semantic.error, text: "Connection failed" };
      default:
        return { color: theme.text.subtle, text: connectionState.status };
    }
  };

  const status = getStatusDisplay();
  const activeActivity = activity.size > 0 ? Array.from(activity)[0] : null;

  const hasUpdate = versionCheck.check && versionCheck.check.status !== "current";
  const versionColor = !hasUpdate
    ? theme.text.hint
    : versionCheck.check?.status === "patch-available"
      ? theme.palette.amber
      : theme.semantic.error;

  return (
    <>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "8px 28px", borderTop: `1px solid ${theme.border.subtle}`,
        background: theme.surface.overlay, backdropFilter: "blur(8px)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: theme.font.mono, fontSize: 10, color: theme.text.hint,
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {activeActivity ? (
            <>
              <span style={{ color: theme.palette.amber }}>◌</span>
              <span style={{ color: theme.text.faint }}>{activeActivity}...</span>
            </>
          ) : (
            <>
              <span style={{ color: theme.semantic.success }}>◈</span>
              <span style={{ color: theme.text.disabled }}>Ready</span>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {versionCheck.currentVersion && (
            <>
              <span
                onClick={hasUpdate ? versionCheck.openOverlay : undefined}
                style={{
                  color: versionColor,
                  cursor: hasUpdate ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {hasUpdate && <span>⚠</span>}
                v{versionCheck.currentVersion}
              </span>
              <span style={{ color: theme.text.subtle }}>|</span>
            </>
          )}
          <span style={{ color: status.color }}>●</span> {status.text}
          <span style={{ color: theme.text.subtle }}>|</span>
          <span>trustgraph.ai</span>
        </div>
      </div>
      <VersionOverlay versionCheck={versionCheck} />
    </>
  );
}
