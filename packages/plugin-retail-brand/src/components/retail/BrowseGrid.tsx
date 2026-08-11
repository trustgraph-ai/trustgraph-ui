import { useTheme } from "@trustgraph/trustkit";
import { withGlow } from "@trustgraph/trustkit";
import type { RecommendedProduct } from "../../hooks/useRetailBuild";

interface BrowseGridProps {
  products: RecommendedProduct[];
}

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

function BrowseProductCard({ product }: { product: RecommendedProduct }) {
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
            background: theme.surface.cardHover,
          }}
        />
      )}
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          fontSize: sz(13), fontWeight: 600, color: theme.text.primary,
          lineHeight: 1.3, marginBottom: 6,
        }}>
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Stars rating={product.rating} />
          {product.reviewCount > 0 && (
            <span style={{ fontSize: sz(9), color: theme.text.hint }}>
              ({product.reviewCount})
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: sz(18), fontWeight: 700, color: theme.palette.emerald,
            fontFamily: theme.font.mono,
          }}>
            ${product.price.toFixed(2)}
          </div>
          <div style={{
            fontSize: sz(9), color: product.inStock ? theme.palette.emerald : theme.palette.red,
            fontFamily: theme.font.mono,
          }}>
            {product.inStock ? "IN STOCK" : "OUT OF STOCK"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrowseGrid({ products }: BrowseGridProps) {
  const { theme, sz } = useTheme();
  if (products.length === 0) return null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        fontSize: sz(10),
        fontFamily: theme.font.mono,
        color: theme.text.subtle,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
      }}>
        Products ({products.length})
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {products.map((p) => (
          <BrowseProductCard key={p.uri} product={p} />
        ))}
      </div>
    </div>
  );
}
