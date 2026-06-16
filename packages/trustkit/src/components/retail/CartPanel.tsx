import { text, surface, border, palette, withGlow } from "../../theme";
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
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push("\u2605");
    else if (i === full && half) stars.push("\u2BEA");
    else stars.push("\u2606");
  }
  return (
    <span style={{ color: palette.amber, fontSize: 10, letterSpacing: 1 }}>
      {stars.join("")}
    </span>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10,
      fontFamily: "'IBM Plex Mono', monospace",
      color: text.subtle,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function BuildItemRow({ item }: { item: CartItem }) {
  const icon = item.slot ? SLOT_ICONS[item.slot] || "\u25CF" : "\u25CF";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 0",
    }}>
      <span style={{ color: text.hint, fontSize: 12, width: 16, textAlign: "center" }}>
        {icon}
      </span>
      <span style={{
        fontSize: 10, color: text.hint, width: 70,
        fontFamily: "'IBM Plex Mono', monospace",
        textTransform: "uppercase",
      }}>
        {item.slot || "Extra"}
      </span>
      <span style={{ flex: 1, fontSize: 11, color: text.muted, minWidth: 0 }}>
        {item.name}
      </span>
      <span style={{
        fontSize: 11, color: text.muted,
        fontFamily: "'IBM Plex Mono', monospace",
        flexShrink: 0,
      }}>
        ${item.price.toFixed(0)}
      </span>
    </div>
  );
}

function ExtraItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 0",
    }}>
      <span style={{ color: palette.cyan, fontSize: 12, width: 16, textAlign: "center" }}>
        +
      </span>
      <span style={{ flex: 1, fontSize: 11, color: text.muted, minWidth: 0 }}>
        {item.name}
      </span>
      <span style={{
        fontSize: 11, color: text.muted,
        fontFamily: "'IBM Plex Mono', monospace",
        flexShrink: 0,
      }}>
        ${item.price.toFixed(0)}
      </span>
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: text.hint,
          cursor: "pointer",
          fontSize: 12,
          padding: "0 4px",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
        title="Remove"
      >
        x
      </button>
    </div>
  );
}

function CrossSellCard({ product, onAdd }: { product: RecommendedProduct; onAdd: () => void }) {
  return (
    <div
      style={{
        borderRadius: 8,
        background: surface.card,
        border: `1px solid ${border.subtle}`,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = withGlow(palette.cyan, 0.4))}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = border.subtle)}
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
          fontSize: 12, fontWeight: 600, color: text.primary,
          lineHeight: 1.3, marginBottom: 4,
        }}>
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Stars rating={product.rating} />
          {product.reviewCount > 0 && (
            <span style={{ fontSize: 9, color: text.hint }}>({product.reviewCount})</span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: palette.emerald,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            ${product.price.toFixed(0)}
          </div>
          <div style={{
            fontSize: 9, color: product.inStock ? palette.emerald : palette.red,
            fontFamily: "'IBM Plex Mono', monospace",
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
            border: `1px solid ${product.inStock ? withGlow(palette.cyan, 0.3) : border.subtle}`,
            background: product.inStock ? withGlow(palette.cyan, 0.08) : surface.card,
            color: product.inStock ? palette.cyan : text.disabled,
            fontSize: 11, fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
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
          background: withGlow(palette.cyan, 0.05),
          border: `1px solid ${withGlow(palette.cyan, 0.15)}`,
          marginBottom: 16,
          fontSize: 13,
          color: text.primary,
          lineHeight: 1.5,
        }}>
          {lastMessage}
          {isThinking && (
            <span style={{
              display: "inline-block",
              width: 6, height: 14,
              background: palette.cyan,
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
        background: surface.card,
        border: `1px solid ${border.subtle}`,
        padding: "8px 12px",
        marginBottom: 6,
      }}>
        {buildItems.map((item) => (
          <BuildItemRow key={item.slot || item.name} item={item} />
        ))}
        <div style={{
          borderTop: `1px solid ${border.subtle}`,
          marginTop: 4,
          paddingTop: 6,
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 11, color: text.subtle }}>Build subtotal</span>
          <span style={{
            fontSize: 12, fontWeight: 600, color: text.muted,
            fontFamily: "'IBM Plex Mono', monospace",
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
            background: surface.card,
            border: `1px solid ${border.subtle}`,
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
              borderTop: `1px solid ${border.subtle}`,
              marginTop: 4,
              paddingTop: 6,
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: text.subtle }}>Extras subtotal</span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: palette.cyan,
                fontFamily: "'IBM Plex Mono', monospace",
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
        background: withGlow(palette.emerald, 0.05),
        border: `1px solid ${withGlow(palette.emerald, 0.2)}`,
        padding: "12px 16px",
        marginTop: 8,
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: text.primary }}>
          Order Total
        </span>
        <span style={{
          fontSize: 20, fontWeight: 700, color: palette.emerald,
          fontFamily: "'IBM Plex Mono', monospace",
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
            border: `1px solid ${palette.emerald}`,
            background: withGlow(palette.emerald, 0.12),
            color: palette.emerald,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
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
