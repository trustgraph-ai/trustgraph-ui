import { useMemo } from "react";
import { SectionLabel, LoadingState, text, border, palette, withGlow } from "@trustgraph/trustkit";
import { useLibrary, useProcessing, useFlowBlueprints, useSchemas, useOntologies } from "@trustgraph/react-state";

interface DocumentMetadata {
  id: string;
  title?: string;
  comments?: string;
  kind?: string;
  time?: number;
  tags?: string[];
}

interface ProcessingMetadata {
  id: string;
  "document-id": string;
  flow?: string;
  collection?: string;
  tags?: string[];
  time?: number;
}

interface BlueprintDef {
  id?: string;
  description?: string;
  tags?: string[];
}

// Layout constants
const COL_WIDTH = 160;
const NODE_H = 36;
const COL_GAP = 80;
const ROW_GAP = 8;
const TOP_PAD = 50;
const LEFT_PAD = 20;

// Column X positions
const COL_X = {
  doc: LEFT_PAD,
  proc: LEFT_PAD + COL_WIDTH + COL_GAP,
  store: LEFT_PAD + (COL_WIDTH + COL_GAP) * 2,
  target: LEFT_PAD + (COL_WIDTH + COL_GAP) * 3,
};

interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  column: "doc" | "proc" | "store" | "target";
}

