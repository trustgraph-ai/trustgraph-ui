import { useTheme } from "../../theme/ThemeContext";

interface SchemaValidationErrorsProps {
  errors: string[];
}

export function SchemaValidationErrors({ errors }: SchemaValidationErrorsProps) {
  const { theme, sz } = useTheme();
  if (errors.length === 0) return null;

  return (
    <div style={{ padding: "8px 12px", borderRadius: 6, background: `${theme.palette.red}1a`, marginBottom: 16 }}>
      {errors.map((err, i) => (
        <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0", fontSize: sz(10), fontFamily: theme.font.mono, color: theme.palette.red }}>
          <span style={{ flexShrink: 0 }}>●</span>
          <span>{err}</span>
        </div>
      ))}
    </div>
  );
}
