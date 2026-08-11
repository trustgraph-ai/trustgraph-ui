import { forwardRef } from "react";
import { useTheme } from "../../theme/ThemeContext";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ value, onChange, children, disabled, style }, ref) {
    const { theme, sz } = useTheme();

    return (
      <select
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          padding: "5px 8px",
          borderRadius: 4,
          border: `1px solid ${theme.border.default}`,
          background: theme.surface.card,
          color: theme.text.primary,
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          outline: "none",
          cursor: "pointer",
          ...style,
        }}
      >
        {children}
      </select>
    );
  }
);
