import { useState } from "react";
import { SectionLabel, Badge, text, surface, border, palette } from "@trustgraph/trustkit";

interface CodeSample {
  label: string;
  code: string;
}

interface ComponentInfo {
  name: string;
  tier: "1" | "2" | "3";
  description: string;
}

interface DevPanelProps {
  /** Short explanation of how this page is built */
  explanation: string;
  /** Code samples to show */
  codeSamples: CodeSample[];
  /** Components used in this view */
  components: ComponentInfo[];
  /** Hooks used in this view */
  hooks: ComponentInfo[];
}

const tierLabels: Record<string, { label: string; color: string }> = {
  "1": { label: "Hook", color: palette.blue },
  "2": { label: "Domain Piece", color: palette.purple },
  "3": { label: "Composite", color: palette.emerald },
};

function CopyButton({ text: textToCopy }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: "none",
        border: `1px solid ${border.medium}`,
        borderRadius: 4,
        color: copied ? palette.emerald : text.subtle,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        padding: "3px 8px",
        cursor: "pointer",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function DevPanel({ explanation, codeSamples, components, hooks }: DevPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      position: "fixed",
      bottom: 60,
      right: 28,
      zIndex: 900,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 8,
    }}>
      {/* Panel content */}
      {open && (
        <div style={{
          width: 480,
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          background: surface.overlay,
          backdropFilter: "blur(16px)",
          border: `1px solid ${border.medium}`,
          borderRadius: 12,
          padding: 24,
        }}>
          <SectionLabel marginBottom={12}>HOW THIS PAGE IS BUILT</SectionLabel>
          <p style={{
            fontSize: 13,
            color: text.secondary,
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            {explanation}
          </p>

          {/* Code samples */}
          {codeSamples.map((sample, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}>
                <span style={{
                  fontSize: 11,
                  color: text.muted,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {sample.label}
                </span>
                <CopyButton text={sample.code} />
              </div>
              <pre style={{
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                color: text.primary,
                lineHeight: 1.6,
                padding: "14px 16px",
                background: "rgba(0,0,0,0.3)",
                borderRadius: 8,
                border: `1px solid ${border.subtle}`,
                overflow: "auto",
                margin: 0,
                whiteSpace: "pre",
              }}>
                {sample.code}
              </pre>
            </div>
          ))}

          {/* Components */}
          {components.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <SectionLabel marginBottom={8}>COMPONENTS</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {components.map((c) => {
                  const tier = tierLabels[c.tier];
                  return (
                    <div key={c.name} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <Badge color={tier.color} size="small">{tier.label}</Badge>
                      <span style={{
                        fontSize: 12,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: text.primary,
                      }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: 11, color: text.subtle }}>
                        — {c.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hooks */}
          {hooks.length > 0 && (
            <div>
              <SectionLabel marginBottom={8}>HOOKS</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {hooks.map((h) => {
                  const tier = tierLabels[h.tier];
                  return (
                    <div key={h.name} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <Badge color={tier.color} size="small">{tier.label}</Badge>
                      <span style={{
                        fontSize: 12,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: text.primary,
                      }}>
                        {h.name}
                      </span>
                      <span style={{ fontSize: 11, color: text.subtle }}>
                        — {h.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1px solid ${open ? palette.amber + "88" : border.medium}`,
          background: open ? palette.amber + "20" : surface.overlay,
          backdropFilter: "blur(8px)",
          color: open ? palette.amber : text.subtle,
          fontSize: 16,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {"</>"}
      </button>
    </div>
  );
}
