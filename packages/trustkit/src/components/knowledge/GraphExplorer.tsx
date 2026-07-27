import { useState, useMemo } from "react";
import type { Entity, DomainKey } from "../../types";
import { useGraphData } from "../../hooks/useGraphData";
import { useEntityNeighbourhood } from "../../hooks/useEntityNeighbourhood";
import { useDomainFilter } from "../../hooks/useDomainFilter";
import { GraphCanvas } from "../graph/GraphCanvas";
import { GraphCanvasSVG } from "../graph/GraphCanvasSVG";
import { GraphCanvas3D } from "../graph/GraphCanvas3D";
import { FilterBar, LoadingState, SplitPane, DetailPanel } from "../common";
import { EntityProperties } from "./EntityProperties";
import { EntityRelationships } from "./EntityRelationships";

interface GraphExplorerProps {
  /** Which graph renderer to use */
  renderer?: "canvas" | "svg" | "3d";
  /** External callback when an entity is selected */
  onEntitySelect?: (entity: Entity | null) => void;
}

/**
 * Complete graph exploration view — graph canvas + filter bar + detail panel.
 * Wires useGraphData + useDomainFilter + useEntityNeighbourhood into a
 * self-contained explorer.
 */
export function GraphExplorer({ renderer = "svg", onEntitySelect }: GraphExplorerProps) {
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const { entities, relationships, ontology, propertyLabels, isLoading, isError } = useGraphData();

  const {
    activeFilter,
    setActiveFilter,
    filterItems,
    stats,
  } = useDomainFilter(entities, relationships, ontology, selectedNode?.id || null);

  const { neighbours } = useEntityNeighbourhood(
    selectedNode?.id || null,
    entities,
    relationships,
  );

  const highlightedEntities = useMemo(() => {
    if (!selectedNode) return [];
    return [selectedNode.id, ...neighbours.map(n => n.id)];
  }, [selectedNode, neighbours]);

  const handleNodeClick = (node: Entity) => {
    const newSelection = selectedNode?.id === node.id ? null : node;
    setSelectedNode(newSelection);
    onEntitySelect?.(newSelection);
  };

  const handleNodeSelect = (node: Entity) => {
    setSelectedNode(node);
    onEntitySelect?.(node);
  };

  const handleClose = () => {
    setSelectedNode(null);
    onEntitySelect?.(null);
  };

  if (isLoading) {
    return <LoadingState message="Loading graph data..." />;
  }

  if (isError || !ontology) {
    return <LoadingState variant="error" message="Error loading graph data" />;
  }

  const detailPanel = selectedNode && ontology[selectedNode.domain] ? (
    <DetailPanel
      title={`${selectedNode.icon} ${selectedNode.label}`}
      subtitle={`${ontology[selectedNode.domain].label.toUpperCase()} ENTITY`}
      subtitleColor={ontology[selectedNode.domain].color}
      onClose={handleClose}
    >
      <EntityProperties
        entity={selectedNode}
        propertyLabels={propertyLabels}
      />
      <EntityRelationships
        entity={selectedNode}
        relationships={relationships}
        entities={entities}
        onEntityClick={handleNodeSelect}
      />
    </DetailPanel>
  ) : null;

  return (
    <>
      <FilterBar
        items={filterItems}
        selectedKey={activeFilter}
        onSelect={(key) => setActiveFilter(key as DomainKey | null)}
        stats={stats}
        emptyMessage={selectedNode ? undefined : "Select a node to filter"}
      />

      <SplitPane panel={detailPanel} height="calc(100vh - 150px)">
        {renderer === "canvas" ? (
          <GraphCanvas
            entities={entities}
            relationships={relationships}
            ontology={ontology}
            highlightedEntities={highlightedEntities}
            onNodeClick={handleNodeClick}
            activeFilter={activeFilter}
          />
        ) : renderer === "3d" ? (
          <GraphCanvas3D
            entities={entities}
            relationships={relationships}
            ontology={ontology}
            highlightedEntities={highlightedEntities}
            onNodeClick={handleNodeClick}
            activeFilter={activeFilter}
          />
        ) : (
          <GraphCanvasSVG
            entities={entities}
            relationships={relationships}
            ontology={ontology}
            highlightedEntities={highlightedEntities}
            onNodeClick={handleNodeClick}
            activeFilter={activeFilter}
          />
        )}
      </SplitPane>
    </>
  );
}
