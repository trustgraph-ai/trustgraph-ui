import type { Entity } from "../../types";
import { SectionLabel } from "../common";
import { text, border } from "../../theme";

interface EntityPropertiesProps {
  entity: Entity;
  propertyLabels?: Record<string, string>;
}

/**
 * Renders an entity's properties as a key-value list with human-readable labels.
 */
export function EntityProperties({ entity, propertyLabels = {} }: EntityPropertiesProps) {
  const entries = Object.entries(entity.props || {});

  if (entries.length === 0) {
    return (
      <div style={{ marginTop: 20 }}>
        <SectionLabel>PROPERTIES</SectionLabel>
        <div style={{ fontSize: 12, color: text.hint, fontStyle: "italic" }}>
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
            borderBottom: `1px solid ${border.subtle}`,
          }}
        >
          <span style={{ fontSize: 12, color: text.subtle }}>
            {propertyLabels[k] || k}
          </span>
          <span style={{
            fontSize: 12,
            color: text.primary,
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
