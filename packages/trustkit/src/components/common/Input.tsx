import { forwardRef } from "react";
import { useTheme } from "../../theme/ThemeContext";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ value, onChange, placeholder, disabled, onSubmit, onCancel, onFocus, onBlur, autoFocus, style }, ref) {
    const { theme, sz } = useTheme();

    return (
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
          if (e.key === "Escape" && onCancel) {
            onCancel();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          padding: "5px 8px",
          borderRadius: 4,
          border: `1px solid ${theme.border.default}`,
          background: theme.surface.card,
          color: theme.text.primary,
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          outline: "none",
          ...style,
        }}
      />
    );
  }
);
