import { Card, text, surface, palette } from "@trustgraph/trustkit";

interface DemoCard {
  key: string;
  view?: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  screenshot?: string;
}

interface DemosPageProps {
  onNavigate?: (view: string) => void;
}

const demos: DemoCard[] = [
  {
    key: "solar-missions",
    view: "solar-missions",
    title: "Solar System Missions",
    icon: "◉",
    color: palette.amber,
    description: "Explore space missions across the solar system.",
  },
  {
    key: "hwsec",
    view: "hwsec",
    title: "Hardware Security Explorer",
    icon: "◈",
    color: palette.blue,
    description: "Hardware decomposition tree with security annotations.",
  },
  {
    key: "playground",
    view: "playground",
    title: "Playground",
    icon: "△",
    color: palette.rose,
    description: "Experimental sandbox for trying things out.",
  },
  {
    key: "world-events",
    view: "world-events",
    title: "World Events Explorer",
    icon: "⊕",
    color: palette.cyan,
    description: "Geo-temporal event explorer with map, timeline, and filters.",
  },
];

export function DemosPage({ onNavigate }: DemosPageProps) {
  return (
    <div style={{
      padding: "48px 28px",
      height: "calc(100vh - 110px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 6,
            fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
          }}>
            Demos
          </h1>
          <p style={{
            fontSize: 13,
            color: text.muted,
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
          {demos.map((wf) => (
            <Card
              key={wf.key}
              borderColor={wf.color + "22"}
              padding={0}
              onClick={wf.view && onNavigate ? () => onNavigate(wf.view!) : undefined}
            >
              <div style={{
                height: 80,
                overflow: "hidden",
                borderRadius: "12px 12px 0 0",
                position: "relative",
              }}>
                <img
                  src={wf.screenshot || "/placeholder.png"}
                  alt={wf.title}
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
                  background: `linear-gradient(180deg, transparent 0%, ${surface.base} 100%)`,
                }} />
                <div style={{
                  position: "absolute",
                  top: 8,
                  left: 10,
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: wf.color + "20",
                  border: `1px solid ${wf.color}44`,
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}>
                  {wf.icon}
                </div>
              </div>

              <div style={{ padding: "10px 14px 14px" }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: wf.color,
                  marginBottom: 3,
                }}>
                  {wf.title}
                </div>
                <div style={{
                  fontSize: 11,
                  color: text.subtle,
                  lineHeight: 1.4,
                }}>
                  {wf.description}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
