import { GraphExplorer } from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

/**
 * Knowledge Explorer workflow — uses the GraphExplorer composite
 * from trustkit. This is the simplest possible integration: one
 * component, no additional wiring.
 */
export function ExploreView() {
  return (
    <>
      <GraphExplorer renderer="svg" />
      <DevPanel
        explanation="This entire view is a single GraphExplorer composite from trustkit. It internally wires useGraphData, useDomainFilter, and useEntityNeighbourhood to provide a complete graph exploration experience with filtering and entity detail."
        codeSamples={[
          {
            label: "Minimal integration",
            code: `import { GraphExplorer } from "@trustgraph/trustkit";

function MyGraphPage() {
  return <GraphExplorer renderer="svg" />;
}`,
          },
          {
            label: "With external selection callback",
            code: `import { GraphExplorer } from "@trustgraph/trustkit";

function MyGraphPage() {
  const handleSelect = (entity) => {
    console.log("Selected:", entity?.label);
  };

  return (
    <GraphExplorer
      renderer="svg"
      onEntitySelect={handleSelect}
    />
  );
}`,
          },
          {
            label: "Custom view using Tier 1 + Tier 2",
            code: `import {
  useGraphData,
  useEntityNeighbourhood,
  GraphCanvasSVG,
  EntityProperties,
  EntityRelationships,
} from "@trustgraph/trustkit";

function CustomGraphView() {
  const [selected, setSelected] = useState(null);
  const { entities, relationships, ontology }
    = useGraphData();
  const { neighbours } = useEntityNeighbourhood(
    selected?.id, entities, relationships
  );

  return (
    <div style={{ display: "flex" }}>
      <GraphCanvasSVG
        entities={entities}
        relationships={relationships}
        ontology={ontology}
        highlightedEntities={
          selected
            ? [selected.id, ...neighbours.map(n => n.id)]
            : []
        }
        onNodeClick={setSelected}
        activeFilter={null}
      />
      {selected && (
        <div>
          <EntityProperties entity={selected} />
          <EntityRelationships
            entity={selected}
            relationships={relationships}
            entities={entities}
            onEntityClick={setSelected}
          />
        </div>
      )}
    </div>
  );
}`,
          },
        ]}
        components={[
          { name: "GraphExplorer", tier: "3", description: "Self-contained graph exploration view" },
          { name: "GraphCanvasSVG", tier: "2", description: "SVG-based graph renderer" },
          { name: "GraphCanvas", tier: "2", description: "Canvas-based graph renderer" },
          { name: "EntityProperties", tier: "2", description: "Entity key-value property display" },
          { name: "EntityRelationships", tier: "2", description: "Clickable relationship list" },
          { name: "EntityBadge", tier: "2", description: "Entity as a coloured badge" },
          { name: "FilterBar", tier: "2", description: "Domain filter chips" },
        ]}
        hooks={[
          { name: "useGraphData", tier: "1", description: "Fetches and parses all triples into entities and relationships" },
          { name: "useEntityNeighbourhood", tier: "1", description: "Returns connected entities for a selection" },
          { name: "useDomainFilter", tier: "1", description: "Manages domain filter state from selection" },
        ]}
      />
    </>
  );
}