interface DiagramEdge {
  from: string;
  to: string;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function blueprintOutputPaths(bp: BlueprintDef | undefined): string[] {
  if (!bp || !bp.tags) return ["kg-graphrag"];
  const tags = bp.tags.map(t => t.toLowerCase());
  const paths: string[] = [];
  if (tags.includes("graph-rag")) paths.push("kg-graphrag");
  if (tags.includes("onto-rag")) paths.push("kg-ontology");
  if (tags.includes("structured")) paths.push("row-store");
  if (tags.includes("document-rag")) paths.push("chunk-store");
  if (tags.includes("kgcore")) paths.push("kgcore");
  if (paths.length === 0) paths.push("kg-graphrag"); // default
  return paths;
}

const storeConfig: Record<string, { label: string; color: string }> = {
  "kg-graphrag": { label: "KG (GraphRAG)", color: palette.blue },
  "kg-ontology": { label: "KG (Ontology)", color: palette.emerald },
  "row-store": { label: "Row Store", color: palette.purple },
  "chunk-store": { label: "Chunk Store", color: palette.rose },
  "kgcore": { label: "KG Core", color: palette.cyan },
};

export function IngestPage() {
  const { documents, isLoading: docsLoading } = useLibrary();
  const { processing, isLoading: procLoading } = useProcessing();
  const { flowBlueprints } = useFlowBlueprints();
  const { schemas: rawSchemas } = useSchemas();
  const { ontologies } = useOntologies();

  const docs = (documents || []) as DocumentMetadata[];
  const procs = (processing || []) as ProcessingMetadata[];
  const bps = (flowBlueprints || []) as BlueprintDef[];
  const schemaList = (rawSchemas || []) as any[];
  const ontoList = (ontologies || []) as any[];

  // Build blueprint lookup by ID
  const bpMap = useMemo(() => {
    const map = new Map<string, BlueprintDef>();
    for (const bp of bps) {
      if (bp.id) map.set(bp.id, bp);
    }
    return map;
  }, [bps]);

  // Build schema name lookup
  const schemaNames = useMemo(() => {
    return schemaList.map((s: any) => {
      if (Array.isArray(s)) return { key: s[0], name: s[1]?.name || s[0] };
      return { key: s.key || s.name, name: s.name || s.key };
    });
  }, [schemaList]);

  // Build ontology name lookup
  const ontoNames = useMemo(() => {
    return ontoList.map((o: any) => {
      if (Array.isArray(o)) return { key: o[0], name: o[1]?.name || o[0] };
      return { key: o.id || o.name, name: o.name || o.id };
    });
  }, [ontoList]);

  // Build diagram data
  const { nodes, edges, svgHeight, svgWidth } = useMemo(() => {
    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const nodeMap = new Map<string, DiagramNode>();

    let docY = TOP_PAD;
    let procY = TOP_PAD;
    let storeY = TOP_PAD;
    let targetY = TOP_PAD;

    // Track which stores and targets we've already created
    const storeNodes = new Map<string, string>(); // "proc:storetype" → nodeId
    const targetNodes = new Map<string, string>(); // "coll:schema/onto" → nodeId

    // Column 1: Documents
    for (const doc of docs) {
      const nodeId = `doc:${doc.id}`;
      const node: DiagramNode = {
        id: nodeId,
        label: truncate(doc.title || doc.id.split("/").pop() || doc.id, 20),
        x: COL_X.doc,
        y: docY,
        w: COL_WIDTH,
        h: NODE_H,
        color: palette.cyan,
        column: "doc",
      };
      nodes.push(node);
      nodeMap.set(nodeId, node);
      docY += NODE_H + ROW_GAP;
    }

    // Column 2: Processing + Column 3: Store types + Column 4: Targets
    for (const proc of procs) {
      const procId = `proc:${proc.id}`;
      const bp = bpMap.get(proc.flow || "");
      const flowLabel = proc.flow ? truncate(proc.flow, 16) : "default";

      const procNode: DiagramNode = {
        id: procId,
        label: flowLabel,
        x: COL_X.proc,
        y: procY,
        w: COL_WIDTH,
        h: NODE_H,
        color: palette.amber,
        column: "proc",
      };
      nodes.push(procNode);
      nodeMap.set(procId, procNode);

      // Edge: doc → proc
      const docNodeId = `doc:${proc["document-id"]}`;
      if (nodeMap.has(docNodeId)) {
        edges.push({ from: docNodeId, to: procId });
      }

      // Output paths from blueprint tags
      const outputPaths = blueprintOutputPaths(bp);

      for (const path of outputPaths) {
        const storeKey = `${procId}:${path}`;
        const cfg = storeConfig[path] || { label: path, color: text.muted };

        // Store node (column 3)
        let storeId = storeNodes.get(storeKey);
        if (!storeId) {
          storeId = `store:${proc.id}:${path}`;
          const storeNode: DiagramNode = {
            id: storeId,
            label: cfg.label,
            x: COL_X.store,
            y: storeY,
            w: COL_WIDTH,
            h: NODE_H,
            color: cfg.color,
            column: "store",
          };
          nodes.push(storeNode);
          nodeMap.set(storeId, storeNode);
          storeNodes.set(storeKey, storeId);
          storeY += NODE_H + ROW_GAP;
        }

        // Edge: proc → store
        edges.push({ from: procId, to: storeId });

        // Target node (column 4) — collection, +schema or +ontology
        let targetLabel = proc.collection || "default";
        let targetKey = `${path}:${proc.collection}`;
        let targetColor = cfg.color;

        if (path === "kg-ontology" && ontoNames.length > 0) {
          const ontoName = ontoNames[0]?.name || "ontology";
          targetLabel = `${proc.collection}\n+ ${truncate(ontoName, 14)}`;
          targetKey += `:onto:${ontoName}`;
        } else if (path === "row-store" && schemaNames.length > 0) {
          const schemaName = schemaNames[0]?.name || "schema";
          targetLabel = `${proc.collection}\n+ ${truncate(schemaName, 14)}`;
          targetKey += `:schema:${schemaName}`;
        }

        let targetId = targetNodes.get(targetKey);
        if (!targetId) {
          targetId = `target:${targetKey}`;
          const targetNode: DiagramNode = {
            id: targetId,
            label: truncate(targetLabel, 24),
            x: COL_X.target,
            y: targetY,
            w: COL_WIDTH,
            h: targetLabel.includes("\n") ? NODE_H + 14 : NODE_H,
            color: targetColor,
            column: "target",
          };
          nodes.push(targetNode);
          nodeMap.set(targetId, targetNode);
          targetNodes.set(targetKey, targetId);
          targetY += targetNode.h + ROW_GAP;
        }

        // Edge: store → target
        edges.push({ from: storeId, targetId: targetId } as any);
        edges.push({ from: storeId, to: targetId });
      }

      procY += NODE_H + ROW_GAP;
    }

    const maxY = Math.max(docY, procY, storeY, targetY) + 20;
    const maxX = COL_X.target + COL_WIDTH + LEFT_PAD;

    return { nodes, edges, svgHeight: Math.max(maxY, 300), svgWidth: Math.max(maxX, 800) };
  }, [docs, procs, bpMap, schemaNames, ontoNames]);

  // Deduplicate edges
  const uniqueEdges = useMemo(() => {
    const seen = new Set<string>();
    return edges.filter(e => {
      const key = `${e.from}→${e.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [edges]);

  if (docsLoading || procLoading) {
    return <LoadingState message="Loading ingestion data..." />;
  }

  return (
    <div style={{
      height: "calc(100vh - 110px)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 28px",
        borderBottom: `1px solid ${border.default}`,
        flexShrink: 0,
      }}>
        <SectionLabel>
          DATA LINEAGE
          <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
            {docs.length} documents · {procs.length} submissions
          </span>
        </SectionLabel>
      </div>

      {/* Diagram */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 12px" }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: "block" }}>
          {/* Column headers */}
          <text x={COL_X.doc + COL_WIDTH / 2} y={24} textAnchor="middle"
            fill={text.faint} fontSize={10} fontFamily="'IBM Plex Mono', monospace"
            fontWeight={600} letterSpacing="0.1em">
            DOCUMENTS
          </text>
          <text x={COL_X.proc + COL_WIDTH / 2} y={24} textAnchor="middle"
            fill={text.faint} fontSize={10} fontFamily="'IBM Plex Mono', monospace"
            fontWeight={600} letterSpacing="0.1em">
            PROCESSING
          </text>
          <text x={COL_X.store + COL_WIDTH / 2} y={24} textAnchor="middle"
            fill={text.faint} fontSize={10} fontFamily="'IBM Plex Mono', monospace"
            fontWeight={600} letterSpacing="0.1em">
            STORE
          </text>
          <text x={COL_X.target + COL_WIDTH / 2} y={24} textAnchor="middle"
            fill={text.faint} fontSize={10} fontFamily="'IBM Plex Mono', monospace"
            fontWeight={600} letterSpacing="0.1em">
            TARGET
          </text>

          {/* Edges */}
          {uniqueEdges.map((edge, i) => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;

            const x1 = from.x + from.w;
            const y1 = from.y + from.h / 2;
            const x2 = to.x;
            const y2 = to.y + to.h / 2;
            const midX = (x1 + x2) / 2;

            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={1.5}
                />
                <polygon
                  points={`${x2},${y2} ${x2 - 5},${y2 - 3} ${x2 - 5},${y2 + 3}`}
                  fill="rgba(255,255,255,0.12)"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={6}
                ry={6}
                fill={withGlow(node.color, 0.08)}
                stroke={withGlow(node.color, 0.3)}
                strokeWidth={1}
              />
              {node.label.includes("\n") ? (
                node.label.split("\n").map((line, li) => (
                  <text
                    key={li}
                    x={node.x + node.w / 2}
                    y={node.y + 16 + li * 14}
                    textAnchor="middle"
                    fill={node.color}
                    fontSize={10}
                    fontWeight={600}
                    fontFamily="'IBM Plex Mono', monospace"
                  >
                    {line}
                  </text>
                ))
              ) : (
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={node.color}
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  {node.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
