import { useMemo } from "react";
import type { Entity, Relationship, DomainKey } from "../types";

export interface EntityNeighbourhood {
  neighbours: Entity[];
  connections: Relationship[];
  domains: Set<DomainKey>;
}

/**
 * Given an entity, returns its immediate graph neighbourhood —
 * connected entities, the relationships between them, and the
 * set of domains involved.
 */
export function useEntityNeighbourhood(
  entityId: string | null,
  entities: Entity[],
  relationships: Relationship[],
): EntityNeighbourhood {
  return useMemo(() => {
    if (!entityId) {
      return { neighbours: [], connections: [], domains: new Set<DomainKey>() };
    }

    const connections = relationships.filter(
      r => r.from === entityId || r.to === entityId
    );

    const neighbourIds = new Set<string>();
    for (const r of connections) {
      if (r.from === entityId) neighbourIds.add(r.to);
      else neighbourIds.add(r.from);
    }

    const neighbours = entities.filter(e => neighbourIds.has(e.id));

    const domains = new Set<DomainKey>();
    const self = entities.find(e => e.id === entityId);
    if (self) domains.add(self.domain);
    for (const n of neighbours) {
      domains.add(n.domain);
    }

    return { neighbours, connections, domains };
  }, [entityId, entities, relationships]);
}
