import { useMemo } from "react";
import { SectionLabel, Card, Badge, LoadingState, text, border, palette, surface } from "@trustgraph/trustkit";
import { useLibrary, useProcessing, useFlows, useFlowBlueprints, useCollections, useSchemas, useOntologies, useKnowledgeCores } from "@trustgraph/react-state";

interface DocumentMetadata {
  id: string;
  title?: string;
  comments?: string;
  kind?: string;
  time?: number;
  tags?: string[];
  user?: string;
}

interface ProcessingMetadata {
  id: string;
  "document-id": string;
  flow?: string;
  collection?: string;
  tags?: string[];
  time?: number;
  user?: string;
}

function formatTime(t: number) {
  return new Date(t * 1000).toLocaleDateString();
}

/**
 * Document Ingestion workflow — data discovery mode.
 * Showing all available data sources to inform UX design.
 */
export function IngestPage() {
  const { documents, isLoading: docsLoading, isError: docsError } = useLibrary();
  const { processing, isLoading: procLoading, isError: procError } = useProcessing();
  const { flows, isLoading: flowsLoading } = useFlows();
  const { flowBlueprints: blueprints, isLoading: bpLoading } = useFlowBlueprints();
  const { collections, isLoading: collLoading } = useCollections();
  const { schemas: rawSchemas, schemasLoading } = useSchemas();
  const { ontologies, ontologiesLoading: ontoLoading } = useOntologies();
  const { knowledgeCores: cores, isLoading: coresLoading } = useKnowledgeCores();

  const docs = (documents || []) as DocumentMetadata[];
  const procs = (processing || []) as ProcessingMetadata[];
  const flowList = (flows || []) as any[];
  const bpList = (blueprints || []) as any[];
  const collList = (collections || []) as any[];
  const schemaList = (rawSchemas || []) as any[];
  const ontoList = (ontologies || []) as any[];
  const coreList = (cores || []) as any[];

  const docTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of docs) {
      map.set(doc.id, doc.title || doc.id);
    }
    return map;
  }, [docs]);

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 110px)",
      overflow: "hidden",
    }}>
      {/* Col 1: Library */}
      <DataColumn
        title="LIBRARY"
        count={docs.length}
        isLoading={docsLoading}
        isError={docsError}
        emptyMessage="No documents in library."
      >
        {docs.map((doc) => (
          <Card key={doc.id} padding="10px 14px" borderRadius={8}>
            <div style={{ fontSize: 12, fontWeight: 600, color: text.primary, marginBottom: 3 }}>
              {doc.title || doc.id}
            </div>
            {doc.comments && (
              <div style={{ fontSize: 11, color: text.subtle, lineHeight: 1.4, marginBottom: 4 }}>
                {doc.comments.length > 80 ? doc.comments.slice(0, 80) + "…" : doc.comments}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {doc.kind && <MiniTag>{doc.kind}</MiniTag>}
              {doc.tags && doc.tags.map((tag, i) => (
                <Badge key={i} color={palette.cyan} size="small">{tag}</Badge>
              ))}
              {doc.time ? <TimeStamp>{formatTime(doc.time)}</TimeStamp> : null}
            </div>
          </Card>
        ))}
      </DataColumn>

      {/* Col 2: Processing */}
      <DataColumn
        title="PROCESSING"
        count={procs.length}
        isLoading={procLoading}
        isError={procError}
        emptyMessage="No processing submissions."
      >
        {procs.map((proc) => (
          <Card key={proc.id} padding="10px 14px" borderRadius={8} borderColor={palette.amber + "22"}>
            <div style={{ fontSize: 12, fontWeight: 600, color: text.primary, marginBottom: 3 }}>
              {docTitleMap.get(proc["document-id"]) || proc["document-id"]}
            </div>
            <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: text.faint }}>
              {proc.collection && <span><span style={{ color: palette.emerald }}>{proc.collection}</span> · </span>}
              {proc.flow && <span>{proc.flow}</span>}
            </div>
            {proc.time ? <TimeStamp>{formatTime(proc.time)}</TimeStamp> : null}
          </Card>
        ))}
      </DataColumn>

      {/* Col 3: Collections */}
      <DataColumn
        title="COLLECTIONS"
        count={collList.length}
        isLoading={collLoading}
        emptyMessage="No collections."
      >
        {collList.map((coll: any, i: number) => {
          const id = coll.id || coll.collection || coll[0] || `coll-${i}`;
          const name = coll.name || coll.collection || id;
          const desc = coll.description;
          return (
            <Card key={id} padding="10px 14px" borderRadius={8} borderColor={palette.emerald + "22"}>
              <div style={{ fontSize: 12, fontWeight: 600, color: palette.emerald }}>{name}</div>
              {desc && <div style={{ fontSize: 11, color: text.subtle, marginTop: 2 }}>{desc}</div>}
              {coll.tags && coll.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {coll.tags.map((t: string, j: number) => (
                    <Badge key={j} color={palette.emerald} size="small">{t}</Badge>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </DataColumn>

      {/* Col 4: Flows + Blueprints */}
      <DataColumn
        title="FLOWS"
        count={flowList.length}
        isLoading={flowsLoading}
        emptyMessage="No running flows."
      >
        {flowList.map((flow: any, i: number) => {
          const id = flow.id || flow["flow-id"] || `flow-${i}`;
          const desc = flow.description || "";
          return (
            <Card key={id} padding="10px 14px" borderRadius={8} borderColor={palette.blue + "22"}>
              <div style={{ fontSize: 12, fontWeight: 600, color: palette.blue }}>{id}</div>
              {desc && <div style={{ fontSize: 11, color: text.subtle, marginTop: 2 }}>{desc}</div>}
            </Card>
          );
        })}

        {/* Blueprints sub-section */}
        <div style={{ marginTop: 12 }}>
          <SectionLabel>
            BLUEPRINTS
            {bpList.length > 0 && (
              <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>{bpList.length}</span>
            )}
          </SectionLabel>
          {bpLoading && <div style={{ fontSize: 11, color: text.disabled }}>Loading...</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {bpList.map((bp: any, i: number) => {
              const id = bp.id || bp[0] || `bp-${i}`;
              const data = bp[1] || bp;
              const desc = data.description || "";
              return (
                <Card key={id} padding="8px 12px" borderRadius={6}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: text.secondary }}>{id}</div>
                  {desc && <div style={{ fontSize: 10, color: text.faint, marginTop: 2 }}>{desc}</div>}
                </Card>
              );
            })}
          </div>
        </div>
      </DataColumn>

      {/* Col 5: Schemas + Ontologies + Knowledge Cores */}
      <DataColumn
        title="SCHEMAS"
        count={schemaList.length}
        isLoading={schemasLoading}
        emptyMessage="No schemas."
      >
        {schemaList.map((s: any, i: number) => {
          const key = Array.isArray(s) ? s[0] : s.key || s.name || `schema-${i}`;
          const data = Array.isArray(s) ? s[1] : s;
          const name = data?.name || key;
          const fields = data?.fields || [];
          return (
            <Card key={key} padding="8px 12px" borderRadius={6} borderColor={palette.purple + "22"}>
              <div style={{ fontSize: 11, fontWeight: 600, color: palette.purple }}>{name}</div>
              {fields.length > 0 && (
                <div style={{ fontSize: 10, color: text.faint, marginTop: 2 }}>
                  {fields.length} field{fields.length !== 1 ? "s" : ""}
                </div>
              )}
            </Card>
          );
        })}

        {/* Ontologies sub-section */}
        <div style={{ marginTop: 12 }}>
          <SectionLabel>
            ONTOLOGIES
            {ontoList.length > 0 && (
              <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>{ontoList.length}</span>
            )}
          </SectionLabel>
          {ontoLoading && <div style={{ fontSize: 11, color: text.disabled }}>Loading...</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {ontoList.map((o: any, i: number) => {
              const id = o.id || o[0] || `onto-${i}`;
              const data = o[1] || o;
              const name = data?.name || id;
              return (
                <Card key={id} padding="8px 12px" borderRadius={6} borderColor={palette.rose + "22"}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: palette.rose }}>{name}</div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Knowledge Cores sub-section */}
        <div style={{ marginTop: 12 }}>
          <SectionLabel>
            KNOWLEDGE CORES
            {coreList.length > 0 && (
              <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>{coreList.length}</span>
            )}
          </SectionLabel>
          {coresLoading && <div style={{ fontSize: 11, color: text.disabled }}>Loading...</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {coreList.map((c: any, i: number) => {
              const id = c.id || c[0] || `core-${i}`;
              return (
                <Card key={id} padding="8px 12px" borderRadius={6} borderColor={palette.amber + "22"}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: palette.amber }}>{id}</div>
                </Card>
              );
            })}
          </div>
        </div>
      </DataColumn>
    </div>
  );
}

// ── Helper components ────────────────────────────────────────────

function DataColumn({ title, count, isLoading, isError, emptyMessage, children }: {
  title: string;
  count: number;
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      flex: 1,
      minWidth: 200,
      borderRight: `1px solid ${border.default}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 14px",
        borderBottom: `1px solid ${border.default}`,
        flexShrink: 0,
      }}>
        <SectionLabel>
          {title}
          {count > 0 && (
            <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>{count}</span>
          )}
        </SectionLabel>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 12px" }}>
        {isLoading && <LoadingState message="Loading..." />}
        {isError && <LoadingState variant="error" message="Error" />}
        {!isLoading && !isError && count === 0 && (
          <div style={{ color: text.hint, fontSize: 11, fontStyle: "italic", padding: 12, textAlign: "center" }}>
            {emptyMessage}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MiniTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9,
      fontFamily: "'IBM Plex Mono', monospace",
      color: text.faint,
      padding: "1px 5px",
      borderRadius: 3,
      background: surface.card,
      border: `1px solid ${border.subtle}`,
    }}>
      {children}
    </span>
  );
}

function TimeStamp({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9,
      fontFamily: "'IBM Plex Mono', monospace",
      color: text.disabled,
      marginLeft: "auto",
    }}>
      {children}
    </span>
  );
}
