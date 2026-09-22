import { useState, useEffect, useCallback, useMemo, type KeyboardEvent } from "react";
import { useTheme } from "@trustgraph/trustkit";
import { useSocket } from "@trustgraph/react-provider";
import { useSessionStore, useWorkspaceStore, useSettings, useLibrary, useProcessing } from "@trustgraph/react-state";
import { useNavigation } from "../navigation";

interface ServiceEntry {
  uri: string;
  label: string;
  identifier: string;
}

interface DatasetEntry {
  uri: string;
  title: string;
  description: string;
  abstract?: string;
  image?: string;
  landingPage?: string;
  keywords: string[];
  services: ServiceEntry[];
}

interface CatalogEntry {
  uri: string;
  title: string;
  description: string;
  image?: string;
  landingPage?: string;
  datasets: DatasetEntry[];
}

const CATALOG_QUERY = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX schema: <https://schema.org/>

SELECT ?catalog ?catTitle ?catDesc ?catImage ?catLandingPage
       ?dataset ?dsTitle ?dsDesc ?dsAbstract ?dsImage ?dsLandingPage
       ?keyword
       ?service ?svcLabel ?svcId
WHERE {
  ?catalog a dcat:Catalog .
  OPTIONAL { ?catalog dcterms:title ?catTitle }
  OPTIONAL { ?catalog dcterms:description ?catDesc }
  OPTIONAL { ?catalog schema:image ?catImage }
  OPTIONAL { ?catalog dcat:landingPage ?catLandingPage }
  OPTIONAL {
    ?catalog dcat:dataset ?dataset .
    OPTIONAL { ?dataset dcterms:title ?dsTitle }
    OPTIONAL { ?dataset dcterms:description ?dsDesc }
    OPTIONAL { ?dataset dcterms:abstract ?dsAbstract }
    OPTIONAL { ?dataset schema:image ?dsImage }
    OPTIONAL { ?dataset dcat:landingPage ?dsLandingPage }
    OPTIONAL { ?dataset dcat:keyword ?keyword }
    OPTIONAL {
      ?dataset dcat:accessService ?service .
      OPTIONAL { ?service dcterms:title ?svcLabel }
      OPTIONAL { ?service dcterms:identifier ?svcId }
    }
  }
}
`;

function groupCatalogs(rows: Record<string, string>[]): CatalogEntry[] {
  const catalogMap = new Map<string, CatalogEntry>();
  const datasetMap = new Map<string, DatasetEntry>();
  const serviceSet = new Set<string>();
  const keywordSet = new Map<string, Set<string>>();

  for (const row of rows) {
    const catUri = row.catalog;
    if (!catalogMap.has(catUri)) {
      catalogMap.set(catUri, {
        uri: catUri,
        title: row.catTitle || "Untitled Catalog",
        description: row.catDesc || "",
        image: row.catImage || undefined,
        landingPage: row.catLandingPage || undefined,
        datasets: [],
      });
    }

    const dsUri = row.dataset;
    if (!dsUri) continue;

    if (!datasetMap.has(dsUri)) {
      const ds: DatasetEntry = {
        uri: dsUri,
        title: row.dsTitle || "Untitled Dataset",
        description: row.dsDesc || "",
        abstract: row.dsAbstract || undefined,
        image: row.dsImage || undefined,
        landingPage: row.dsLandingPage || undefined,
        keywords: [],
        services: [],
      };
      datasetMap.set(dsUri, ds);
      catalogMap.get(catUri)!.datasets.push(ds);
      keywordSet.set(dsUri, new Set());
    }

    if (row.keyword) {
      const kws = keywordSet.get(dsUri)!;
      if (!kws.has(row.keyword)) {
        kws.add(row.keyword);
        datasetMap.get(dsUri)!.keywords.push(row.keyword);
      }
    }

    if (row.service && row.svcId) {
      const key = `${dsUri}|${row.service}`;
      if (!serviceSet.has(key)) {
        serviceSet.add(key);
        datasetMap.get(dsUri)!.services.push({
          uri: row.service,
          label: row.svcLabel || row.svcId,
          identifier: row.svcId,
        });
      }
    }
  }

  return Array.from(catalogMap.values());
}

export function WelcomePage() {
  const { theme, sz } = useTheme();
  const socket = useSocket();
  const flowId = useSessionStore((s) => s.flowId);
  const generation = useWorkspaceStore((s) => s.generation);
  const { settings } = useSettings();
  const collection = settings.collection;
  const { navigate } = useNavigation();

  const { documents } = useLibrary();
  const { processing } = useProcessing();

  const processedDocs = useMemo(() => {
    const docs = (documents || []) as { id: string; title?: string; comments?: string; tags?: string[] }[];
    const procs = (processing || []) as { "document-id": string; flow?: string; collection?: string }[];
    const docMap = new Map(docs.map((d) => [d.id, d]));
    const result = new Map<string, {
      id: string;
      title: string;
      comments?: string;
      tags: string[];
      submissions: { flow: string; collection: string }[];
    }>();
    for (const proc of procs) {
      const docId = proc["document-id"];
      const doc = docMap.get(docId);
      if (!doc) continue;
      if (!result.has(docId)) {
        result.set(docId, {
          id: docId,
          title: doc.title || docId.split("/").pop() || docId,
          comments: doc.comments,
          tags: doc.tags || [],
          submissions: [],
        });
      }
      const key = `${proc.flow || "default"}:${proc.collection || "default"}`;
      const entry = result.get(docId)!;
      if (!entry.submissions.some((s) => `${s.flow}:${s.collection}` === key)) {
        entry.submissions.push({
          flow: proc.flow || "default",
          collection: proc.collection || "default",
        });
      }
    }
    return Array.from(result.values());
  }, [documents, processing]);

  const [searchQuery, setSearchQuery] = useState("");
  const [catalogs, setCatalogs] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q) navigate({ target: "urn:component:search", params: { q } });
  };

  const handleSearchKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = socket.flow(flowId);
      const result = await api.sparqlQuery(CATALOG_QUERY, collection);
      setCatalogs(groupCatalogs(result.rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalogs");
    } finally {
      setLoading(false);
    }
  }, [socket, flowId, collection]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs, generation]);

  return (
    <div style={{
      padding: sz(32), maxWidth: 960, margin: "0 auto",
      color: theme.text.primary, fontFamily: theme.font.sans,
      height: "var(--page-height)", overflowY: "auto",
    }}>
      <h1 style={{ fontSize: sz(28), fontWeight: 600, marginBottom: sz(8) }}>
        Welcome
      </h1>

      {!loading && catalogs.length === 0 && (
        <>
          <div style={{ display: "flex", gap: sz(8), marginBottom: sz(32) }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search the knowledge graph…"
              style={{
                flex: 1,
                padding: `${sz(10)}px ${sz(14)}px`,
                fontSize: sz(14),
                borderRadius: 8,
                border: `1px solid ${theme.border.default}`,
                background: theme.surface.overlay,
                color: theme.text.primary,
                fontFamily: theme.font.sans,
                outline: "none",
              }}
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              style={{
                padding: `${sz(10)}px ${sz(20)}px`,
                fontSize: sz(14),
                borderRadius: 8,
                border: `1px solid ${theme.border.default}`,
                background: theme.surface.overlay,
                color: theme.text.primary,
                cursor: !searchQuery.trim() ? "default" : "pointer",
                fontFamily: theme.font.sans,
                opacity: !searchQuery.trim() ? 0.5 : 1,
              }}
            >
              Search
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: sz(12),
            marginBottom: sz(32),
          }}>
            {[
              {
                icon: "⬇",
                label: "Demo Data Loader",
                description: "New here? Browse ready-made datasets and load one to explore what TrustGraph can do.",
                target: "urn:component:demo-loader",
                color: theme.palette.emerald,
              },
              {
                icon: "⬆",
                label: "Document Ingestion",
                description: "Bring your own documents — upload and process them into a knowledge graph.",
                target: "urn:component:ingest",
                color: theme.palette.amber,
              },
              {
                icon: "◎",
                label: "Graph Navigator",
                description: "Explore the knowledge graph visually — navigate nodes and relationships.",
                target: "urn:component:graph-navigator",
                color: theme.palette.cyan,
              },
            ].map((card) => (
              <button
                key={card.target}
                onClick={() => navigate({ target: card.target })}
                style={{
                  padding: sz(16),
                  borderRadius: 10,
                  border: `1px solid ${card.color}30`,
                  background: `${card.color}08`,
                  color: theme.text.primary,
                  cursor: "pointer",
                  fontFamily: theme.font.sans,
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${card.color}50`;
                  e.currentTarget.style.background = `${card.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${card.color}30`;
                  e.currentTarget.style.background = `${card.color}08`;
                }}
              >
                <div style={{
                  fontSize: sz(20), marginBottom: sz(6),
                }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: sz(14), fontWeight: 600, marginBottom: sz(4) }}>
                  {card.label}
                </div>
                <div style={{ fontSize: sz(12), color: theme.text.muted, lineHeight: 1.4 }}>
                  {card.description}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {loading && (
        <p style={{ color: theme.text.muted, fontSize: sz(14) }}>Loading catalogs…</p>
      )}

      {error && (
        <p style={{ color: theme.text.faint, fontSize: sz(14) }}>{error}</p>
      )}

      <h3 style={{
        fontSize: sz(12), fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.08em", color: theme.text.muted,
        marginBottom: 0, paddingBottom: sz(8),
        borderBottom: `1px solid ${theme.border.default}`,
      }}>
        Catalogs
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: sz(32), marginTop: sz(12) }}>
        {!loading && catalogs.length === 0 && (
          <p style={{ color: theme.text.muted, fontSize: sz(13) }}>No catalogs found.</p>
        )}
        {catalogs.map((cat) => (
          <div key={cat.uri}>
            <div style={{ display: "flex", gap: sz(16), marginBottom: sz(24) }}>
              {cat.image && (
                <img
                  src={cat.image}
                  alt=""
                  onClick={() => cat.landingPage && navigate({
                    target: "urn:component:docs",
                    params: { url: cat.landingPage, title: cat.title },
                  })}
                  style={{
                    width: sz(120),
                    height: sz(80),
                    objectFit: "cover",
                    borderRadius: 8,
                    flexShrink: 0,
                    cursor: cat.landingPage ? "pointer" : undefined,
                  }}
                />
              )}
              <div>
                <h2
                  onClick={() => cat.landingPage && navigate({
                    target: "urn:component:docs",
                    params: { url: cat.landingPage, title: cat.title },
                  })}
                  style={{
                    fontSize: sz(22), fontWeight: 600, marginBottom: sz(4),
                    cursor: cat.landingPage ? "pointer" : undefined,
                  }}
                >
                  {cat.title}
                </h2>
                {cat.description && (
                  <p style={{ fontSize: sz(13), color: theme.text.muted, lineHeight: 1.5 }}>
                    {cat.description}
                  </p>
                )}
              </div>
            </div>

            <h3 style={{
              fontSize: sz(12), fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.08em", color: theme.text.muted,
              marginBottom: 0, paddingBottom: sz(8), marginLeft: sz(16),
              borderBottom: `1px solid ${theme.border.default}`,
            }}>
              Datasets
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: sz(16), marginLeft: sz(16), marginTop: sz(12) }}>
              {cat.datasets.length === 0 && (
                <p style={{ color: theme.text.muted, fontSize: sz(13) }}>No datasets found.</p>
              )}
              {cat.datasets.map((ds) => (
                <div
                  key={ds.uri}
                  style={{
                    padding: sz(20),
                    borderRadius: 10,
                    background: theme.surface.overlay,
                    border: `1px solid ${theme.border.default}`,
                    display: "flex",
                    gap: sz(20),
                  }}
                >
                  {ds.image && (
                    <img
                      src={ds.image}
                      alt=""
                      onClick={() => ds.landingPage && navigate({
                        target: "urn:component:docs",
                        params: { url: ds.landingPage, title: ds.title },
                      })}
                      style={{
                        width: sz(140),
                        height: sz(100),
                        objectFit: "cover",
                        borderRadius: 8,
                        flexShrink: 0,
                        cursor: ds.landingPage ? "pointer" : undefined,
                      }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => ds.landingPage && navigate({
                        target: "urn:component:docs",
                        params: { url: ds.landingPage, title: ds.title },
                      })}
                      style={{
                        fontSize: sz(17), fontWeight: 600, marginBottom: sz(6),
                        cursor: ds.landingPage ? "pointer" : undefined,
                      }}
                    >
                      {ds.title}
                    </div>

                    {ds.abstract && (
                      <p style={{
                        fontSize: sz(13), color: theme.text.muted,
                        lineHeight: 1.5, marginBottom: sz(10),
                      }}>
                        {ds.abstract}
                      </p>
                    )}

                    {!ds.abstract && ds.description && (
                      <p style={{
                        fontSize: sz(13), color: theme.text.muted,
                        lineHeight: 1.5, marginBottom: sz(10),
                      }}>
                        {ds.description}
                      </p>
                    )}

                    {ds.keywords.length > 0 && (
                      <div style={{
                        display: "flex", flexWrap: "wrap", gap: sz(6),
                        marginBottom: sz(12),
                      }}>
                        {ds.keywords.map((kw) => (
                          <span
                            key={kw}
                            style={{
                              fontSize: sz(11),
                              padding: `${sz(2)}px ${sz(8)}px`,
                              borderRadius: 99,
                              background: theme.surface.base,
                              border: `1px solid ${theme.border.default}`,
                              color: theme.text.muted,
                              fontFamily: theme.font.mono,
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {ds.services.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: sz(8) }}>
                        {ds.services.map((svc) => (
                          <button
                            key={svc.uri}
                            onClick={() => navigate({ target: svc.identifier })}
                            style={{
                              fontSize: sz(12),
                              padding: `${sz(5)}px ${sz(12)}px`,
                              borderRadius: 6,
                              background: theme.surface.base,
                              border: `1px solid ${theme.border.default}`,
                              color: theme.text.primary,
                              cursor: "pointer",
                              fontFamily: theme.font.sans,
                            }}
                          >
                            {svc.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{
        fontSize: sz(12), fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.08em", color: theme.text.muted,
        marginBottom: 0, paddingBottom: sz(8), marginTop: sz(32),
        borderBottom: `1px solid ${theme.border.default}`,
      }}>
        Documents Submitted
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: sz(12), marginTop: sz(12) }}>
        {processedDocs.length === 0 && (
          <p style={{ color: theme.text.muted, fontSize: sz(13) }}>No processed documents.</p>
        )}
        {processedDocs.map((doc) => (
          <div
            key={doc.id}
            style={{
              padding: sz(16),
              borderRadius: 10,
              background: theme.surface.overlay,
              border: `1px solid ${theme.border.default}`,
            }}
          >
            <div style={{ fontSize: sz(15), fontWeight: 600, marginBottom: sz(4) }}>
              {doc.title}
            </div>
            {doc.comments && (
              <p style={{
                fontSize: sz(13), color: theme.text.muted,
                lineHeight: 1.5, marginBottom: sz(8),
              }}>
                {doc.comments.length > 200 ? doc.comments.substring(0, 200) + "…" : doc.comments}
              </p>
            )}
            {doc.tags.length > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: sz(6),
                marginBottom: sz(8),
              }}>
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: sz(11),
                      padding: `${sz(2)}px ${sz(8)}px`,
                      borderRadius: 99,
                      background: theme.surface.base,
                      border: `1px solid ${theme.border.default}`,
                      color: theme.text.muted,
                      fontFamily: theme.font.mono,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: sz(6),
            }}>
              {doc.submissions.map((sub) => (
                <span
                  key={`${sub.flow}:${sub.collection}`}
                  style={{
                    fontSize: sz(10),
                    padding: `${sz(2)}px ${sz(8)}px`,
                    borderRadius: 99,
                    background: `${theme.palette.amber}18`,
                    border: `1px solid ${theme.palette.amber}40`,
                    color: theme.palette.amber,
                    fontFamily: theme.font.mono,
                  }}
                >
                  {sub.flow} → {sub.collection}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
