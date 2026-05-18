import { palette } from "../../theme";

interface SchemaValidationErrorsProps {
  errors: string[];
}

export function SchemaValidationErrors({ errors }: SchemaValidationErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div style={{ padding: "8px 12px", borderRadius: 6, background: `${palette.red}1a`, marginBottom: 16 }}>
      {errors.map((err, i) => (
        <div key={i} style={{ display: "flex", gap: 6, padding: "2px 0", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: palette.red }}>
          <span style={{ flexShrink: 0 }}>●</span>
          <span>{err}</span>
        </div>
      ))}
    </div>
  );
}
