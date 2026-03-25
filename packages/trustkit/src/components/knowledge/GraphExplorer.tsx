import { useState, useMemo } from "react";
import type { Entity, DomainKey } from "../../types";
import { useGraphData } from "../../hooks/useGraphData";
import { useEntityNeighbourhood } from "../../hooks/useEntityNeighbourhood";
import { useDomainFilter } from "../../hooks/useDomainFilter";
import { GraphCanvas } from "../graph/GraphCanvas";
import { GraphCanvasSVG } from "../graph/GraphCanvasSVG";
import { FilterBar, LoadingState } from "../common";
import { EntityProperties } from "./EntityProperties";
import { EntityRelationships } from "./EntityRelationships";
import { text, border } from "../../theme";

interface GraphExplorerProps {
  /** Which graph renderer to use */
  renderer?: "canvas" | "svg";
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

  return (
    <>
      {/* Domain Filter Bar */}
      <FilterBar
        items={filterItems}
        selectedKey={activeFilter}
        onSelect={(key) => setActiveFilter(key as DomainKey | null)}
        stats={stats}
        emptyMessage={selectedNode ? undefined : "Select a node to filter"}
      />

      {/* Main Content */}
      <div style={{ display: "flex", height: "calc(100vh - 150px)" }}>
        {/* Graph */}
        <div style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }}>
          {renderer === "canvas" ? (
            <GraphCanvas
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
        </div>

        {/* Detail Panel */}
        {selectedNode && ontology[selectedNode.domain] && (
          <div style={{
            width: 320,
            flexShrink: 0,
            borderLeft: `1px solid ${border.default}`,
            background: "rgba(12,12,18,0.95)",
            padding: 24,
            overflowY: "auto",
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}>
              <div style={{
                color: ontology[selectedNode.domain].color,
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
              }}>
                {ontology[selectedNode.domain].label.toUpperCase()} ENTITY
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: "none",
                  border: "none",
                  color: text.faint,
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            {/* Title */}
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              {selectedNode.icon} {selectedNode.label}
            </div>

            {/* Properties — Tier 2 piece */}
            <EntityProperties
              entity={selectedNode}
              propertyLabels={propertyLabels}
            />

            {/* Relationships — Tier 2 piece */}
            <EntityRelationships
              entity={selectedNode}
              relationships={relationships}
              entities={entities}
              onEntityClick={handleNodeSelect}
            />
          </div>
        )}
      </div>
    </>
  );
}
