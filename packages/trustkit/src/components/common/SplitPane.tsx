import type { ReactNode } from "react";
import { border } from "../../theme";

interface SplitPaneProps {
  /** Primary content */
  children: ReactNode;
  /** Side panel content (null = hidden) */
  panel?: ReactNode | null;
  /** Panel width */
  panelWidth?: number | string;
  /** Panel position */
  panelSide?: "left" | "right";
  /** Show divider border */
  panelBorder?: boolean;
  /** Height of the container */
  height?: string;
}

/**
 * Two-panel layout with a primary area and a conditional side panel.
 * The panel overlays the primary content (no layout shift).
 */
export function SplitPane({
  children,
  panel,
  panelWidth = 320,
  panelSide = "right",
  panelBorder = true,
  height = "calc(100vh - 110px)",
}: SplitPaneProps) {
  return (
    <div style={{ position: "relative", height }}>
      {/* Primary content — always full width */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {children}
      </div>

      {/* Panel — overlays on one side */}
      {panel && (
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [panelSide]: 0,
          width: panelWidth,
          borderLeft: panelSide === "right" && panelBorder ? `1px solid ${border.default}` : undefined,
          borderRight: panelSide === "left" && panelBorder ? `1px solid ${border.default}` : undefined,
          background: "rgba(12,12,18,0.95)",
          backdropFilter: "blur(12px)",
          overflowY: "auto",
          zIndex: 10,
        }}>
          {panel}
        </div>
      )}
    </div>
  );
}
