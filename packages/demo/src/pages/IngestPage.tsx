import { SectionLabel, Card, Badge, LoadingState, text, border, palette, surface } from "@trustgraph/trustkit";
import { useLibrary } from "@trustgraph/react-state";

interface DocumentMetadata {
  id: string;
  title?: string;
  comments?: string;
  kind?: string;
  time?: number;
  tags?: string[];
  user?: string;
}

/**
 * Document Ingestion workflow — experimenting with ingestion UX.
 */
export function IngestPage() {
  const { documents, isLoading, isError } = useLibrary();

  const docs = (documents || []) as DocumentMetadata[];

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 110px)",
    }}>
      {/* Left: pipeline area (to be built) */}
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

      {/* Right: library documents */}
      <div style={{
        width: 380,
        borderLeft: `1px solid ${border.default}`,
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
          {isLoading && <LoadingState message="Loading library..." />}

          {isError && <LoadingState variant="error" message="Error loading library" />}

          {!isLoading && !isError && docs.length === 0 && (
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
                      {new Date(doc.time).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
