import { useTheme } from "../../theme/ThemeContext";

interface SchemaBasicInfoProps {
  id: string;
  name: string;
  description: string;
  onIdChange?: (id: string) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  isNew?: boolean;
}

export function SchemaBasicInfo({ id, name, description, onIdChange, onNameChange, onDescriptionChange, isNew }: SchemaBasicInfoProps) {
  const { theme, sz } = useTheme();
  const labelStyle = { fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: theme.text.faint, letterSpacing: "0.1em", marginBottom: 4 };
  const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none" };
  const hintStyle = { fontSize: sz(9), color: theme.text.hint, marginTop: 2, marginBottom: 16 };
  return (
    <div>
      {isNew && onIdChange && (
        <>
          <div style={labelStyle}>SCHEMA ID</div>
          <input type="text" value={id} onChange={(e) => onIdChange(e.target.value)} placeholder="unique-schema-id" style={inputStyle} />
          <div style={hintStyle}>Unique identifier (cannot be changed later)</div>
        </>
      )}

      <div style={labelStyle}>NAME</div>
      <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} style={inputStyle} />
      <div style={hintStyle}>Display name for this schema</div>

      <div style={labelStyle}>DESCRIPTION</div>
      <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3}
        style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
      <div style={hintStyle}>Purpose and scope of this schema</div>
    </div>
  );
}
