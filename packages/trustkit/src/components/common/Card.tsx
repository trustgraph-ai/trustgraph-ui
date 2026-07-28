import { useTheme } from "../../theme/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  padding?: number | string;
  borderRadius?: number;
  borderColor?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({
  children,
  padding = 24,
  borderRadius = 12,
  borderColor,
  onClick,
  style,
}: CardProps) {
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      style={{
        padding,
        borderRadius,
        background: theme.surface.card,
        border: `1px solid ${borderColor ?? theme.border.subtle}`,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
