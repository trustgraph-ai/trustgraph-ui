import { useEffect, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import type { VersionCheckResult, Advisory } from "../../hooks/useVersionCheck";

interface VersionOverlayProps {
  versionCheck: VersionCheckResult;
}

export function VersionOverlay({ versionCheck }: VersionOverlayProps) {
  const { theme, sz } = useTheme();
  const { check, currentVersion, showOverlay, closeOverlay, dismiss } =
    versionCheck;
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (showOverlay) {
      const t = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(t);
    } else {
      setOpacity(0);
    }
  }, [showOverlay]);

  if (!showOverlay || !check || check.status === "current") return null;

  const isPatch = check.status === "patch-available";
  const newVersion = isPatch ? check.version : check.upgrade.version;
  const accentColor = isPatch ? theme.palette.amber : theme.semantic.error;
  const advisories: Advisory[] = ("advisories" in check && check.advisories) || [];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeOverlay();
  };

  const handleDismiss = () => {
    dismiss();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        opacity,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          background: theme.surface.overlay,
          backdropFilter: "blur(12px)",
          border: `1px solid ${accentColor}44`,
          borderRadius: sz(12),
          padding: sz(28),
          maxWidth: sz(420),
          width: "90%",
          fontFamily: theme.font.sans,
          color: theme.text.primary,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: sz(16),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: sz(8),
            }}
          >
            <span style={{ color: accentColor, fontSize: sz(18) }}>⬆</span>
            <span
              style={{
                fontSize: sz(15),
                fontWeight: 600,
                color: accentColor,
              }}
            >
              {isPatch ? "Patch Available" : "Upgrade Available"}
            </span>
          </div>
          <button
            onClick={closeOverlay}
            style={{
              background: "none",
              border: "none",
              color: theme.text.subtle,
              cursor: "pointer",
              fontSize: sz(16),
              padding: sz(4),
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Version info */}
        <div
          style={{
            fontFamily: theme.font.mono,
            fontSize: sz(11),
            color: theme.text.subtle,
            marginBottom: sz(12),
          }}
        >
          {currentVersion} → {newVersion}
        </div>

        {/* Description (upgrade only) */}
        {!isPatch && (
          <p
            style={{
              fontSize: sz(13),
              lineHeight: 1.5,
              color: theme.text.secondary,
              margin: `0 0 ${sz(16)}px 0`,
            }}
          >
            {check.upgrade.description}
          </p>
        )}

        {/* Advisories */}
        {advisories.length > 0 && (
          <div style={{ marginBottom: sz(16) }}>
            <div
              style={{
                fontSize: sz(11),
                fontWeight: 600,
                color: theme.semantic.error,
                marginBottom: sz(8),
                fontFamily: theme.font.mono,
              }}
            >
              Security Advisories
            </div>
            {advisories.map((a) => {
              const sevColor =
                a.severity === "critical" || a.severity === "high"
                  ? theme.semantic.error
                  : a.severity === "medium"
                    ? theme.palette.amber
                    : theme.text.subtle;
              return (
                <div
                  key={a.id}
                  style={{
                    padding: `${sz(8)}px ${sz(10)}px`,
                    marginBottom: sz(4),
                    borderRadius: sz(6),
                    border: `1px solid ${sevColor}33`,
                    background: `${sevColor}0a`,
                    fontSize: sz(11),
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sz(4) }}>
                    <span
                      style={{
                        fontFamily: theme.font.mono,
                        fontSize: sz(9),
                        color: sevColor,
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {a.severity}
                    </span>
                    <span
                      style={{
                        fontFamily: theme.font.mono,
                        fontSize: sz(9),
                        color: theme.text.subtle,
                      }}
                    >
                      fixed in {a.fixed_in}
                    </span>
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: theme.text.secondary,
                      textDecoration: "none",
                    }}
                  >
                    {a.summary}
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: sz(10),
            justifyContent: "flex-end",
            marginTop: sz(8),
          }}
        >
          <button
            onClick={handleDismiss}
            style={{
              background: "none",
              border: `1px solid ${theme.border.default}`,
              borderRadius: sz(6),
              color: theme.text.subtle,
              cursor: "pointer",
              fontFamily: theme.font.mono,
              fontSize: sz(10),
              padding: `${sz(6)}px ${sz(14)}px`,
            }}
          >
            Dismiss
          </button>
          {!isPatch && check.upgrade.announcement && (
            <a
              href={check.upgrade.announcement}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: `${accentColor}22`,
                border: `1px solid ${accentColor}66`,
                borderRadius: sz(6),
                color: accentColor,
                cursor: "pointer",
                fontFamily: theme.font.mono,
                fontSize: sz(10),
                padding: `${sz(6)}px ${sz(14)}px`,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              View Release Notes
            </a>
          )}
          <a
            href="https://docs.trustgraph.ai/deployment/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}66`,
              borderRadius: sz(6),
              color: accentColor,
              cursor: "pointer",
              fontFamily: theme.font.mono,
              fontSize: sz(10),
              padding: `${sz(6)}px ${sz(14)}px`,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Deployment Guide
          </a>
        </div>
      </div>
    </div>
  );
}
