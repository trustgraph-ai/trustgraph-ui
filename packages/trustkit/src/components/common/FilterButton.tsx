import { useTheme } from "../../theme/ThemeContext";

interface FilterButtonProps {
  label: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  onClick: () => void;
}

export function FilterButton({ label, icon, color, isActive, onClick }: FilterButtonProps) {
  const { theme, sz } = useTheme();
  const activeColor = color || "#fff";

  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 20,
        border: `1px solid ${isActive ? activeColor + "88" : theme.border.medium}`,
        background: isActive ? activeColor + "15" : "transparent",
        color: isActive ? activeColor : theme.text.subtle,
        fontSize: sz(11),
        cursor: "pointer",
        fontFamily: theme.font.mono,
      }}
    >
      {icon && <>{icon} </>}{label}
    </button>
  );
}
