import { useState, useCallback, useRef, createContext, useContext } from "react";
import { text, surface, border, palette, withGlow } from "../../theme";
import { useBrandAnalytics, BUDGET_TIERS } from "../../hooks/useBrandAnalytics";
import { useProductScorecard } from "../../hooks/useProductScorecard";
import { ProductScorecard } from "./ProductScorecard";
import type {
  CategoryCompetition,
  CompetitorEntry,
  HeadToHead,
  FunnelEntry,
  AnchorAttachment,
} from "../../hooks/useBrandAnalytics";

export interface BrandAnalyticsProps {
  collection?: string;
}

const mono = "'IBM Plex Mono', monospace";

const HoverCtx = createContext<{
  onEnter: (uri: string, name: string, rect: DOMRect) => void;
  onLeave: () => void;
}>({ onEnter: () => {}, onLeave: () => {} });

function HoverProduct({ uri, name, children, style }: {
  uri: string;
  name: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { onEnter, onLeave } = useContext(HoverCtx);
  const ref = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <span
      ref={ref}
      onMouseEnter={() => {
        setHovered(true);
        if (ref.current) onEnter(uri, name, ref.current.getBoundingClientRect());
      }}
      onMouseLeave={() => {
        setHovered(false);
        onLeave();
      }}
      style={{
        borderBottom: hovered ? `1px dashed ${text.subtle}` : "1px dashed transparent",
        cursor: "default",
        transition: "border-color 0.15s",
        ...style,
      }}
    >
      {children || name}
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: mono, color: text.subtle,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div style={{ color: text.hint, fontSize: 12, padding: 20, textAlign: "center" }}>{children}</div>;
}

function WinRateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 50 ? palette.emerald : pct >= 25 ? palette.amber : palette.rose;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: 600, fontFamily: mono, minWidth: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Pill({ active, color, onClick, children }: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? withGlow(color, 0.15) : "none",
        border: `1px solid ${active ? withGlow(color, 0.4) : border.subtle}`,
        borderRadius: 4,
        color: active ? color : text.hint,
        fontSize: 9, fontFamily: mono, padding: "2px 8px",
        cursor: "pointer", flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function FilterBar({
  budgetTierIndex, onBudgetChange,
  categoryFilter, onCategoryChange,
  categories, isLoading, onRefresh,
}: {
  budgetTierIndex: number;
  onBudgetChange: (i: number) => void;
  categoryFilter: string | null;
  onCategoryChange: (cat: string | null) => void;
  categories: string[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 4,
      padding: "8px 16px", borderBottom: `1px solid ${border.default}`, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: text.hint, textTransform: "uppercase", fontFamily: mono, letterSpacing: 0.5, minWidth: 60 }}>
          Budget:
        </span>
        {BUDGET_TIERS.map((tier, i) => (
          <Pill key={i} active={budgetTierIndex === i} color={palette.purple} onClick={() => onBudgetChange(i)}>
            {tier.label}
          </Pill>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={onRefresh}
          disabled={isLoading}
          style={{
            background: "none", border: `1px solid ${border.subtle}`,
            borderRadius: 4, color: text.muted,
            fontSize: 9, fontFamily: mono, padding: "2px 8px", cursor: "pointer",
          }}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>
      {categories.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: text.hint, textTransform: "uppercase", fontFamily: mono, letterSpacing: 0.5, minWidth: 60 }}>
            Category:
          </span>
          <Pill active={!categoryFilter} color={palette.blue} onClick={() => onCategoryChange(null)}>All</Pill>
          {categories.map((cat) => (
            <Pill
              key={cat}
              active={categoryFilter === cat}
              color={palette.blue}
              onClick={() => onCategoryChange(categoryFilter === cat ? null : cat)}
            >
              {cat}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitorRow({ entry, isLeader }: { entry: CompetitorEntry; isLeader: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "4px 12px", gap: 8,
      borderBottom: `1px solid ${border.subtle}`,
      background: isLeader ? "rgba(52,211,153,0.04)" : undefined,
    }}>
      <span style={{
        flex: 1, fontSize: 11,
        color: isLeader ? palette.emerald : text.primary,
        fontWeight: isLeader ? 600 : 400,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        <HoverProduct uri={entry.uri} name={entry.name} />
      </span>
      <span style={{ fontSize: 9, color: text.hint, fontFamily: mono, minWidth: 50, textAlign: "right" }}>
        {entry.wins}W {entry.losses}L
      </span>
      <WinRateBar rate={entry.winRate} />
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryCompetition }) {
  const [expanded, setExpanded] = useState(true);
  const leader = category.competitors[0];
  const loser = category.competitors[category.competitors.length - 1];

  return (
    <div style={{ borderRadius: 8, background: surface.card, border: `1px solid ${border.subtle}`, overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 12px", display: "flex", alignItems: "center",
          justifyContent: "space-between", cursor: "pointer",
          borderBottom: expanded ? `1px solid ${border.subtle}` : undefined,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: palette.blue, fontFamily: mono }}>
          {category.slot}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9 }}>
          {leader && (
            <span style={{ color: palette.emerald }}>
              {leader.name} {Math.round(leader.winRate * 100)}%
            </span>
          )}
          {loser && loser !== leader && loser.winRate < 0.5 && (
            <span style={{ color: palette.rose }}>
              {loser.name} {Math.round(loser.winRate * 100)}%
            </span>
          )}
          <span style={{ color: text.hint }}>{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </div>
      {expanded && category.competitors.map((c, i) => (
        <CompetitorRow key={c.uri} entry={c} isLeader={i === 0} />
      ))}
    </div>
  );
}

function CompetitivePanel({ competition, categoryFilter }: { competition: CategoryCompetition[]; categoryFilter: string | null }) {
  const filtered = categoryFilter ? competition.filter((c) => c.slot === categoryFilter) : competition;
  if (filtered.length === 0) return <EmptyHint>No competitive data yet. Run shopping sessions to see head-to-head results.</EmptyHint>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {filtered.map((cat) => <CategoryCard key={cat.slot} category={cat} />)}
    </div>
  );
}

function HeadToHeadPanel({ headToHead, categoryFilter }: { headToHead: HeadToHead[]; categoryFilter: string | null }) {
  const filtered = categoryFilter ? headToHead.filter((h) => h.slot === categoryFilter) : headToHead;
  if (filtered.length === 0) return <EmptyHint>No head-to-head matchup data yet.</EmptyHint>;

  const bySlot = new Map<string, HeadToHead[]>();
  for (const h of filtered) {
    if (!bySlot.has(h.slot)) bySlot.set(h.slot, []);
    bySlot.get(h.slot)!.push(h);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from(bySlot).map(([slot, matchups]) => (
        <div key={slot} style={{ borderRadius: 8, background: surface.card, border: `1px solid ${border.subtle}`, overflow: "hidden" }}>
          <div style={{ padding: "6px 12px", borderBottom: `1px solid ${border.subtle}`, fontSize: 10, fontWeight: 600, color: palette.blue, fontFamily: mono }}>
            {slot}
          </div>
          {matchups.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", padding: "5px 12px", gap: 8,
                borderBottom: i < matchups.length - 1 ? `1px solid ${border.subtle}` : undefined,
                fontSize: 11,
              }}
            >
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                color: palette.emerald, fontWeight: 600, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                <span style={{
                  display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                  background: palette.emerald, flexShrink: 0,
                }} />
                <HoverProduct uri={m.winnerUri} name={m.winnerName} />
              </span>
              <span style={{
                color: text.hint, fontSize: 8, flexShrink: 0, fontFamily: mono,
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                beat
              </span>
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                justifyContent: "flex-end",
                color: palette.rose, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                <HoverProduct uri={m.loserUri} name={m.loserName} />
                <span style={{
                  display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                  background: palette.rose, flexShrink: 0,
                }} />
              </span>
              <span style={{
                color: text.muted, fontFamily: mono, fontSize: 10,
                fontWeight: 600, minWidth: 28, textAlign: "right", flexShrink: 0,
                background: withGlow(palette.rose, 0.08),
                border: `1px solid ${withGlow(palette.rose, 0.15)}`,
                borderRadius: 3, padding: "1px 5px",
              }}>
                {m.encounters}x
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FunnelPanel({ funnel, categoryFilter }: { funnel: FunnelEntry[]; categoryFilter: string | null }) {
  const filtered = categoryFilter ? funnel.filter((f) => f.slot === categoryFilter) : funnel;
  if (filtered.length === 0) return <EmptyHint>No funnel data yet.</EmptyHint>;

  return (
    <div style={{ borderRadius: 8, background: surface.card, border: `1px solid ${border.subtle}`, overflow: "hidden" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 55px 55px 55px 70px 70px",
        padding: "7px 12px", borderBottom: `1px solid ${border.subtle}`,
        fontSize: 9, fontFamily: mono, color: text.hint, textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        <span>Product</span>
        <span style={{ textAlign: "center" }}>Shown</span>
        <span style={{ textAlign: "center" }}>Selected</span>
        <span style={{ textAlign: "center" }}>Purch.</span>
        <span style={{ textAlign: "center" }}>Conv %</span>
        <span style={{ textAlign: "center" }}>Pur %</span>
      </div>
      {filtered.map((f) => {
        const selRate = f.shown > 0 ? f.selected / f.shown : 0;
        const purRate = f.selected > 0 ? f.purchased / f.selected : 0;
        const selPct = Math.round(selRate * 100);
        const purPct = Math.round(purRate * 100);
        const selColor = selPct >= 50 ? palette.emerald : selPct >= 25 ? palette.amber : palette.rose;
        const purColor = purPct >= 50 ? palette.emerald : purPct >= 25 ? palette.amber : palette.rose;

        return (
          <div
            key={f.uri + f.slot}
            style={{
              display: "grid", gridTemplateColumns: "1fr 55px 55px 55px 70px 70px",
              padding: "4px 12px", borderBottom: `1px solid ${border.subtle}`, alignItems: "center",
            }}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <HoverProduct uri={f.uri} name={f.name} style={{ fontSize: 11, color: text.primary }} />
              {!categoryFilter && (
                <span style={{ fontSize: 8, color: palette.blue, fontFamily: mono, marginLeft: 4 }}>{f.slot}</span>
              )}
            </div>
            <span style={{ textAlign: "center", fontSize: 10, color: text.muted, fontFamily: mono }}>{f.shown}</span>
            <span style={{ textAlign: "center", fontSize: 10, color: palette.emerald, fontFamily: mono }}>{f.selected}</span>
            <span style={{ textAlign: "center", fontSize: 10, color: palette.purple, fontFamily: mono }}>{f.purchased}</span>
            <span style={{ textAlign: "center", fontSize: 10, color: selColor, fontFamily: mono, fontWeight: 600 }}>
              {selPct}%
              {selPct < 25 && <span style={{ fontSize: 8, color: palette.rose }}> !</span>}
            </span>
            <span style={{ textAlign: "center", fontSize: 10, color: f.selected > 0 ? purColor : text.hint, fontFamily: mono, fontWeight: 600 }}>
              {f.selected > 0 ? `${purPct}%` : "\u2014"}
              {f.selected > 0 && purPct === 0 && <span style={{ fontSize: 8, color: palette.rose }}> !</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BasketPanel({ anchorBasket }: { anchorBasket: AnchorAttachment[] }) {
  if (anchorBasket.length === 0) {
    return <EmptyHint>No cross-sell data yet. Complete shopping sessions with cross-sell selections to see attachment rates.</EmptyHint>;
  }

  const byAnchor = new Map<string, AnchorAttachment[]>();
  for (const a of anchorBasket) {
    if (!byAnchor.has(a.anchorUri)) byAnchor.set(a.anchorUri, []);
    byAnchor.get(a.anchorUri)!.push(a);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from(byAnchor).map(([anchorUri, attachments]) => {
        const anchorName = attachments[0].anchorName;
        const totalSessions = attachments[0].totalAnchorSessions;
        return (
          <div key={anchorUri} style={{ borderRadius: 8, background: surface.card, border: `1px solid ${border.subtle}`, overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${border.subtle}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: text.primary }}>
                When users select <HoverProduct uri={anchorUri} name={anchorName} style={{ color: palette.blue }} />
              </div>
              <div style={{ fontSize: 9, color: text.hint, fontFamily: mono, marginTop: 2 }}>
                {totalSessions} session{totalSessions !== 1 ? "s" : ""} with this product
              </div>
            </div>
            {attachments.map((a) => {
              const pct = Math.round(a.attachRate * 100);
              const color = pct >= 75 ? palette.emerald : pct >= 50 ? palette.amber : text.muted;
              return (
                <div key={a.attachUri} style={{
                  display: "flex", alignItems: "center", padding: "5px 12px", gap: 8,
                  borderBottom: `1px solid ${border.subtle}`,
                }}>
                  <div style={{ width: 50, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0 }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color }} />
                  </div>
                  <span style={{ fontSize: 10, color, fontFamily: mono, fontWeight: 600, minWidth: 32, flexShrink: 0 }}>
                    {pct}%
                  </span>
                  <span style={{ flex: 1, fontSize: 11, color: text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <HoverProduct uri={a.attachUri} name={a.attachName} />
                  </span>
                  <span style={{ fontSize: 9, color: text.hint, fontFamily: mono, flexShrink: 0 }}>
                    {a.coSessions}/{a.totalAnchorSessions}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function BrandAnalytics(_props: BrandAnalyticsProps) {
  const data = useBrandAnalytics();
  const scorecard = useProductScorecard();

  const [hoveredProduct, setHoveredProduct] = useState<{
    uri: string; name: string; rect: DOMRect;
  } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback((uri: string, name: string, rect: DOMRect) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoveredProduct({ uri, name, rect });
      scorecard.fetch(uri);
    }, 280);
  }, [scorecard]);

  const handleLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHoveredProduct(null);
    scorecard.clear();
  }, [scorecard]);

  const hoverCtx = { onEnter: handleEnter, onLeave: handleLeave };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "hidden" }}>
      <FilterBar
        budgetTierIndex={data.budgetTierIndex}
        onBudgetChange={data.setBudgetTier}
        categoryFilter={data.categoryFilter}
        onCategoryChange={data.setCategoryFilter}
        categories={data.categories}
        isLoading={data.isLoading}
        onRefresh={data.refresh}
      />

      <HoverCtx.Provider value={hoverCtx}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr",
          flex: 1, minHeight: 0, overflow: "hidden",
        }}>
          <div style={{ overflow: "auto", padding: 16, borderRight: `1px solid ${border.default}`, borderBottom: `1px solid ${border.default}` }}>
            <SectionHeader>Competitive Landscape</SectionHeader>
            <CompetitivePanel competition={data.competition} categoryFilter={data.categoryFilter} />
          </div>

          <div style={{ overflow: "auto", padding: 16, borderBottom: `1px solid ${border.default}` }}>
            <SectionHeader>Head-to-Head Matchups</SectionHeader>
            <HeadToHeadPanel headToHead={data.headToHead} categoryFilter={data.categoryFilter} />
          </div>

          <div style={{ overflow: "auto", padding: 16, borderRight: `1px solid ${border.default}` }}>
            <SectionHeader>Purchase Funnel</SectionHeader>
            <FunnelPanel funnel={data.funnel} categoryFilter={data.categoryFilter} />
          </div>

          <div style={{ overflow: "auto", padding: 16 }}>
            <SectionHeader>Cross-sell Attach Rates</SectionHeader>
            <BasketPanel anchorBasket={data.anchorBasket} />
          </div>
        </div>
      </HoverCtx.Provider>

      {hoveredProduct && (
        <ProductScorecard
          productUri={hoveredProduct.uri}
          productName={hoveredProduct.name}
          anchorRect={hoveredProduct.rect}
          data={scorecard.data}
        />
      )}

      {data.error && (
        <div style={{
          padding: "6px 16px", fontSize: 11, color: palette.rose,
          background: withGlow(palette.rose, 0.08),
          borderTop: `1px solid ${withGlow(palette.rose, 0.2)}`,
        }}>
          {data.error}
        </div>
      )}
    </div>
  );
}
