import { useState, useMemo } from "react";
import type { Entity, Relationship, DomainKey, OntologyType, OntologyDomain } from "../types";
import type { FilterItem } from "../components/common";
import { useEntityNeighbourhood } from "./useEntityNeighbourhood";

/**
 * Manages domain filter state — which domains are visible and which
 * are relevant to the current selection.
 */
export function useDomainFilter(
  entities: Entity[],
  relationships: Relationship[],
  ontology: OntologyType | undefined,
  selectedEntityId: string | null,
) {
  const [activeFilter, setActiveFilter] = useState<DomainKey | null>(null);

  const { domains: relevantDomains } = useEntityNeighbourhood(
    selectedEntityId,
    entities,
    relationships,
  );

  const filterItems: FilterItem[] = useMemo(() => {
    if (!ontology || !selectedEntityId) return [];

    return (Object.entries(ontology) as [DomainKey, OntologyDomain][])
      .filter(([key]) => relevantDomains.has(key))
      .slice(0, 10)
      .map(([key, data]) => ({
        key,
        label: data.label,
        icon: data.icon,
        color: data.color,
      }));
  }, [ontology, selectedEntityId, relevantDomains]);

  const stats = `${entities.length} entities · ${relationships.length} relationships`;

  return {
    activeFilter,
    setActiveFilter,
    filterItems,
    relevantDomains,
    stats,
  };
}
