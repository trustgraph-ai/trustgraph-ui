import { useTheme } from "../../theme/ThemeContext";

interface FormLabelProps {
  children: React.ReactNode;
  marginBottom?: number;
  style?: React.CSSProperties;
}

export function FormLabel({ children, marginBottom = 4, style }: FormLabelProps) {
  const { theme, sz } = useTheme();

  return (
    <div style={{
      fontSize: sz(10),
      fontFamily: theme.font.mono,
      fontWeight: 600,
      color: theme.text.faint,
      letterSpacing: "0.1em",
      marginBottom,
      ...style,
    }}>
      {children}
    </div>
  );
}
