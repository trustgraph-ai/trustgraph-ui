import { useTheme } from "@trustgraph/trustkit";
import { withGlow } from "@trustgraph/trustkit";
import type { BuildState, BuildPhase } from "../../hooks/useRetailBuild";
import type { RecommendedProduct } from "../../hooks/useRetailBuild";
import { ProductCard } from "./ProductCard";

interface BuildPanelProps {
  build: BuildState;
  recommendations: RecommendedProduct[];
  activeSlot: string | null;
  lastMessage: string | null;
  isThinking: boolean;
  isQuerying: boolean;
  onSelectProduct: (slot: string, product: RecommendedProduct) => void;
}

type PhaseColorKey = "cyan" | "blue" | "amber" | "emerald";

const PHASE_META: Record<BuildPhase, { label: string; icon: string; colorKey: PhaseColorKey }> = {
  configure: { label: "Configure", icon: "\u2630", colorKey: "cyan" },
  recommend: { label: "Recommend", icon: "\u2699", colorKey: "blue" },
  refine: { label: "Refine", icon: "\u27F3", colorKey: "amber" },
  complete: { label: "Complete", icon: "\u2713", colorKey: "emerald" },
};

const PHASE_ORDER: BuildPhase[] = ["configure", "recommend", "refine", "complete"];

const SLOT_LABELS: Record<string, { label: string; icon: string }> = {
  cpu: { label: "CPU", icon: "\u25A0" },
  gpu: { label: "GPU", icon: "\u25B2" },
  motherboard: { label: "Motherboard", icon: "\u25C6" },
  ram: { label: "RAM", icon: "\u2593" },
  storage: { label: "Storage", icon: "\u25CB" },
  psu: { label: "PSU", icon: "\u26A1" },
  case: { label: "Case", icon: "\u25A1" },
  cooler: { label: "Cooler", icon: "\u2744" },
  monitor: { label: "Monitor", icon: "\u25A3" },
  keyboard: { label: "Keyboard", icon: "\u2328" },
  mouse: { label: "Mouse", icon: "\u25C8" },
  headset: { label: "Headset", icon: "\u266A" },
};

