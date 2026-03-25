import type { Entity } from "../../types";
import { Badge } from "../common";

interface EntityBadgeProps {
  entity: Entity;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Renders a single entity as a coloured badge with domain icon and label.
 */
export function EntityBadge({ entity, selected, onClick }: EntityBadgeProps) {
  return (
    <Badge color={entity.color} selected={selected} onClick={onClick}>
      <span style={{ fontSize: 10 }}>{entity.icon}</span>
      {entity.label}
    </Badge>
  );
}
