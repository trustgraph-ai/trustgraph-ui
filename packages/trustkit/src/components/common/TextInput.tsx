import { useTheme } from "../../theme/ThemeContext";

interface TextInputProps {
  /** Controlled value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Enter key handler */
  onSubmit?: () => void;
  /** Focus on mount */
  autoFocus?: boolean;
  /** Input type */
  type?: "text" | "password" | "url";
}

/**
 * Base text input field. Dark-themed, consistent with the design language.
 */
export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  onSubmit,
  autoFocus,
  type = "text",
}: TextInputProps) {
  const { theme, sz } = useTheme();

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      style={{
        width: "100%",
        padding: "10px 14px",
        fontSize: sz(14),
        fontFamily: theme.font.sans,
        color: theme.text.primary,
        background: "transparent",
        border: `1px solid ${theme.border.medium}`,
        borderRadius: 8,
        outline: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}
