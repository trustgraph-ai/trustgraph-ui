import { useTheme } from "@trustgraph/trustkit";
import { withGlow } from "@trustgraph/trustkit";
import type { CartItem } from "../../hooks/useRetailCart";
import type { RecommendedProduct } from "../../hooks/useRetailBuild";

interface CartPanelProps {
  items: CartItem[];
  buildTotal: number;
  extrasTotal: number;
  total: number;
  isFinalized: boolean;
  browseProducts: RecommendedProduct[];
  lastMessage: string | null;
  isThinking: boolean;
  onAddExtra: (product: RecommendedProduct) => void;
  onRemoveExtra: (name: string) => void;
  onPlaceOrder: () => void;
}

const SLOT_ICONS: Record<string, string> = {
  cpu: "\u25A0", gpu: "\u25B2", motherboard: "\u25C6", ram: "\u2588",
  storage: "\u25CB", psu: "\u26A1", case: "\u25A1", cooler: "\u2618",
};

function Stars({ rating }: { rating: number }) {
  const { theme, sz } = useTheme();
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push("\u2605");
    else if (i === full && half) stars.push("\u2BEA");
    else stars.push("\u2606");
  }
  return (
    <span style={{ color: theme.palette.amber, fontSize: sz(10), letterSpacing: 1 }}>
      {stars.join("")}
    </span>
  );
}

function SectionHeader({ children }: { children: string }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{
      fontSize: sz(10),
      fontFamily: theme.font.mono,
      color: theme.text.subtle,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function BuildItemRow({ item }: { item: CartItem }) {
  const { theme, sz } = useTheme();
  const icon = item.slot ? SLOT_ICONS[item.slot] || "\u25CF" : "\u25CF";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 0",
    }}>
      <span style={{ color: theme.text.hint, fontSize: sz(12), width: 16, textAlign: "center" }}>
        {icon}
      </span>
      <span style={{
        fontSize: sz(10), color: theme.text.hint, width: 70,
        fontFamily: theme.font.mono,
        textTransform: "uppercase",
      }}>
        {item.slot || "Extra"}
      </span>
      <span style={{ flex: 1, fontSize: sz(11), color: theme.text.muted, minWidth: 0 }}>
        {item.name}
      </span>
      <span style={{
        fontSize: sz(11), color: theme.text.muted,
        fontFamily: theme.font.mono,
        flexShrink: 0,
      }}>
        ${item.price.toFixed(0)}
      </span>
    </div>
  );
}

function ExtraItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 0",
    }}>
      <span style={{ color: theme.palette.cyan, fontSize: sz(12), width: 16, textAlign: "center" }}>
        +
      </span>
      <span style={{ flex: 1, fontSize: sz(11), color: theme.text.muted, minWidth: 0 }}>
        {item.name}
      </span>
      <span style={{
        fontSize: sz(11), color: theme.text.muted,
        fontFamily: theme.font.mono,
        flexShrink: 0,
      }}>
        ${item.price.toFixed(0)}
      </span>
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: theme.text.hint,
          cursor: "pointer",
          fontSize: sz(12),
          padding: "0 4px",
          fontFamily: theme.font.mono,
        }}
        title="Remove"
      >
        x
      </button>
    </div>
  );
}

function CrossSellCard({ product, onAdd }: { product: RecommendedProduct; onAdd: () => void }) {
  const { theme, sz } = useTheme();
  return (
    <div
      style={{
        borderRadius: 8,
        background: theme.surface.card,
        border: `1px solid ${theme.border.subtle}`,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = withGlow(theme.palette.cyan, 0.4))}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = theme.border.subtle)}
    >
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{
            width: "100%",
            aspectRatio: "3 / 2",
            objectFit: "contain",
            background: "rgba(255,255,255,0.03)",
          }}
        />
      )}
      <div style={{ padding: "10px 12px" }}>
        <div style={{
          fontSize: sz(12), fontWeight: 600, color: theme.text.primary,
          lineHeight: 1.3, marginBottom: 4,
        }}>
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Stars rating={product.rating} />
          {product.reviewCount > 0 && (
            <span style={{ fontSize: sz(9), color: theme.text.hint }}>({product.reviewCount})</span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: sz(15), fontWeight: 700, color: theme.palette.emerald,
            fontFamily: theme.font.mono,
          }}>
            ${product.price.toFixed(0)}
          </div>
          <div style={{
            fontSize: sz(9), color: product.inStock ? theme.palette.emerald : theme.palette.red,
            fontFamily: theme.font.mono,
          }}>
            {product.inStock ? "IN STOCK" : "OUT OF STOCK"}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 12px 10px" }}>
        <button
          onClick={onAdd}
          disabled={!product.inStock}
          style={{
            width: "100%",
            padding: "7px 0",
            borderRadius: 6,
            border: `1px solid ${product.inStock ? withGlow(theme.palette.cyan, 0.3) : theme.border.subtle}`,
            background: product.inStock ? withGlow(theme.palette.cyan, 0.08) : theme.surface.card,
            color: product.inStock ? theme.palette.cyan : theme.text.disabled,
            fontSize: sz(11), fontWeight: 600,
            fontFamily: theme.font.mono,
            cursor: product.inStock ? "pointer" : "not-allowed",
          }}
        >
          {product.inStock ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}

