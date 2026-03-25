import type { ReactNode } from "react";

interface PageLayoutProps {
  /** Header height to subtract */
  headerOffset?: number;
  /** Page content */
  children: ReactNode;
  /** Page-level padding */
  padding?: string;
  /** Enable vertical scroll */
  scroll?: boolean;
  /** Content max-width (0 = no max) */
  maxWidth?: number;
}

/**
 * Standard page container that handles viewport height calculation.
 */
export function PageLayout({
  headerOffset = 110,
  children,
  padding = "0",
  scroll = false,
  maxWidth = 0,
}: PageLayoutProps) {
  return (
    <div style={{
      height: `calc(100vh - ${headerOffset}px)`,
      padding,
      overflowY: scroll ? "auto" : "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {maxWidth > 0 ? (
        <div style={{ maxWidth, margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
