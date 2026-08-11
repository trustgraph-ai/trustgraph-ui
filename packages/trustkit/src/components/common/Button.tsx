import { useTheme } from "../../theme/ThemeContext";

type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  active?: boolean;
  size?: ButtonSize;
  style?: React.CSSProperties;
  title?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
}

const sizeStyles: Record<ButtonSize, { padding: string; borderRadius: number }> = {
  sm: { padding: "3px 8px", borderRadius: 4 },
  md: { padding: "5px 10px", borderRadius: 4 },
  lg: { padding: "5px 14px", borderRadius: 6 },
};

export function Button({
  children,
  onClick,
  disabled,
  color,
  active = true,
  size = "md",
  style,
  title,
  onMouseEnter,
  onMouseLeave,
}: ButtonProps) {
  const { theme, sz } = useTheme();
  const c = color ?? theme.palette.emerald;
  const { padding, borderRadius } = sizeStyles[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding,
        borderRadius,
        border: `1px solid ${active ? c + "44" : theme.border.default}`,
        background: active ? `${c}1a` : "transparent",
        color: disabled ? theme.text.disabled : active ? c : theme.text.faint,
        fontSize: sz(size === "sm" ? 9 : size === "lg" ? 11 : 10),
        fontFamily: theme.font.mono,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
