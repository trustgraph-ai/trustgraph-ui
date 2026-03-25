import { useMemo } from "react";
import { SectionLabel, Card, Badge, LoadingState, text, border, palette, surface } from "@trustgraph/trustkit";
import { useLibrary, useProcessing } from "@trustgraph/react-state";

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

/**
 * Document Ingestion workflow — experimenting with ingestion UX.
 */
export function IngestPage() {
  const { documents, isLoading: docsLoading, isError: docsError } = useLibrary();
  const { processing, isLoading: procLoading, isError: procError } = useProcessing();

  const docs = (documents || []) as DocumentMetadata[];
  const procs = (processing || []) as ProcessingMetadata[];

  // Build a lookup from document ID to title for display in processing cards
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
    }}>
      {/* Left: library documents */}
      <div style={{
        width: 380,
        borderRight: `1px solid ${border.default}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${border.default}`,
          flexShrink: 0,
        }}>
          <SectionLabel>
            LIBRARY
            {docs.length > 0 && (
              <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
                {docs.length} document{docs.length !== 1 ? "s" : ""}
              </span>
            )}
          </SectionLabel>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px" }}>
          {docsLoading && <LoadingState message="Loading library..." />}

          {docsError && <LoadingState variant="error" message="Error loading library" />}

          {!docsLoading && !docsError && docs.length === 0 && (
            <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic", padding: 20, textAlign: "center" }}>
              No documents in library yet.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map((doc) => (
              <Card key={doc.id} padding="12px 16px" borderRadius={8}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: text.primary,
                  marginBottom: 4,
                }}>
                  {doc.title || doc.id}
                </div>

                {doc.comments && (
                  <div style={{
                    fontSize: 12,
                    color: text.subtle,
                    lineHeight: 1.5,
                    marginBottom: 6,
                  }}>
                    {doc.comments.length > 120
                      ? doc.comments.slice(0, 120) + "…"
                      : doc.comments}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {doc.kind && (
                    <span style={{
                      fontSize: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: text.faint,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: surface.card,
                      border: `1px solid ${border.subtle}`,
                    }}>
                      {doc.kind}
                    </span>
                  )}

                  {doc.tags && doc.tags.map((tag, i) => (
                    <Badge key={i} color={palette.cyan} size="small">{tag}</Badge>
                  ))}

                  {doc.time && (
                    <span style={{
                      fontSize: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: text.disabled,
                      marginLeft: "auto",
                    }}>
                      {new Date(doc.time * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Middle: processing submissions */}
      <div style={{
        width: 380,
        borderRight: `1px solid ${border.default}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${border.default}`,
          flexShrink: 0,
        }}>
          <SectionLabel>
            PROCESSING
            {procs.length > 0 && (
              <span style={{ color: text.muted, fontWeight: 400, marginLeft: 8 }}>
                {procs.length} submission{procs.length !== 1 ? "s" : ""}
              </span>
            )}
          </SectionLabel>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px" }}>
          {procLoading && <LoadingState message="Loading processing..." />}

          {procError && <LoadingState variant="error" message="Error loading processing" />}

          {!procLoading && !procError && procs.length === 0 && (
            <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic", padding: 20, textAlign: "center" }}>
              No documents submitted for processing.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {procs.map((proc) => {
              const docTitle = docTitleMap.get(proc["document-id"]) || proc["document-id"];
              return (
                <Card key={proc.id} padding="12px 16px" borderRadius={8} borderColor={palette.amber + "22"}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: text.primary,
                    marginBottom: 4,
                  }}>
                    {docTitle}
                  </div>

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    fontSize: 11,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {proc.collection && (
                      <div>
                        <span style={{ color: text.faint }}>collection: </span>
                        <span style={{ color: palette.emerald }}>{proc.collection}</span>
                      </div>
                    )}
                    {proc.flow && (
                      <div>
                        <span style={{ color: text.faint }}>flow: </span>
                        <span style={{ color: text.subtle }}>{proc.flow}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {proc.tags && proc.tags.map((tag, i) => (
                      <Badge key={i} color={palette.amber} size="small">{tag}</Badge>
                    ))}

                    {proc.time && (
                      <span style={{
                        fontSize: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: text.disabled,
                        marginLeft: "auto",
                      }}>
                        {new Date(proc.time).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: pipeline area (to be built) */}
      <div style={{
        flex: 1,
        padding: "28px",
        overflowY: "auto",
      }}>
        <SectionLabel marginBottom={20}>DOCUMENT INGESTION</SectionLabel>
        <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
          Pipeline area — upload, metadata, processing controls will go here.
        </div>
      </div>
    </div>
  );
}
