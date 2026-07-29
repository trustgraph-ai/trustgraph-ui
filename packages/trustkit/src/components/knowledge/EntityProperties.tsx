import type { Entity } from "../../types";
import { SectionLabel } from "../common";
import { useTheme } from "../../theme/ThemeContext";

interface EntityPropertiesProps {
  entity: Entity;
  propertyLabels?: Record<string, string>;
}

export function EntityProperties({ entity, propertyLabels = {} }: EntityPropertiesProps) {
  const { theme, sz } = useTheme();
  const entries = Object.entries(entity.props || {});

  if (entries.length === 0) {
    return (
      <div style={{ marginTop: 20 }}>
        <SectionLabel>PROPERTIES</SectionLabel>
        <div style={{ fontSize: sz(12), color: theme.text.hint, fontStyle: "italic" }}>
          No properties
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel>PROPERTIES</SectionLabel>
      {entries.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: `1px solid ${theme.border.subtle}`,
          }}
        >
          <span style={{ fontSize: sz(12), color: theme.text.subtle }}>
            {propertyLabels[k] || k}
          </span>
          <span style={{
            fontSize: sz(12),
            color: theme.text.primary,
            fontFamily: "'IBM Plex Mono', monospace",
            textAlign: "right",
            maxWidth: "60%",
            wordBreak: "break-word",
          }}>
            {String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
