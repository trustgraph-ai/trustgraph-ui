import { useTheme } from "../../theme/ThemeContext";

interface SectionLabelProps {
  children: React.ReactNode;
  marginBottom?: number;
  marginTop?: number;
}

export function SectionLabel({ children, marginBottom = 10, marginTop }: SectionLabelProps) {
  const { theme, sz } = useTheme();

  return (
    <div style={{
      fontSize: sz(10),
      color: theme.text.disabled,
      fontFamily: "'IBM Plex Mono', monospace",
      letterSpacing: "0.1em",
      marginBottom,
      marginTop,
    }}>
      {children}
    </div>
  );
}
