import { SectionLabel, text } from "@trustgraph/trustkit";

/**
 * Document Ingestion workflow — placeholder for experimenting
 * with ingestion UX approaches.
 */
export function IngestPage() {
  return (
    <div style={{
      padding: "48px 28px",
      height: "calc(100vh - 110px)",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionLabel marginBottom={20}>DOCUMENT INGESTION</SectionLabel>
        <div style={{ color: text.hint, fontSize: 13, fontStyle: "italic" }}>
          Building...
        </div>
      </div>
    </div>
  );
}
