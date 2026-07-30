import { useState } from "react";
import { useTheme } from "@trustgraph/trustkit";
import { withGlow } from "@trustgraph/trustkit";
import type { RetailFlow } from "../../hooks/useRetailChat";
import type { RetailContextData, ActivityTemplate, CategoryRequirement } from "../../hooks/useRetailContext";

interface ContextPanelProps {
  flow: RetailFlow;
  context: RetailContextData;
}

function SectionHeader({ children }: { children: string }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{
      fontSize: sz(10),
      fontFamily: "'IBM Plex Mono', monospace",
      color: theme.text.subtle,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function RequirementRow({ req }: { req: CategoryRequirement }) {
  const { theme, sz } = useTheme();

  const PRIORITY_STYLES: Record<string, { color: string; label: string }> = {
    essential: { color: theme.palette.red, label: "ESSENTIAL" },
    recommended: { color: theme.palette.amber, label: "RECOMMENDED" },
    optional: { color: theme.palette.cyan, label: "OPTIONAL" },
  };

  const ps = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.optional;
  const qty = req.perPerson
    ? `${req.perPerson}/person`
    : req.perGroup
      ? `${req.perGroup}/group`
      : null;

  return (
    <div style={{
      padding: "5px 8px",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span style={{ color: ps.color, fontSize: sz(7), flexShrink: 0 }}>{"\u25CF"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: sz(11), color: theme.text.muted }}>{req.categoryName}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {qty && (
          <span style={{
            fontSize: sz(8), color: theme.text.subtle,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: "1px 4px", borderRadius: 3,
            background: withGlow(ps.color, 0.08),
          }}>
            {qty}
          </span>
        )}
        <span style={{
          fontSize: sz(8), color: ps.color,
          fontFamily: "'IBM Plex Mono', monospace",
          padding: "1px 4px", borderRadius: 3,
          background: withGlow(ps.color, 0.1),
          border: `1px solid ${withGlow(ps.color, 0.2)}`,
        }}>
          {ps.label}
        </span>
      </div>
    </div>
  );
}

function ActivityCard({ activity }: { activity: ActivityTemplate }) {
  const { theme, sz } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hasReqs = activity.requirements.length > 0;

  const PRIORITY_STYLES: Record<string, { color: string; label: string }> = {
    essential: { color: theme.palette.red, label: "ESSENTIAL" },
    recommended: { color: theme.palette.amber, label: "RECOMMENDED" },
    optional: { color: theme.palette.cyan, label: "OPTIONAL" },
  };

  const essential = activity.requirements.filter((r) => r.priority === "essential");
  const recommended = activity.requirements.filter((r) => r.priority === "recommended");
  const optional = activity.requirements.filter((r) => r.priority === "optional");
  const sorted = [...essential, ...recommended, ...optional];

  return (
    <div style={{
      borderRadius: 8,
      background: theme.surface.card,
      border: `1px solid ${theme.border.subtle}`,
      marginBottom: 6,
      overflow: "hidden",
    }}>
      <div
        onClick={hasReqs ? () => setExpanded(!expanded) : undefined}
        style={{
          padding: "8px 10px",
          cursor: hasReqs ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: sz(11), fontWeight: 600, color: theme.text.muted, marginBottom: 2 }}>
            {activity.name}
          </div>
          {!expanded && (
            <div style={{
              fontSize: sz(10), color: theme.text.subtle, lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {activity.description}
            </div>
          )}
        </div>
        {hasReqs && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: sz(10), color: theme.text.subtle,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {activity.requirements.length}
            </span>
            <span style={{
              fontSize: sz(8), color: theme.text.hint,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}>
              {"\u25BC"}
            </span>
          </div>
        )}
      </div>

      {expanded && hasReqs && (
        <div style={{
          borderTop: `1px solid ${theme.border.subtle}`,
          padding: "4px 0",
        }}>
          {sorted.map((req) => (
            <RequirementRow key={req.uri} req={req} />
          ))}

          {/* Summary line */}
          <div style={{
            padding: "6px 8px 4px",
            display: "flex",
            gap: 8,
            justifyContent: "center",
          }}>
            {essential.length > 0 && (
              <span style={{
                fontSize: sz(9), color: PRIORITY_STYLES.essential.color,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {essential.length} essential
              </span>
            )}
            {recommended.length > 0 && (
              <span style={{
                fontSize: sz(9), color: PRIORITY_STYLES.recommended.color,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {recommended.length} recommended
              </span>
            )}
            {optional.length > 0 && (
              <span style={{
                fontSize: sz(9), color: PRIORITY_STYLES.optional.color,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {optional.length} optional
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContextPanel({ flow, context }: ContextPanelProps) {
  const { theme, sz } = useTheme();

  const FLOW_STYLES: Record<RetailFlow, { icon: string; title: string; color: string }> = {
    build: { icon: "\u2699", title: "PC Build Assistant", color: theme.palette.blue },
    gift: { icon: "\u2605", title: "Gift Finder", color: theme.palette.amber },
    kit: { icon: "\u25B3", title: "Kit Assembly", color: theme.palette.emerald },
    compare: { icon: "\u25C7", title: "Product Comparison", color: theme.palette.purple },
    browse: { icon: "\u25C9", title: "Shopping Assistant", color: theme.palette.cyan },
  };

  const CATEGORY_COLORS: Record<string, string> = {
    "PC Components": theme.palette.blue,
    "Electronics": theme.palette.amber,
    "Outdoor Gear": theme.palette.emerald,
  };

  const style = FLOW_STYLES[flow];
  const { categories, activities, constraints, totalProducts, isLoading, error } = context;

  const topCategories = categories.filter((c) => !c.parentName);
  const subCategories = categories.filter((c) => !!c.parentName);

  const hardConstraints = constraints.filter((c) => c.severity === "hard");
  const softConstraints = constraints.filter((c) => c.severity === "soft");

  return (
    <div style={{ padding: "20px 16px" }}>
      {/* Flow indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: withGlow(style.color, 0.15),
          border: `1px solid ${withGlow(style.color, 0.3)}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: sz(16),
        }}>
          {style.icon}
        </div>
        <div>
          <div style={{ fontSize: sz(13), fontWeight: 700, color: style.color }}>
            {style.title}
          </div>
          <div style={{ fontSize: sz(10), color: theme.text.subtle }}>
            {isLoading ? "Loading..." : `${totalProducts} products`}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "8px 12px", borderRadius: 6, marginBottom: 12,
          background: withGlow(theme.palette.red, 0.1),
          border: `1px solid ${withGlow(theme.palette.red, 0.3)}`,
          color: theme.palette.red, fontSize: sz(11),
        }}>
          Failed to load catalog data
        </div>
      )}

      {isLoading && (
        <div style={{
          padding: "10px 12px", borderRadius: 8,
          background: theme.surface.card, border: `1px solid ${theme.border.subtle}`,
          fontSize: sz(12), color: theme.text.subtle, textAlign: "center",
        }}>
          Querying knowledge graph...
        </div>
      )}

      {/* Product categories from graph */}
      {!isLoading && topCategories.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader>Product Categories</SectionHeader>
          {topCategories.map((cat) => {
            const subs = subCategories.filter((s) => s.parentName === cat.name);
            const color = CATEGORY_COLORS[cat.name] || theme.palette.cyan;
            return (
              <div key={cat.uri} style={{
                padding: "10px 12px", borderRadius: 8,
                background: theme.surface.card, border: `1px solid ${theme.border.subtle}`,
                marginBottom: 6,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: subs.length > 0 ? 6 : 0,
                }}>
                  <span style={{ fontSize: sz(12), fontWeight: 600, color }}>
                    {cat.name}
                  </span>
                  <span style={{
                    fontSize: sz(10), color: theme.text.subtle,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {cat.productCount > 0 ? `${cat.productCount} items` : ""}
                  </span>
                </div>
                {subs.length > 0 && (
                  <div style={{ fontSize: sz(10), color: theme.text.subtle, lineHeight: 1.4 }}>
                    {subs.map((s) => s.name).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Activity templates with requirement checklists */}
      {!isLoading && activities.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader>Activity Templates</SectionHeader>
          {activities.map((act) => (
            <ActivityCard key={act.uri} activity={act} />
          ))}
        </div>
      )}

      {/* Compatibility constraints (shown in build/browse mode) */}
      {!isLoading && (flow === "build" || flow === "browse") && constraints.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader>Compatibility Constraints</SectionHeader>

          {hardConstraints.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: sz(10), color: theme.palette.red, fontWeight: 600,
                marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace",
              }}>
                HARD ({hardConstraints.length})
              </div>
              {hardConstraints.map((c) => (
                <div key={c.uri} style={{
                  padding: "6px 10px", borderRadius: 6,
                  background: withGlow(theme.palette.red, 0.05),
                  border: `1px solid ${withGlow(theme.palette.red, 0.15)}`,
                  marginBottom: 3, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: theme.palette.red, fontSize: sz(8) }}>{"\u25CF"}</span>
                  <div>
                    <div style={{ fontSize: sz(11), color: theme.text.muted }}>{c.name}</div>
                    <div style={{
                      fontSize: sz(9), color: theme.text.subtle,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {c.slotTypes.join(" + ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {softConstraints.length > 0 && (
            <div>
              <div style={{
                fontSize: sz(10), color: theme.palette.amber, fontWeight: 600,
                marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace",
              }}>
                SOFT ({softConstraints.length})
              </div>
              {softConstraints.map((c) => (
                <div key={c.uri} style={{
                  padding: "6px 10px", borderRadius: 6,
                  background: withGlow(theme.palette.amber, 0.05),
                  border: `1px solid ${withGlow(theme.palette.amber, 0.15)}`,
                  marginBottom: 3, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: theme.palette.amber, fontSize: sz(8) }}>{"\u25CF"}</span>
                  <div>
                    <div style={{ fontSize: sz(11), color: theme.text.muted }}>{c.name}</div>
                    <div style={{
                      fontSize: sz(9), color: theme.text.subtle,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {c.slotTypes.join(" + ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
