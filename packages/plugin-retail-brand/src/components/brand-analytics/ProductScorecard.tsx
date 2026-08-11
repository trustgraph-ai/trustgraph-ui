import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@trustgraph/trustkit";
import { withGlow } from "@trustgraph/trustkit";
import type { ProductScorecardData } from "../../hooks/useProductScorecard";

const mono = "${theme.font.mono}";

function Stars({ rating }: { rating: number }) {
  const { theme, sz } = useTheme();
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push("\u2605");
  if (half) stars.push("\u00BD");
  return (
    <span style={{ color: theme.palette.amber, fontSize: sz(12), letterSpacing: 1 }}>
      {stars.join("")}
      <span style={{ color: theme.text.hint, fontSize: sz(10), marginLeft: 4, fontFamily: mono }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(" ", max);
  return s.slice(0, cut > 0 ? cut : max) + "\u2026";
}

function ZoneLabel({ children }: { children: React.ReactNode }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{
      fontSize: sz(8), fontFamily: mono, color: theme.text.hint,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function Divider() {
  const { theme } = useTheme();
  return <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "10px 0" }} />;
}

export interface ProductScorecardProps {
  productUri: string;
  productName: string;
  anchorRect: DOMRect;
  data: ProductScorecardData;
}

export function ProductScorecard({ productName, anchorRect, data }: ProductScorecardProps) {
  const { theme, sz } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const cardWidth = 340;
  const maxHeight = 480;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceRight = vw - anchorRect.right;
  const spaceLeft = anchorRect.left;
  const left = spaceRight >= cardWidth + 16
    ? anchorRect.right + 8
    : spaceLeft >= cardWidth + 16
      ? anchorRect.left - cardWidth - 8
      : Math.max(8, (vw - cardWidth) / 2);

  let top = anchorRect.top;
  if (top + maxHeight > vh - 16) top = Math.max(16, vh - maxHeight - 16);

  return createPortal(
    <div
      ref={cardRef}
      style={{
        position: "fixed", left, top, width: cardWidth, maxHeight,
        background: theme.surface.overlay || "#1a1a24",
        border: `1px solid ${theme.border.default}`,
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)",
        overflow: "auto", zIndex: 10000,
        pointerEvents: "none",
      }}
    >
      {data.isLoading ? (
        <div style={{ padding: 24, textAlign: "center", color: theme.text.hint, fontSize: sz(11) }}>
          Loading scorecard...
        </div>
      ) : (
        <>
          {/* Zone 1: Basics */}
          <div style={{ padding: "14px 16px 0" }}>
            <div style={{ fontSize: sz(13), fontWeight: 700, color: theme.text.primary, marginBottom: 6 }}>
              {productName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {data.price !== null && (
                <span style={{ fontSize: sz(16), fontWeight: 700, color: theme.palette.emerald, fontFamily: mono }}>
                  ${data.price.toFixed(2)}
                </span>
              )}
              {data.rating !== null && (
                <Stars rating={data.rating} />
              )}
              {data.reviewCount !== null && (
                <span style={{ fontSize: sz(9), color: theme.text.hint, fontFamily: mono }}>
                  {data.reviewCount.toLocaleString()} reviews
                </span>
              )}
            </div>
          </div>

          <Divider />

          {/* Zone 2: Decision Context */}
          <div style={{ padding: "0 16px" }}>
            <ZoneLabel>Decision Context</ZoneLabel>

            {data.winReasons.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: sz(9), color: theme.palette.emerald, fontWeight: 600, marginBottom: 4 }}>
                  Why it wins
                </div>
                {data.winReasons.map((r, i) => (
                  <div key={i} style={{
                    fontSize: sz(10), color: theme.text.muted, lineHeight: 1.4,
                    marginBottom: 3, paddingLeft: 8,
                    borderLeft: `2px solid ${withGlow(theme.palette.emerald, 0.3)}`,
                  }}>
                    {truncate(r, 140)}
                  </div>
                ))}
              </div>
            )}

            {data.lossReasons.length > 0 && (
              <div>
                <div style={{ fontSize: sz(9), color: theme.palette.rose, fontWeight: 600, marginBottom: 4 }}>
                  Why it loses
                </div>
                {data.lossReasons.map((r, i) => (
                  <div key={i} style={{
                    fontSize: sz(10), color: theme.text.muted, lineHeight: 1.4,
                    marginBottom: 3, paddingLeft: 8,
                    borderLeft: `2px solid ${withGlow(theme.palette.rose, 0.3)}`,
                  }}>
                    <span style={{ color: theme.palette.rose, fontWeight: 600 }}>vs {r.winnerName}: </span>
                    {truncate(r.reasoning, 120)}
                  </div>
                ))}
              </div>
            )}

            {data.winReasons.length === 0 && data.lossReasons.length === 0 && (
              <div style={{ fontSize: sz(10), color: theme.text.hint, fontStyle: "italic" }}>
                No decision reasoning data captured yet.
              </div>
            )}
          </div>

          <Divider />

          {/* Zone 3: Contextual Sweet Spot */}
          <div style={{ padding: "0 16px 14px" }}>
            <ZoneLabel>Contextual Sweet Spot</ZoneLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.budgetCohort && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: sz(8), color: theme.palette.purple, fontFamily: mono, textTransform: "uppercase",
                    background: withGlow(theme.palette.purple, 0.1),
                    border: `1px solid ${withGlow(theme.palette.purple, 0.2)}`,
                    borderRadius: 3, padding: "1px 5px",
                  }}>
                    Budget
                  </span>
                  <span style={{ fontSize: sz(10), color: theme.text.primary }}>
                    Most popular in <span style={{ color: theme.palette.purple, fontWeight: 600 }}>{data.budgetCohort}</span> builds
                  </span>
                </div>
              )}

              {data.topCompetitor && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: sz(8), color: theme.palette.rose, fontFamily: mono, textTransform: "uppercase",
                    background: withGlow(theme.palette.rose, 0.1),
                    border: `1px solid ${withGlow(theme.palette.rose, 0.2)}`,
                    borderRadius: 3, padding: "1px 5px",
                  }}>
                    Threat
                  </span>
                  <span style={{ fontSize: sz(10), color: theme.text.primary }}>
                    Most often beaten by <span style={{ color: theme.palette.rose, fontWeight: 600 }}>{data.topCompetitor.name}</span>
                    <span style={{ color: theme.text.hint, fontFamily: mono, fontSize: sz(9) }}> ({data.topCompetitor.losses}x)</span>
                  </span>
                </div>
              )}

              {data.attachHero && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: sz(8), color: theme.palette.amber, fontFamily: mono, textTransform: "uppercase",
                    background: withGlow(theme.palette.amber, 0.1),
                    border: `1px solid ${withGlow(theme.palette.amber, 0.2)}`,
                    borderRadius: 3, padding: "1px 5px",
                  }}>
                    Attach
                  </span>
                  <span style={{ fontSize: sz(10), color: theme.text.primary }}>
                    Top cross-sell: <span style={{ color: theme.palette.amber, fontWeight: 600 }}>{data.attachHero.name}</span>
                    <span style={{ color: theme.text.hint, fontFamily: mono, fontSize: sz(9) }}> ({data.attachHero.count}x)</span>
                  </span>
                </div>
              )}

              {!data.budgetCohort && !data.topCompetitor && !data.attachHero && (
                <div style={{ fontSize: sz(10), color: theme.text.hint, fontStyle: "italic" }}>
                  Not enough session data to determine sweet spot.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
