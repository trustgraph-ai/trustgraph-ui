import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";

interface SourceLinkBadgeProps {
  /** The provenance chain (edge → chunk → document) */
  source: ProvenanceChain;
  /** Click handler — omit for static display */
  onClick?: (source: ProvenanceChain) => void;
}

/**
 * Clickable source reference badge showing the provenance chain.
 * When onClick is omitted, renders as a static label.
 */
export function SourceLinkBadge({ source, onClick }: SourceLinkBadgeProps) {
  const { theme, sz } = useTheme();
  const chainLabel = source.chain.map(c => c.label).join(" → ");
  const isClickable = !!onClick;

  return (
    <span
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(source);
        }
      }}
      title={isClickable ? `View source: ${chainLabel}` : chainLabel}
      style={{
        fontSize: sz(10),
        padding: "2px 7px",
        borderRadius: 4,
        background: withGlow(theme.palette.amber, 0.08),
        border: `1px solid ${withGlow(theme.palette.amber, 0.2)}`,
        color: theme.text.hint,
        fontFamily: "'IBM Plex Mono', monospace",
        cursor: isClickable ? "pointer" : "default",
        transition: "all 0.15s ease",
        display: "inline-block",
      }}
      onMouseEnter={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.background = withGlow(theme.palette.amber, 0.2);
          (e.currentTarget as HTMLElement).style.color = theme.palette.amber;
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = withGlow(theme.palette.amber, 0.08);
        (e.currentTarget as HTMLElement).style.color = theme.text.hint;
      }}
    >
      {chainLabel}
    </span>
  );
}
