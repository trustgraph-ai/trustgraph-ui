import { useTheme } from "../../theme/ThemeContext";

interface SelectableListItemProps {
  children: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  color?: string;
  style?: React.CSSProperties;
}

export function SelectableListItem({
  children,
  isSelected,
  onClick,
  color,
  style,
}: SelectableListItemProps) {
  const { theme, sz } = useTheme();
  const c = color ?? theme.palette.cyan;

  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        marginBottom: 2,
        borderRadius: 6,
        border: isSelected ? `1px solid ${c}44` : "1px solid transparent",
        background: isSelected ? `${c}1a` : "transparent",
        color: isSelected ? c : theme.text.secondary,
        fontSize: sz(11),
        fontFamily: theme.font.mono,
        cursor: "pointer",
        transition: "all 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = theme.surface.cardHover;
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}
