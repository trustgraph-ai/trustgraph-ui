import { useTheme } from "@trustgraph/trustkit";
import { withGlow } from "@trustgraph/trustkit";
import type { RecommendedProduct } from "../../hooks/useRetailBuild";

interface ProductCardProps {
  product: RecommendedProduct;
  onSelect: () => void;
  rank: number;
}

const SPEC_LABELS: Record<string, string> = {
  coreCount: "Cores",
  threadCount: "Threads",
  baseClock: "Base",
  boostClock: "Boost",
  tdp: "TDP",
  vram: "VRAM",
  gpuLength: "Length",
  performanceScore: "Perf",
  minPSUWattage: "Min PSU",
  maxRAMSlots: "RAM Slots",
  maxRAMSpeed: "Max RAM",
  nvmeSlots: "NVMe",
  sataPorts: "SATA",
  ramSpeed: "Speed",
  ramCapacity: "Capacity",
  ramModules: "Sticks",
  storageCapacity: "Capacity",
  readSpeed: "Read",
  writeSpeed: "Write",
  psuWattage: "Wattage",
  maxGPULength: "GPU Clear.",
  maxCoolerHeight: "Cooler Clear.",
  coolingCapacity: "TDP Rating",
  coolerHeight: "Height",
};

const SPEC_UNITS: Record<string, string> = {
  baseClock: "MHz",
  boostClock: "MHz",
  tdp: "W",
  vram: "GB",
  gpuLength: "mm",
  minPSUWattage: "W",
  maxRAMSpeed: "MHz",
  ramSpeed: "MHz",
  ramCapacity: "GB",
  storageCapacity: "GB",
  readSpeed: "MB/s",
  writeSpeed: "MB/s",
  psuWattage: "W",
  maxGPULength: "mm",
  maxCoolerHeight: "mm",
  coolingCapacity: "W",
  coolerHeight: "mm",
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

export function ProductCard({ product, onSelect, rank }: ProductCardProps) {
  const { theme, sz } = useTheme();
  const specEntries = Object.entries(product.specs).slice(0, 6);
  const hasSpecs = specEntries.length > 0;

  return (
    <div
      style={{
        borderRadius: 8,
        background: theme.surface.card,
        border: `1px solid ${theme.border.subtle}`,
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = withGlow(theme.palette.blue, 0.4))}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = theme.border.subtle)}
    >
      {/* Header */}
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{
          fontSize: sz(9), fontWeight: 700, color: theme.palette.blue,
          fontFamily: theme.font.mono,
          background: withGlow(theme.palette.blue, 0.12),
          border: `1px solid ${withGlow(theme.palette.blue, 0.25)}`,
          borderRadius: 4, padding: "2px 5px", flexShrink: 0,
        }}>
          #{rank}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: sz(12), fontWeight: 600, color: theme.text.primary,
            lineHeight: 1.3, marginBottom: 3,
          }}>
            {product.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Stars rating={product.rating} />
            {product.reviewCount > 0 && (
              <span style={{ fontSize: sz(9), color: theme.text.hint }}>
                ({product.reviewCount})
              </span>
            )}
            {product.performanceTier && (
              <span style={{
                fontSize: sz(8), color: theme.palette.purple,
                fontFamily: theme.font.mono,
                padding: "1px 4px", borderRadius: 3,
                background: withGlow(theme.palette.purple, 0.1),
              }}>
                {product.performanceTier}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: sz(15), fontWeight: 700, color: theme.palette.emerald,
            fontFamily: theme.font.mono,
          }}>
            ${product.price.toFixed(0)}
          </div>
          <div style={{
            fontSize: sz(8), color: product.inStock ? theme.palette.emerald : theme.palette.red,
            fontFamily: theme.font.mono,
          }}>
            {product.inStock ? "IN STOCK" : "OUT OF STOCK"}
          </div>
        </div>
      </div>

      {/* Image */}
      {product.imageUrl && (
        <div style={{
          padding: "0 12px 6px",
          borderTop: `1px solid ${theme.border.subtle}`,
        }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{
              width: "100%",
              aspectRatio: "3 / 2",
              objectFit: "contain",
              borderRadius: 4,
              marginTop: 6,
              background: theme.surface.cardHover,
            }}
          />
        </div>
      )}

      {/* Specs */}
      {hasSpecs && (
        <div style={{
          padding: "6px 12px 8px",
          borderTop: `1px solid ${theme.border.subtle}`,
          display: "flex", flexWrap: "wrap", gap: "4px 12px",
        }}>
          {specEntries.map(([key, value]) => (
            <div key={key} style={{ fontSize: sz(10) }}>
              <span style={{ color: theme.text.hint }}>{SPEC_LABELS[key] || key}: </span>
              <span style={{
                color: theme.text.muted,
                fontFamily: theme.font.mono,
              }}>
                {value}{SPEC_UNITS[key] ? ` ${SPEC_UNITS[key]}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Select button */}
      <div style={{ padding: "0 12px 10px" }}>
        <button
          onClick={onSelect}
          disabled={!product.inStock}
          style={{
            width: "100%",
            padding: "7px 0",
            borderRadius: 6,
            border: `1px solid ${product.inStock ? withGlow(theme.palette.blue, 0.3) : theme.border.subtle}`,
            background: product.inStock ? withGlow(theme.palette.blue, 0.08) : theme.surface.card,
            color: product.inStock ? theme.palette.blue : theme.text.disabled,
            fontSize: sz(11), fontWeight: 600,
            fontFamily: theme.font.mono,
            cursor: product.inStock ? "pointer" : "not-allowed",
          }}
        >
          {product.inStock ? "Select" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}
