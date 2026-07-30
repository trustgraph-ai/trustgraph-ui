import { Card, useTheme } from "@trustgraph/trustkit";
import type { ThemePalette } from "@trustgraph/trustkit";
import type { ResolvedPlugin } from "../usePluginManifest";

interface DemosPageProps {
  onNavigate?: (view: string) => void;
  plugins?: ResolvedPlugin[];
}

export function DemosPage({ onNavigate, plugins = [] }: DemosPageProps) {
  const { theme, sz } = useTheme();

  const cards = plugins.filter(p => p.placement === "demo");

  return (
    <div style={{
      padding: "48px 28px",
      height: "var(--page-height)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: sz(24),
            fontWeight: 700,
            color: theme.text.primary,
            marginBottom: 6,
            fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
          }}>
            Demos
          </h1>
          <p style={{
            fontSize: sz(13),
            color: theme.text.muted,
            lineHeight: 1.5,
          }}>
            Interactive demonstrations showcasing TrustGraph capabilities with real-world datasets.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}>
          {cards.map((p) => {
            const color = theme.palette[p.paletteKey as keyof ThemePalette];
            return (
              <Card
                key={p.id}
                borderColor={color + "22"}
                padding={0}
                onClick={onNavigate ? () => onNavigate(p.id) : undefined}
              >
                <div style={{
                  height: 80,
                  overflow: "hidden",
                  borderRadius: "12px 12px 0 0",
                  position: "relative",
                }}>
                  <img
                    src={p.screenshot || "/placeholder.png"}
                    alt={p.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.5,
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(180deg, transparent 0%, ${theme.surface.base} 100%)`,
                  }} />
                  <div style={{
                    position: "absolute",
                    top: 8,
                    left: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: color + "20",
                    border: `1px solid ${color}44`,
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: sz(14),
                  }}>
                    {p.icon}
                  </div>
                </div>

                <div style={{ padding: "10px 14px 14px" }}>
                  <div style={{
                    fontSize: sz(13),
                    fontWeight: 700,
                    color: color,
                    marginBottom: 3,
                  }}>
                    {p.title}
                  </div>
                  <div style={{
                    fontSize: sz(11),
                    color: theme.text.subtle,
                    lineHeight: 1.4,
                  }}>
                    {p.description}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
