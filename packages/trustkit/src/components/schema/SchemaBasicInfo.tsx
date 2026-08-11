import { useTheme } from "../../theme/ThemeContext";
import { Input } from "../common/Input";
import { FormLabel } from "../common/FormLabel";

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
  const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: theme.font.mono, outline: "none" };
  const hintStyle = { fontSize: sz(9), color: theme.text.hint, marginTop: 2, marginBottom: 16 };
  return (
    <div>
      {isNew && onIdChange && (
        <>
          <FormLabel>SCHEMA ID</FormLabel>
          <Input value={id} onChange={onIdChange} placeholder="unique-schema-id" style={{ width: "100%" }} />
          <div style={hintStyle}>Unique identifier (cannot be changed later)</div>
        </>
      )}

      <FormLabel>NAME</FormLabel>
      <Input value={name} onChange={onNameChange} style={{ width: "100%" }} />
      <div style={hintStyle}>Display name for this schema</div>

      <FormLabel>DESCRIPTION</FormLabel>
      <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3}
        style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
      <div style={hintStyle}>Purpose and scope of this schema</div>
    </div>
  );
}