function PhaseIndicator({ phase }: { phase: BuildPhase }) {
  const { theme, sz } = useTheme();
  const idx = PHASE_ORDER.indexOf(phase);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
      {PHASE_ORDER.map((p, i) => {
        const meta = PHASE_META[p];
        const metaColor = theme.palette[meta.colorKey];
        const active = p === phase;
        const done = i < idx;
        const color = active ? metaColor : done ? theme.palette.emerald : theme.text.hint;

        return (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i > 0 && (
              <div style={{
                width: 20, height: 1,
                background: done ? theme.palette.emerald : theme.border.subtle,
              }} />
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 4,
              background: active ? withGlow(metaColor, 0.1) : "transparent",
              border: active ? `1px solid ${withGlow(metaColor, 0.25)}` : "1px solid transparent",
            }}>
              <span style={{
                fontSize: sz(10), color,
              }}>
                {done ? "\u2713" : meta.icon}
              </span>
              <span style={{
                fontSize: sz(10), fontWeight: active ? 600 : 400,
                color, fontFamily: theme.font.mono,
              }}>
                {meta.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BudgetBar({ budget, total }: { budget: number; total: number }) {
  const { theme, sz } = useTheme();
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const over = total > budget;
  const color = over ? theme.palette.red : pct > 85 ? theme.palette.amber : theme.palette.emerald;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: sz(10), color: theme.text.subtle,
          fontFamily: theme.font.mono,
        }}>
          ${total.toFixed(0)} / ${budget.toFixed(0)}
        </span>
        {over && (
          <span style={{
            fontSize: sz(10), color: theme.palette.red, fontWeight: 600,
            fontFamily: theme.font.mono,
          }}>
            OVER ${(total - budget).toFixed(0)}
          </span>
        )}
      </div>
      <div style={{
        height: 4, borderRadius: 2,
        background: withGlow(color, 0.15),
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${Math.min(100, pct)}%`,
          background: color,
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

function FilledSlotRow({
  slotKey,
  product,
  price,
  locked,
  isActive,
}: {
  slotKey: string;
  product: string;
  price: number;
  locked: boolean;
  isActive: boolean;
}) {
  const { theme, sz } = useTheme();
  const meta = SLOT_LABELS[slotKey] || { label: slotKey, icon: "\u25CF" };

  return (
    <div style={{
      padding: "8px 10px",
      borderRadius: 6,
      background: isActive
        ? withGlow(theme.palette.blue, 0.06)
        : locked
          ? withGlow(theme.palette.emerald, 0.04)
          : theme.surface.card,
      border: `1px solid ${
        isActive
          ? withGlow(theme.palette.blue, 0.25)
          : locked
            ? withGlow(theme.palette.emerald, 0.2)
            : theme.border.subtle
      }`,
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span style={{ fontSize: sz(12), width: 18, textAlign: "center" }}>
        {meta.icon}
      </span>
      <span style={{
        fontSize: sz(10), fontWeight: 600, color: theme.text.subtle,
        fontFamily: theme.font.mono,
        width: 90, flexShrink: 0,
      }}>
        {meta.label}
      </span>
      <span style={{
        flex: 1, fontSize: sz(11), color: theme.text.primary,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {product}
      </span>
      <span style={{
        fontSize: sz(11), fontWeight: 600, color: theme.palette.emerald,
        fontFamily: theme.font.mono,
        flexShrink: 0,
      }}>
        ${price.toFixed(0)}
      </span>
      {locked && (
        <span style={{
          fontSize: sz(8), color: theme.palette.emerald,
          fontFamily: theme.font.mono,
          padding: "1px 4px", borderRadius: 3,
          background: withGlow(theme.palette.emerald, 0.1),
          border: `1px solid ${withGlow(theme.palette.emerald, 0.2)}`,
          flexShrink: 0,
        }}>
          LOCKED
        </span>
      )}
    </div>
  );
}

function EmptySlotRow({
  slotKey,
  isActive,
}: {
  slotKey: string;
  isActive: boolean;
}) {
  const { theme, sz } = useTheme();
  const meta = SLOT_LABELS[slotKey] || { label: slotKey, icon: "\u25CF" };

  return (
    <div style={{
      padding: "8px 10px",
      borderRadius: 6,
      background: isActive ? withGlow(theme.palette.blue, 0.06) : "transparent",
      border: `1px dashed ${isActive ? withGlow(theme.palette.blue, 0.25) : theme.border.subtle}`,
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span style={{ fontSize: sz(12), width: 18, textAlign: "center", opacity: 0.4 }}>
        {meta.icon}
      </span>
      <span style={{
        fontSize: sz(10), fontWeight: 600, color: theme.text.hint,
        fontFamily: theme.font.mono,
        width: 90,
      }}>
        {meta.label}
      </span>
      <span style={{ fontSize: sz(10), color: theme.text.hint, fontStyle: "italic" }}>
        {isActive ? "selecting..." : "empty"}
      </span>
    </div>
  );
}

const BUILD_SLOTS = ["cpu", "gpu", "motherboard", "ram", "storage", "psu", "case", "cooler"];

export function BuildPanel({
  build,
  recommendations,
  activeSlot,
  lastMessage,
  isThinking,
  isQuerying,
  onSelectProduct,
}: BuildPanelProps) {
  const { theme, sz } = useTheme();
  const hasBuild = build.activity || Object.keys(build.slots).length > 0;
  const allSlotKeys = new Set([
    ...BUILD_SLOTS,
    ...Object.keys(build.slots),
  ]);

  if (!hasBuild && !isThinking) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", padding: 40,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: sz(32), marginBottom: 12, opacity: 0.3,
          }}>
            {"\u2699"}
          </div>
          <div style={{
            fontSize: sz(13), color: theme.text.subtle, lineHeight: 1.6,
          }}>
            Start a conversation to begin building.
            <br />
            <span style={{ fontSize: sz(11), color: theme.text.hint }}>
              Try: "I want to build a gaming PC for $1500"
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px", overflowY: "auto", height: "100%" }}>
      {/* Phase indicator */}
      <PhaseIndicator phase={build.phase} />

      {/* Build info header */}
      {(build.activity || build.target) && (
        <div style={{
          display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap",
        }}>
          {build.activity && (
            <span style={{
              fontSize: sz(10), color: theme.palette.blue,
              fontFamily: theme.font.mono,
              padding: "2px 8px", borderRadius: 4,
              background: withGlow(theme.palette.blue, 0.1),
              border: `1px solid ${withGlow(theme.palette.blue, 0.2)}`,
            }}>
              {build.activity}
            </span>
          )}
          {build.target && (
            <span style={{
              fontSize: sz(10), color: theme.palette.purple,
              fontFamily: theme.font.mono,
              padding: "2px 8px", borderRadius: 4,
              background: withGlow(theme.palette.purple, 0.1),
              border: `1px solid ${withGlow(theme.palette.purple, 0.2)}`,
            }}>
              {build.target}
            </span>
          )}
          {build.constraints.map((c) => (
            <span key={c} style={{
              fontSize: sz(10), color: theme.palette.amber,
              fontFamily: theme.font.mono,
              padding: "2px 8px", borderRadius: 4,
              background: withGlow(theme.palette.amber, 0.1),
              border: `1px solid ${withGlow(theme.palette.amber, 0.2)}`,
            }}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Budget bar */}
      {build.budget != null && build.budget > 0 && (
        <BudgetBar budget={build.budget} total={build.total} />
      )}

      {/* LLM message */}
      {(lastMessage || isThinking) && (
        <div style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: withGlow(theme.palette.emerald, 0.05),
          border: `1px solid ${withGlow(theme.palette.emerald, 0.15)}`,
          marginBottom: 16,
          fontSize: sz(12), color: theme.text.primary, lineHeight: 1.5,
        }}>
          {isThinking ? (
            <span style={{ color: theme.text.subtle, fontStyle: "italic" }}>
              Thinking...
            </span>
          ) : lastMessage}
        </div>
      )}

      {/* Slot grid */}
      <div style={{
        fontSize: sz(10), fontFamily: theme.font.mono,
        color: theme.text.subtle, textTransform: "uppercase",
        letterSpacing: 0.5, marginBottom: 6,
      }}>
        Components
      </div>

      {Array.from(allSlotKeys).map((key) => {
        const slot = build.slots[key];
        const isActive = key === activeSlot;

        if (slot?.product) {
          return (
            <FilledSlotRow
              key={key}
              slotKey={key}
              product={slot.product}
              price={slot.price ?? 0}
              locked={slot.locked}
              isActive={isActive}
            />
          );
        }
        return (
          <EmptySlotRow
            key={key}
            slotKey={key}
            isActive={isActive}
          />
        );
      })}

      {/* Recommendations */}
      {activeSlot && (recommendations.length > 0 || isQuerying) && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: sz(10), fontFamily: theme.font.mono,
            color: theme.text.subtle, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 8,
          }}>
            {isQuerying ? "Querying catalog..." : `Select ${SLOT_LABELS[activeSlot]?.label || activeSlot}`}
          </div>

          {isQuerying && (
            <div style={{
              padding: "20px 12px", borderRadius: 8,
              background: theme.surface.card, border: `1px solid ${theme.border.subtle}`,
              textAlign: "center", fontSize: sz(11), color: theme.text.subtle,
            }}>
              Searching products...
            </div>
          )}

          {!isQuerying && recommendations.length === 0 && (
            <div style={{
              padding: "12px", borderRadius: 8,
              background: withGlow(theme.palette.amber, 0.05),
              border: `1px solid ${withGlow(theme.palette.amber, 0.15)}`,
              fontSize: sz(11), color: theme.palette.amber, textAlign: "center",
            }}>
              No products found matching criteria
            </div>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 8,
          }}>
            {recommendations.map((p, i) => (
              <ProductCard
                key={p.uri}
                product={p}
                rank={i + 1}
                onSelect={() => onSelectProduct(activeSlot, p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Complete state */}
      {build.phase === "complete" && (
        <div style={{
          marginTop: 16, padding: "16px",
          borderRadius: 8,
          background: withGlow(theme.palette.emerald, 0.06),
          border: `1px solid ${withGlow(theme.palette.emerald, 0.2)}`,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: sz(16), color: theme.palette.emerald, marginBottom: 6,
          }}>
            {"\u2713"} Build Complete
          </div>
          <div style={{
            fontSize: sz(12), color: theme.text.muted,
            fontFamily: theme.font.mono,
          }}>
            {build.budget
              ? `$${build.total.toFixed(0)} / $${build.budget.toFixed(0)} budget`
              : `$${build.total.toFixed(0)} total`}
          </div>
        </div>
      )}
    </div>
  );
}
