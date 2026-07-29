import type { Entity, Relationship } from "../../types";
import { SectionLabel, Card } from "../common";
import { useTheme } from "../../theme/ThemeContext";

interface EntityRelationshipsProps {
  entity: Entity;
  relationships: Relationship[];
  entities: Entity[];
  onEntityClick?: (entity: Entity) => void;
}

/**
 * Renders an entity's relationships grouped by direction, with
 * clickable connected entities.
 */
export function EntityRelationships({
  entity,
  relationships,
  entities,
  onEntityClick,
}: EntityRelationshipsProps) {
  const { theme, sz } = useTheme();
  const nodeRelationships = relationships.filter(
    r => r.from === entity.id || r.to === entity.id
  );

  if (nodeRelationships.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <SectionLabel>RELATIONSHIPS</SectionLabel>
        <div style={{ fontSize: sz(12), color: theme.text.hint, fontStyle: "italic" }}>
          No relationships
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <SectionLabel>RELATIONSHIPS ({nodeRelationships.length})</SectionLabel>
      {nodeRelationships.map((r, i) => {
        const otherId = r.from === entity.id ? r.to : r.from;
        const other = entities.find(e => e.id === otherId);
        const direction = r.from === entity.id ? "→" : "←";

        return (
          <Card
            key={i}
            padding="8px 10px"
            borderRadius={6}
            onClick={() => { if (other && onEntityClick) onEntityClick(other); }}
            style={{ marginBottom: 4 }}
          >
            <div style={{ fontSize: sz(11), color: theme.text.muted }}>
              <span style={{ color: other?.color || theme.text.subtle }}>
                {direction} {other?.label || otherId}
              </span>
            </div>
            <div style={{
              fontSize: sz(10),
              color: theme.text.faint,
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: 2,
            }}>
              {r.predicate.replace(/_/g, " ")}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