export function CartPanel({
  items,
  buildTotal,
  extrasTotal,
  total,
  isFinalized,
  browseProducts,
  lastMessage,
  isThinking,
  onAddExtra,
  onRemoveExtra,
  onPlaceOrder,
}: CartPanelProps) {
  const { theme, sz } = useTheme();
  const buildItems = items.filter((i) => !i.isExtra);
  const extras = items.filter((i) => i.isExtra);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "auto",
      padding: 20,
    }}>
      {/* Assistant message */}
      {lastMessage && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 8,
          background: withGlow(theme.palette.cyan, 0.05),
          border: `1px solid ${withGlow(theme.palette.cyan, 0.15)}`,
          marginBottom: 16,
          fontSize: sz(13),
          color: theme.text.primary,
          lineHeight: 1.5,
        }}>
          {lastMessage}
          {isThinking && (
            <span style={{
              display: "inline-block",
              width: 6, height: 14,
              background: theme.palette.cyan,
              marginLeft: 2,
              animation: "blink 1s step-end infinite",
              verticalAlign: "text-bottom",
            }} />
          )}
        </div>
      )}

      {/* Build components */}
      <SectionHeader>Your Build</SectionHeader>
      <div style={{
        borderRadius: 8,
        background: theme.surface.card,
        border: `1px solid ${theme.border.subtle}`,
        padding: "8px 12px",
        marginBottom: 6,
      }}>
        {buildItems.map((item) => (
          <BuildItemRow key={item.slot || item.name} item={item} />
        ))}
        <div style={{
          borderTop: `1px solid ${theme.border.subtle}`,
          marginTop: 4,
          paddingTop: 6,
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: sz(11), color: theme.text.subtle }}>Build subtotal</span>
          <span style={{
            fontSize: sz(12), fontWeight: 600, color: theme.text.muted,
            fontFamily: theme.font.mono,
          }}>
            ${buildTotal.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Extras */}
      {extras.length > 0 && (
        <>
          <SectionHeader>Extras</SectionHeader>
          <div style={{
            borderRadius: 8,
            background: theme.surface.card,
            border: `1px solid ${theme.border.subtle}`,
            padding: "8px 12px",
            marginBottom: 6,
          }}>
            {extras.map((item) => (
              <ExtraItemRow
                key={item.name}
                item={item}
                onRemove={() => onRemoveExtra(item.name)}
              />
            ))}
            <div style={{
              borderTop: `1px solid ${theme.border.subtle}`,
              marginTop: 4,
              paddingTop: 6,
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: sz(11), color: theme.text.subtle }}>Extras subtotal</span>
              <span style={{
                fontSize: sz(12), fontWeight: 600, color: theme.palette.cyan,
                fontFamily: theme.font.mono,
              }}>
                ${extrasTotal.toFixed(0)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Total */}
      <div style={{
        borderRadius: 8,
        background: withGlow(theme.palette.emerald, 0.05),
        border: `1px solid ${withGlow(theme.palette.emerald, 0.2)}`,
        padding: "12px 16px",
        marginTop: 8,
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: sz(13), fontWeight: 600, color: theme.text.primary }}>
          Order Total
        </span>
        <span style={{
          fontSize: sz(20), fontWeight: 700, color: theme.palette.emerald,
          fontFamily: theme.font.mono,
        }}>
          ${total.toFixed(0)}
        </span>
      </div>

      {/* Cross-sell products */}
      {browseProducts.length > 0 && !isFinalized && (
        <>
          <SectionHeader>You might also like</SectionHeader>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
            marginBottom: 16,
          }}>
            {browseProducts.map((p) => (
              <CrossSellCard
                key={p.uri}
                product={p}
                onAdd={() => onAddExtra(p)}
              />
            ))}
          </div>
        </>
      )}

      {/* Place order button */}
      {isFinalized && (
        <button
          onClick={onPlaceOrder}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 8,
            border: `1px solid ${theme.palette.emerald}`,
            background: withGlow(theme.palette.emerald, 0.12),
            color: theme.palette.emerald,
            fontSize: sz(14),
            fontWeight: 700,
            fontFamily: theme.font.mono,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          Place Order
        </button>
      )}

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
