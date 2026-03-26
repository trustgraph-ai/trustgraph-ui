import { useState, useMemo } from "react";
import { SectionLabel, DetailPanel, LoadingState, Badge, text, border, palette, surface, withGlow } from "@trustgraph/trustkit";
import { useLibrary, useProcessing, useFlows, useFlowBlueprints, useSchemas, useOntologies } from "@trustgraph/react-state";

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

// Column X positions (3 columns: documents, processing, destination)
const COL_X = {
  doc: LEFT_PAD,
  proc: LEFT_PAD + COL_WIDTH + COL_GAP,
  dest: LEFT_PAD + (COL_WIDTH + COL_GAP) * 2,
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
  const { flows } = useFlows();
  const { flowBlueprints } = useFlowBlueprints();
  const { schemas: rawSchemas } = useSchemas();
  const { ontologies } = useOntologies();

  const docs = (documents || []) as DocumentMetadata[];
  const procs = (processing || []) as ProcessingMetadata[];
  const flowList = (flows || []) as any[];
  const bps = (flowBlueprints || []) as BlueprintDef[];
  const schemaList = (rawSchemas || []) as any[];
  const ontoList = (ontologies || []) as any[];

  // Build flow → blueprint lookup: flow ID → blueprint ID
  const flowToBlueprintMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const flow of flowList) {
      const flowId = flow.id || flow["flow-id"];
      const bpId = flow.blueprint || flow["blueprint-id"] || flow["blueprint-name"];
      if (flowId && bpId) map.set(flowId, bpId);
    }
    return map;
  }, [flowList]);

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
    let destY = TOP_PAD;

    // Track deduplicated nodes
    const destNodes = new Map<string, string>(); // "storetype:coll:onto/schema" → nodeId

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

    // Column 2: Processing — collapsed by (flow, collection)
    const procNodes = new Map<string, string>(); // "flow:collection" → nodeId

    for (const proc of procs) {
      const flow = proc.flow || "default";
      const coll = proc.collection || "default";
      const procKey = `${flow}:${coll}`;
      // Resolve flow → blueprint → tags
      const blueprintId = flowToBlueprintMap.get(flow) || flow;
      const bp = bpMap.get(blueprintId);

      // Create proc node if not seen this (flow, collection) before
      let procId = procNodes.get(procKey);
      if (!procId) {
        procId = `proc:${procKey}`;
        const flowLabel = truncate(flow, 14);
        const bpLabel = truncate(blueprintId, 14);
        const collLabel = truncate(coll, 14);
        const procNode: DiagramNode = {
          id: procId,
          label: `${flowLabel} (${bpLabel})\n→ ${collLabel}`,
          x: COL_X.proc,
          y: procY,
          w: COL_WIDTH,
          h: NODE_H + 14,
          color: palette.amber,
          column: "proc",
        };
        nodes.push(procNode);
        nodeMap.set(procId, procNode);
        procNodes.set(procKey, procId);
        procY += NODE_H + 14 + ROW_GAP;

        // Output paths from blueprint tags — only once per proc node
        const outputPaths = blueprintOutputPaths(bp);

        for (const path of outputPaths) {
          const cfg = storeConfig[path] || { label: path, color: text.muted };

          // Build destination nodes — one per unique (store, collection, ontology/schema)
          if (path === "kg-ontology") {
            // One destination per (collection, ontology) pair
            const ontos = ontoNames.length > 0 ? ontoNames : [{ key: "default", name: "ontology" }];
            for (const onto of ontos) {
              const destKey = `kg-ontology:${coll}:${onto.key}`;
              let destId = destNodes.get(destKey);
              if (!destId) {
                destId = `dest:${destKey}`;
                const label = `${cfg.label}\n${truncate(coll, 12)}, ${truncate(onto.name, 12)}`;
                const destNode: DiagramNode = {
                  id: destId,
                  label,
                  x: COL_X.dest,
                  y: destY,
                  w: COL_WIDTH + 20,
                  h: NODE_H + 14,
                  color: cfg.color,
                  column: "dest" as any,
                };
                nodes.push(destNode);
                nodeMap.set(destId, destNode);
                destNodes.set(destKey, destId);
                destY += NODE_H + 14 + ROW_GAP;
              }
              edges.push({ from: procId, to: destId });
            }
          } else if (path === "row-store") {
            // One destination per (collection, schema) pair
            const schemas = schemaNames.length > 0 ? schemaNames : [{ key: "default", name: "schema" }];
            for (const schema of schemas) {
              const destKey = `row-store:${coll}:${schema.key}`;
              let destId = destNodes.get(destKey);
              if (!destId) {
                destId = `dest:${destKey}`;
                const label = `${cfg.label}\n${truncate(coll, 12)}, ${truncate(schema.name, 12)}`;
                const destNode: DiagramNode = {
                  id: destId,
                  label,
                  x: COL_X.dest,
                  y: destY,
                  w: COL_WIDTH + 20,
                  h: NODE_H + 14,
                  color: cfg.color,
                  column: "dest" as any,
                };
                nodes.push(destNode);
                nodeMap.set(destId, destNode);
                destNodes.set(destKey, destId);
                destY += NODE_H + 14 + ROW_GAP;
              }
              edges.push({ from: procId, to: destId });
            }
          } else if (path === "kgcore") {
            // KG Core — no collection, just a bucket
            const destKey = `kgcore`;
            let destId = destNodes.get(destKey);
            if (!destId) {
              destId = `dest:${destKey}`;
              const destNode: DiagramNode = {
                id: destId,
                label: cfg.label,
                x: COL_X.dest,
                y: destY,
                w: COL_WIDTH + 20,
                h: NODE_H,
                color: cfg.color,
                column: "dest" as any,
              };
              nodes.push(destNode);
              nodeMap.set(destId, destNode);
              destNodes.set(destKey, destId);
              destY += NODE_H + ROW_GAP;
            }
            edges.push({ from: procId, to: destId });
          } else {
            // KG (GraphRAG), Chunk Store — with collection
            const destKey = `${path}:${coll}`;
            let destId = destNodes.get(destKey);
            if (!destId) {
              destId = `dest:${destKey}`;
              const label = `${cfg.label}\n${truncate(coll, 16)}`;
              const destNode: DiagramNode = {
                id: destId,
                label,
                x: COL_X.dest,
                y: destY,
                w: COL_WIDTH + 20,
                h: NODE_H + 14,
                color: cfg.color,
                column: "dest" as any,
              };
              nodes.push(destNode);
              nodeMap.set(destId, destNode);
              destNodes.set(destKey, destId);
              destY += NODE_H + 14 + ROW_GAP;
            }
            edges.push({ from: procId, to: destId });
          }
        }
      }

      // Edge: doc → proc (always, even if proc node already existed)
      const docNodeId = `doc:${proc["document-id"]}`;
      if (nodeMap.has(docNodeId) && procId) {
        edges.push({ from: docNodeId, to: procId });
      }
    }

    // ── Barycentric ordering ──────────────────────────────────
    // Minimise edge crossings and vertical stretch by ordering
    // nodes in each column by the average Y of their neighbours
    // in the adjacent column.

    // Deduplicate edges for layout purposes
    const edgeSet = new Set<string>();
    const layoutEdges = edges.filter(e => {
      const key = `${e.from}→${e.to}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    });

    // Build adjacency: for each node, which nodes connect to it and from it
    const leftNeighbours = new Map<string, string[]>(); // node → nodes in column to its left
    const rightNeighbours = new Map<string, string[]>(); // node → nodes in column to its right
    for (const e of layoutEdges) {
      if (!rightNeighbours.has(e.from)) rightNeighbours.set(e.from, []);
      rightNeighbours.get(e.from)!.push(e.to);
      if (!leftNeighbours.has(e.to)) leftNeighbours.set(e.to, []);
      leftNeighbours.get(e.to)!.push(e.from);
    }

    // Group nodes by column
    type ColName = "doc" | "proc" | "dest";
    const columns: Record<ColName, DiagramNode[]> = { doc: [], proc: [], dest: [] };
    for (const n of nodes) {
      const col = n.column as ColName;
      if (columns[col]) columns[col].push(n);
    }

    // Assign initial Y positions sequentially per column
    function assignSequentialY(col: DiagramNode[]) {
      let y = TOP_PAD;
      for (const n of col) {
        n.y = y;
        y += n.h + ROW_GAP;
      }
    }

    // Get barycenter (average Y centre of connected nodes)
    function barycenter(_nodeId: string, neighbourIds: string[]): number | null {
      const ys: number[] = [];
      for (const nid of neighbourIds) {
        const n = nodeMap.get(nid);
        if (n) ys.push(n.y + n.h / 2);
      }
      return ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : null;
    }

    // Sort a column by barycenter of neighbours, then re-assign Y positions
    function orderByBarycenter(col: DiagramNode[], getNeighbours: Map<string, string[]>) {
      // Compute barycenter for each node
      const scored: { node: DiagramNode; bc: number }[] = [];
      for (const n of col) {
        const neighbours = getNeighbours.get(n.id) || [];
        const bc = barycenter(n.id, neighbours);
        scored.push({ node: n, bc: bc ?? n.y });
      }
      // Sort by barycenter
      scored.sort((a, b) => a.bc - b.bc);
      // Reassign Y positions in sorted order
      let y = TOP_PAD;
      for (const { node } of scored) {
        node.y = y;
        y += node.h + ROW_GAP;
      }
      // Update column array order
      col.length = 0;
      col.push(...scored.map(s => s.node));
    }

    // Initial sequential layout
    assignSequentialY(columns.doc);
    assignSequentialY(columns.proc);
    assignSequentialY(columns.dest);

    // Iterate barycentric ordering (left to right, then right to left)
    for (let iter = 0; iter < 4; iter++) {
      // Left to right: order proc by doc neighbours, dest by proc neighbours
      orderByBarycenter(columns.proc, leftNeighbours);
      orderByBarycenter(columns.dest, leftNeighbours);
      // Right to left: order doc by proc neighbours
      orderByBarycenter(columns.doc, rightNeighbours);
    }

    // Final pass left to right to settle
    orderByBarycenter(columns.proc, leftNeighbours);
    orderByBarycenter(columns.dest, leftNeighbours);

    // ── Compute SVG dimensions ──────────────────────────────
    function colMaxY(col: DiagramNode[]) {
      if (col.length === 0) return TOP_PAD;
      const last = col[col.length - 1];
      return last.y + last.h + ROW_GAP;
    }

    const maxY = Math.max(colMaxY(columns.doc), colMaxY(columns.proc), colMaxY(columns.dest)) + 20;
    const maxX = COL_X.dest + COL_WIDTH + 20 + LEFT_PAD;

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

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedProcKey, setSelectedProcKey] = useState<string | null>(null);
  const selectedDoc = selectedDocId ? docs.find(d => d.id === selectedDocId) : null;

  // Find processing submissions for the selected document
  const selectedDocProcs = useMemo(() => {
    if (!selectedDocId) return [];
    return procs.filter(p => p["document-id"] === selectedDocId);
  }, [selectedDocId, procs]);

  // Find flow data for the selected processing group
  const selectedFlow = useMemo(() => {
    if (!selectedProcKey) return null;
    const [flowId] = selectedProcKey.split(":");
    const flow = flowList.find((f: any) => (f.id || f["flow-id"]) === flowId);
    const blueprintId = flowToBlueprintMap.get(flowId) || flowId;
    const bp = bpMap.get(blueprintId);
    const collection = selectedProcKey.split(":").slice(1).join(":");
    const submissions = procs.filter(p => (p.flow || "default") === flowId && (p.collection || "default") === collection);
    return { flowId, flow, blueprintId, blueprint: bp, collection, submissions };
  }, [selectedProcKey, flowList, flowToBlueprintMap, bpMap, procs]);

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

      {/* Diagram + Detail panel */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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
            FLOWS
          </text>
          <text x={COL_X.dest + (COL_WIDTH + 20) / 2} y={24} textAnchor="middle"
            fill={text.faint} fontSize={10} fontFamily="'IBM Plex Mono', monospace"
            fontWeight={600} letterSpacing="0.1em">
            DESTINATION
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
          {nodes.map((node) => {
            const isDocNode = node.column === "doc";
            const isProcNode = node.column === "proc";
            const isClickable = isDocNode || isProcNode;
            const isSelectedDoc = isDocNode && selectedDocId && node.id === `doc:${selectedDocId}`;
            const isSelectedProc = isProcNode && selectedProcKey && node.id === `proc:${selectedProcKey}`;
            const isSelected = isSelectedDoc || isSelectedProc;
            const dimmed = (selectedDocId || selectedProcKey) && !isSelected && (isDocNode || isProcNode);

            return (
            <g
              key={node.id}
              onClick={isClickable ? () => {
                if (isDocNode) {
                  const docId = node.id.replace("doc:", "");
                  setSelectedDocId(selectedDocId === docId ? null : docId);
                  setSelectedProcKey(null);
                } else if (isProcNode) {
                  const procKey = node.id.replace("proc:", "");
                  setSelectedProcKey(selectedProcKey === procKey ? null : procKey);
                  setSelectedDocId(null);
                }
              } : undefined}
              style={{ cursor: isClickable ? "pointer" : "default" }}
            >
              {isSelected && (
                <rect
                  x={node.x - 3}
                  y={node.y - 3}
                  width={node.w + 6}
                  height={node.h + 6}
                  rx={9}
                  ry={9}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={2}
                  opacity={0.5}
                />
              )}
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                rx={6}
                ry={6}
                fill={withGlow(node.color, 0.08)}
                stroke={withGlow(node.color, isSelected ? 0.6 : 0.3)}
                strokeWidth={1}
                opacity={dimmed ? 0.3 : 1}
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
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedFlow && (
        <div style={{
          width: 360,
          flexShrink: 0,
          borderLeft: `1px solid ${border.default}`,
          background: "rgba(12,12,18,0.95)",
          backdropFilter: "blur(12px)",
          overflowY: "auto",
        }}>
          <DetailPanel
            title={selectedFlow.flowId}
            subtitle="FLOW"
            subtitleColor={palette.amber}
            onClose={() => setSelectedProcKey(null)}
          >
            {/* Blueprint */}
            <div style={{ marginBottom: 16 }}>
              <SectionLabel marginBottom={8}>BLUEPRINT</SectionLabel>
              <div style={{
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                color: palette.amber,
              }}>
                {selectedFlow.blueprintId}
              </div>
              {selectedFlow.blueprint?.description && (
                <div style={{
                  fontSize: 12,
                  color: text.subtle,
                  lineHeight: 1.5,
                  marginTop: 4,
                }}>
                  {selectedFlow.blueprint.description}
                </div>
              )}
            </div>

            {/* Tags */}
            {selectedFlow.blueprint?.tags && selectedFlow.blueprint.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel marginBottom={8}>TAGS</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedFlow.blueprint.tags.map((tag: string, i: number) => (
                    <Badge key={i} color={palette.amber} size="small">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Collection */}
            <div style={{ marginBottom: 16 }}>
              <SectionLabel marginBottom={8}>COLLECTION</SectionLabel>
              <div style={{
                fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                color: palette.emerald,
              }}>
                {selectedFlow.collection}
              </div>
            </div>

            {/* Flow parameters */}
            {selectedFlow.flow?.parameters && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel marginBottom={8}>PARAMETERS</SectionLabel>
                {Object.entries(selectedFlow.flow.parameters as Record<string, any>).map(([key, val]) => (
                  <div key={key} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: `1px solid ${border.subtle}`,
                    fontSize: 11,
                  }}>
                    <span style={{ color: text.subtle }}>{key}</span>
                    <span style={{
                      color: text.primary,
                      fontFamily: "'IBM Plex Mono', monospace",
                      textAlign: "right",
                      maxWidth: "60%",
                      wordBreak: "break-word",
                    }}>
                      {typeof val === "object" ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Submissions in this group */}
            <SectionLabel marginBottom={8}>
              SUBMISSIONS
              <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
                {selectedFlow.submissions.length}
              </span>
            </SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedFlow.submissions.map((proc) => {
                const docTitle = docs.find(d => d.id === proc["document-id"])?.title || proc["document-id"];
                return (
                  <div key={proc.id} style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: withGlow(palette.cyan, 0.06),
                    border: `1px solid ${withGlow(palette.cyan, 0.15)}`,
                    fontSize: 11,
                    color: text.secondary,
                  }}>
                    {truncate(docTitle, 30)}
                    {proc.time && (
                      <span style={{
                        color: text.disabled,
                        fontFamily: "'IBM Plex Mono', monospace",
                        marginLeft: 8,
                        fontSize: 10,
                      }}>
                        {new Date(proc.time * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </DetailPanel>
        </div>
      )}
      {selectedDoc && (
        <div style={{
          width: 360,
          flexShrink: 0,
          borderLeft: `1px solid ${border.default}`,
          background: "rgba(12,12,18,0.95)",
          backdropFilter: "blur(12px)",
          overflowY: "auto",
        }}>
          <DetailPanel
            title={selectedDoc.title || selectedDoc.id}
            subtitle="DOCUMENT"
            subtitleColor={palette.cyan}
            onClose={() => setSelectedDocId(null)}
          >
            {/* Metadata */}
            {selectedDoc.kind && (
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: text.faint,
                  padding: "2px 6px",
                  borderRadius: 3,
                  background: surface.card,
                  border: `1px solid ${border.subtle}`,
                }}>
                  {selectedDoc.kind}
                </span>
              </div>
            )}

            {selectedDoc.comments && (
              <div style={{
                fontSize: 13,
                color: text.secondary,
                lineHeight: 1.6,
                marginBottom: 16,
              }}>
                {selectedDoc.comments}
              </div>
            )}

            {selectedDoc.tags && selectedDoc.tags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel marginBottom={8}>TAGS</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedDoc.tags.map((tag, i) => (
                    <Badge key={i} color={palette.cyan} size="small">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedDoc.time && (
              <div style={{ marginBottom: 16 }}>
                <SectionLabel marginBottom={8}>UPLOADED</SectionLabel>
                <div style={{
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: text.subtle,
                }}>
                  {new Date(selectedDoc.time * 1000).toLocaleString()}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <SectionLabel marginBottom={8}>DOCUMENT ID</SectionLabel>
              <div style={{
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                color: text.faint,
                wordBreak: "break-all",
              }}>
                {selectedDoc.id}
              </div>
            </div>

            {/* Processing submissions for this document */}
            <SectionLabel marginBottom={8}>
              PROCESSING
              {selectedDocProcs.length > 0 && (
                <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
                  {selectedDocProcs.length}
                </span>
              )}
            </SectionLabel>
            {selectedDocProcs.length === 0 ? (
              <div style={{ fontSize: 12, color: text.hint, fontStyle: "italic" }}>
                Not submitted for processing.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDocProcs.map((proc) => (
                  <div key={proc.id} style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: withGlow(palette.amber, 0.06),
                    border: `1px solid ${withGlow(palette.amber, 0.15)}`,
                  }}>
                    <div style={{
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      <span style={{ color: text.faint }}>flow: </span>
                      <span style={{ color: palette.amber }}>{proc.flow || "default"}</span>
                    </div>
                    <div style={{
                      fontSize: 11,
                      fontFamily: "'IBM Plex Mono', monospace",
                      marginTop: 2,
                    }}>
                      <span style={{ color: text.faint }}>collection: </span>
                      <span style={{ color: palette.emerald }}>{proc.collection || "default"}</span>
                    </div>
                    {proc.time && (
                      <div style={{
                        fontSize: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: text.disabled,
                        marginTop: 4,
                      }}>
                        {new Date(proc.time * 1000).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DetailPanel>
        </div>
      )}
      </div>
    </div>
  );
}
