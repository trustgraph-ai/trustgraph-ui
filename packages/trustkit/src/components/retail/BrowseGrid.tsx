import { text, surface, border, palette, withGlow } from "../../theme";
import type { RecommendedProduct } from "../../hooks/useRetailBuild";

interface BrowseGridProps {
  products: RecommendedProduct[];
}

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

function BrowseProductCard({ product }: { product: RecommendedProduct }) {
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
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: text.primary,
          lineHeight: 1.3, marginBottom: 6,
        }}>
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Stars rating={product.rating} />
          {product.reviewCount > 0 && (
            <span style={{ fontSize: 9, color: text.hint }}>
              ({product.reviewCount})
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: palette.emerald,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            ${product.price.toFixed(2)}
          </div>
          <div style={{
            fontSize: 9, color: product.inStock ? palette.emerald : palette.red,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {product.inStock ? "IN STOCK" : "OUT OF STOCK"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrowseGrid({ products }: BrowseGridProps) {
  if (products.length === 0) return null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        color: text.subtle,
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
