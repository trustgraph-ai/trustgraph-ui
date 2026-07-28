import type { Entity, Relationship, OntologyType } from "../../types";
import { SectionLabel, Card } from "../common";
import { useTheme } from "../../theme/ThemeContext";

interface NodeDetailPanelProps {
  node: Entity;
  relationships: Relationship[];
  entities: Entity[];
  ontology: OntologyType;
  propertyLabels: Record<string, string>;
  onClose: () => void;
  onNodeSelect: (node: Entity) => void;
}

export function NodeDetailPanel({ node, relationships, entities, ontology, propertyLabels, onClose, onNodeSelect }: NodeDetailPanelProps) {
  const { theme, sz } = useTheme();

  // Filter relationships for this node
  const nodeRelationships = relationships.filter(
    r => r.from === node.id || r.to === node.id
  );

  return (
    <div style={{
      width: 320, flexShrink: 0, borderLeft: `1px solid ${theme.border.default}`,
      background: theme.surface.overlay, padding: 24, overflowY: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ color: ontology[node.domain].color, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
          {ontology[node.domain].label.toUpperCase()} ENTITY
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.text.faint, cursor: "pointer", fontSize: sz(18) }}>×</button>
      </div>
      <div style={{ fontSize: sz(20), fontWeight: 700, color: theme.text.primary, marginBottom: 6 }}>
        {node.icon} {node.label}
      </div>
      <div style={{ marginTop: 20 }}>
        <SectionLabel>PROPERTIES</SectionLabel>
        {Object.entries(node.props || {}).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.border.subtle}` }}>
            <span style={{ fontSize: sz(12), color: theme.text.subtle }}>{propertyLabels[k] || k}</span>
            <span style={{ fontSize: sz(12), color: theme.text.primary, fontFamily: "'IBM Plex Mono', monospace", textAlign: "right" }}>{String(v)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <SectionLabel>RELATIONSHIPS</SectionLabel>
        {nodeRelationships.map((r, i) => {
          const otherId = r.from === node.id ? r.to : r.from;
          const other = entities.find(e => e.id === otherId);
          const direction = r.from === node.id ? "→" : "←";
          return (
            <Card
              key={i}
              padding="8px 10px"
              borderRadius={6}
              onClick={() => { if (other) onNodeSelect(other); }}
              style={{ marginBottom: 4 }}
            >
              <div style={{ fontSize: sz(11), color: theme.text.muted }}>
                <span style={{ color: other?.color || theme.text.subtle }}>{direction} {other?.label}</span>
              </div>
              <div style={{ fontSize: sz(10), color: theme.text.faint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                {r.predicate.replace(/_/g, " ")}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
