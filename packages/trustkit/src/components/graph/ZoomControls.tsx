import { useTheme } from "../../theme/ThemeContext";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const { theme, sz } = useTheme();

  const buttonStyle: React.CSSProperties = {
    width: sz(28),
    height: sz(28),
    border: "none",
    borderRadius: 4,
    background: theme.border.medium,
    color: theme.text.subtle,
    cursor: "pointer",
    fontSize: sz(16),
    fontWeight: "bold",
  };

  return (
    <>
      {/* Zoom controls */}
      <div style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: theme.surface.overlayLight,
        borderRadius: 8,
        padding: 4,
        border: `1px solid ${theme.border.medium}`,
      }}>
        <button
          onClick={onZoomIn}
          style={buttonStyle}
          title="Zoom in"
        >+</button>
        <button
          onClick={onZoomOut}
          style={buttonStyle}
          title="Zoom out"
        >−</button>
        <button
          onClick={onReset}
          style={{ ...buttonStyle, fontSize: sz(10) }}
          title="Reset view"
        >⟲</button>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          color: theme.text.faint,
          background: theme.surface.overlayLight,
          padding: "4px 8px",
          borderRadius: 4,
        }}>
          {Math.round(zoom * 100)}%
        </div>
      )}
    </>
  );
}
