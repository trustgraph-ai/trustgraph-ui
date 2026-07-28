import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeContext";

interface ToolbarProps {
  /** Bar contents */
  children: ReactNode;
  /** Show bottom border */
  borderBottom?: boolean;
  /** Override padding */
  padding?: string;
}

/**
 * Horizontal bar for controls and labels at the top of a section.
 */
export function Toolbar({
  children,
  borderBottom = true,
  padding = "20px 28px",
}: ToolbarProps) {
  const { theme } = useTheme();

  return (
    <div style={{
      padding,
      borderBottom: borderBottom ? `1px solid ${theme.border.default}` : undefined,
    }}>
      {children}
    </div>
  );
}
