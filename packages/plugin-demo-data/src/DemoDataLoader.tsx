import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@trustgraph/react-provider";
import { useWorkspaces } from "@trustgraph/react-state";
import { useTheme, Button, toast, PageGuidance, GuidanceSlot } from "@trustgraph/trustkit";
import type { BaseApi, BulkTriple } from "@trustgraph/react-provider";
import type { DatasetIndexEntry, Manifest, LogEntry, Phase } from "./types";
import { parseTurtleTriples, parseTurtleEntityContexts } from "./turtle-parser";
import { buildSdlPipeline } from "./sdl-pipeline";
import type { SdlDescriptor } from "./sdl-pipeline";
import { marked } from "marked";

const BASE_URL = "/demo-data";

async function fetchJson<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE_URL}/${path}`);
  if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
  return resp.json();
}

async function fetchText(path: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/${path}`);
  if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
  return resp.text();
}

function dirOf(manifestPath: string): string {
  const i = manifestPath.lastIndexOf("/");
  return i >= 0 ? manifestPath.substring(0, i) : "";
}

function resolvePath(baseDir: string, file: string): string {
  return baseDir ? `${baseDir}/${file}` : file;
}

function renderMarkdown(md: string, baseUrl?: string): string {
  const renderer = new marked.Renderer();
  const origLink = renderer.link;
  renderer.link = function (token) {
    const html = origLink.call(this, token);
    return html.replace("<a ", '<a target="_blank" rel="noopener" ');
  };
  const origImage = renderer.image;
  renderer.image = function (token) {
    if (baseUrl && token.href && !/^https?:\/\//.test(token.href) && !token.href.startsWith("/")) {
      token.href = `${baseUrl}/${token.href}`;
    }
    return origImage.call(this, token);
  };
  let html = marked(md, { renderer }) as string;
  if (baseUrl) {
    html = html.replace(/\bsrc="([^"]+)"/g, (match, src) => {
      if (/^https?:\/\//.test(src) || src.startsWith("/")) return match;
      return `src="${baseUrl}/${src}"`;
    });
  }
  return html;
}

type LogFn = (msg: string, status?: LogEntry["status"]) => void;
type SetPhases = (fn: (prev: Phase[]) => Phase[]) => void;

class PhaseTracker {
  private setPhases: SetPhases;
  constructor(setPhases: SetPhases) { this.setPhases = setPhases; }

  start(label: string) {
    this.setPhases((prev) => {
      const updated = prev.map((p) =>
        p.status === "active" ? { ...p, status: "done" as const } : p
      );
      return [...updated, { label, status: "active", details: [] }];
    });
  }

  log(message: string, status: LogEntry["status"] = "info") {
    this.setPhases((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...last, details: [...last.details, { message, status }] },
      ];
    });
  }

  done() {
    this.setPhases((prev) => prev.map((p) =>
      p.status === "active" ? { ...p, status: "done" as const } : p
    ));
  }

  error() {
    this.setPhases((prev) => prev.map((p) =>
      p.status === "active" ? { ...p, status: "error" as const } : p
    ));
  }
}

async function countAsyncIterable<T>(iter: AsyncIterable<T>): Promise<{ items: T[]; count: number }> {
  const items: T[] = [];
  for await (const item of iter) items.push(item);
  return { items, count: items.length };
}

async function runLoader(
  socket: BaseApi,
  manifest: Manifest,
  baseDir: string,
  tracker: PhaseTracker,
  onWorkspaceCreated?: () => void,
) {
  const previousWorkspace = socket.workspace;
  try {

  // 1. Create workspace
  tracker.start("Create workspace");
  try {
    await socket.iam().createWorkspace(
      manifest.workspace.id, manifest.workspace.name,
    );
    tracker.log("Workspace created", "success");
    onWorkspaceCreated?.();
  } catch (e: unknown) {
    tracker.log(`${e instanceof Error ? e.message : e} (may already exist)`, "warning");
  }

  socket.workspace = manifest.workspace.id;
  tracker.log(`Using workspace '${manifest.workspace.id}'`);

  // 2. Start flows
  const flows = manifest.flows ?? [];
  if (flows.length) {
    tracker.start("Start flows");
    for (const flow of flows) {
      try {
        await socket.flows().startFlow(
          flow.id, flow.blueprint, flow.description ?? flow.id,
        );
        tracker.log(`${flow.id} (${flow.blueprint})`, "success");
      } catch (e: unknown) {
        tracker.log(`${flow.id}: ${e instanceof Error ? e.message : e}`, "warning");
      }
    }
  }

  // 3. Upload ontology
  if (manifest.ontology?.length) {
    tracker.start("Upload ontology");
    for (const entry of manifest.ontology) {
      const value = await fetchText(resolvePath(baseDir, entry.file));
      await socket.config().putConfig([
        { type: "ontology", key: entry.key, value },
      ]);
      tracker.log(`ontology/${entry.key}`, "success");
    }
  }

  // 4. Load knowledge
  if (manifest.knowledge?.length) {
    tracker.start("Load knowledge graph");
    for (const doc of manifest.knowledge) {
      for (const file of doc.files) {
        const fileUrl = `${BASE_URL}/${resolvePath(baseDir, file)}`;

        const flow = doc.flow ?? "default";
        const metadata = {
          id: doc.document_id,
          metadata: [] as unknown[],
          collection: doc.collection,
        };

        tracker.log(`Streaming triples from ${file}...`);
        let tripleCount = 0;
        await socket.bulk().importTriples(
          flow, parseTurtleTriples(fileUrl), metadata, 100,
          (sent) => { tripleCount = sent; },
        );
        tracker.log(`${tripleCount} triples imported`, "success");

        tracker.log(`Streaming entity contexts from ${file}...`);
        let ctxCount = 0;
        await socket.bulk().importEntityContexts(
          flow, parseTurtleEntityContexts(fileUrl), metadata, 100,
          (sent) => { ctxCount = sent; },
        );
        tracker.log(`${ctxCount} entity contexts imported`, "success");
      }
    }
  }

  // 5. Load catalog
  if (manifest.catalog?.length) {
    tracker.start("Load catalog metadata");
    for (const doc of manifest.catalog) {
      for (const file of doc.files) {
        const fileUrl = `${BASE_URL}/${resolvePath(baseDir, file)}`;

        const flow = doc.flow ?? "default";
        const metadata = {
          id: doc.document_id,
          metadata: [] as unknown[],
          collection: doc.collection,
        };

        tracker.log(`Streaming triples from ${file}...`);
        let tripleCount = 0;
        await socket.bulk().importTriples(
          flow, parseTurtleTriples(fileUrl), metadata, 100,
          (sent) => { tripleCount = sent; },
        );
        tracker.log(`${tripleCount} triples imported`, "success");

        tracker.log(`Streaming entity contexts from ${file}...`);
        let ctxCount = 0;
        await socket.bulk().importEntityContexts(
          flow, parseTurtleEntityContexts(fileUrl), metadata, 100,
          (sent) => { ctxCount = sent; },
        );
        tracker.log(`${ctxCount} entity contexts imported`, "success");
      }
    }
  }

  // 6. Upload queries
  if (manifest.queries?.length) {
    tracker.start("Upload queries");
    let total = 0;
    for (const entry of manifest.queries) {
      const queries = await fetchJson<{ id: string; [k: string]: unknown }[]>(
        resolvePath(baseDir, entry.file),
      );
      for (const obj of queries) {
        const { id: _, ...rest } = obj;
        await socket.config().putConfig([
          { type: "query", key: obj.id, value: JSON.stringify(rest) },
        ]);
        total++;
      }
    }
    tracker.log(`${total} queries uploaded`, "success");
  }

  // 6. Upload tools
  if (manifest.tools?.length) {
    tracker.start("Upload tools");
    for (const entry of manifest.tools) {
      const value = await fetchText(resolvePath(baseDir, entry.file));
      await socket.config().putConfig([
        { type: "tool", key: entry.key, value },
      ]);
      tracker.log(`tool/${entry.key}`, "success");
    }
  }

  // 7. Upload prompts
  if (manifest.prompts?.length) {
    tracker.start("Upload prompts");
    for (const entry of manifest.prompts) {
      const value = await fetchText(resolvePath(baseDir, entry.file));
      await socket.config().putConfig([
        { type: "prompt", key: `template.${entry.key}`, value },
      ]);
      tracker.log(`prompt/${entry.key}`, "success");
    }

  }

  // 8. Upload schema
  if (manifest.schema?.length) {
    tracker.start("Upload schema");
    for (const entry of manifest.schema) {
      const value = await fetchText(resolvePath(baseDir, entry.file));
      await socket.config().putConfig([
        { type: "schema", key: entry.key, value },
      ]);
      tracker.log(`schema/${entry.key}`, "success");
    }
  }

  // 9. Load structured data
  if (manifest.structured_data?.length) {
    tracker.start("Load structured data");
    for (const entry of manifest.structured_data) {
      const flow = entry.flow ?? "structured";

      const descriptor = await fetchJson<SdlDescriptor>(
        resolvePath(baseDir, entry.descriptor),
      );

      tracker.log(`Fetching ${entry.file}...`);
      const csvText = await fetchText(resolvePath(baseDir, entry.file));
      tracker.log(`${(csvText.length / 1024 / 1024).toFixed(1)} MB fetched`);

      const batchSize = descriptor.output.options?.batch_size ?? 200;

      const pipeline = buildSdlPipeline(csvText, descriptor, "default",
        (msg) => tracker.log(msg, "warning"),
      );

      let rowCount = 0;
      await socket.bulk().importRows(flow, pipeline, batchSize,
        (sent) => {
          if (sent - rowCount >= 10000 || sent === rowCount) {
            tracker.log(`${sent.toLocaleString()} rows sent...`);
          }
          rowCount = sent;
        },
      );
      tracker.log(`${rowCount.toLocaleString()} rows imported`, "success");
    }
  }

  tracker.start("Complete");
  tracker.log("All data loaded successfully", "success");
  tracker.done();

  } finally {
    socket.workspace = previousWorkspace;
  }
}

function termToString(term: { t: string; i?: string; v?: string; ln?: string; dt?: string }): string {
  if (term.t === "i") return term.i ?? "";
  if (term.t === "l") return `"${term.v}"${term.ln ? `@${term.ln}` : term.dt ? `^^${term.dt}` : ""}`;
  return String((term as Record<string, unknown>).i ?? "");
}

function formatTriple(t: BulkTriple): string {
  const s = termToString(t.s as unknown as { t: string; i?: string });
  const p = termToString(t.p as unknown as { t: string; i?: string });
  const o = termToString(t.o as unknown as { t: string; i?: string; v?: string; ln?: string; dt?: string });
  return `    ${s}  ${p}  ${o}`;
}

// ── UI Components ──

function DatasetCard({
  entry,
  thumbnail,
  onSelect,
}: {
  entry: DatasetIndexEntry;
  thumbnail?: string;
  onSelect: () => void;
}) {
  const { theme, sz } = useTheme();
  const [hovered, setHovered] = useState(false);

  const thumbnailUrl = thumbnail
    ? `${BASE_URL}/${dirOf(entry.path)}/${thumbnail}`
    : null;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: "450 / 246",
        background: theme.surface.overlay,
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.2s, box-shadow 0.2s",
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.4)`
          : `0 2px 8px rgba(0,0,0,0.2)`,
      }}
    >
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={entry.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `${sz(14)}px ${sz(16)}px`,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
      }}>
        <div style={{
          fontSize: sz(15),
          fontWeight: 600,
          fontFamily: theme.font.sans,
          color: "#fff",
          marginBottom: 3,
        }}>
          {entry.name}
        </div>
        <div style={{
          fontSize: sz(12),
          fontFamily: theme.font.sans,
          color: "rgba(255,255,255,0.85)",
        }}>
          {entry.description ?? entry.id}
        </div>
      </div>
    </div>
  );
}

function ManifestSummary({ manifest }: { manifest: Manifest }) {
  const { theme, sz } = useTheme();
  const items: string[] = [];
  if (manifest.flows?.length) items.push(`${manifest.flows.length} flow(s)`);
  if (manifest.ontology?.length) items.push(`${manifest.ontology.length} ontology config(s)`);
  if (manifest.knowledge?.length) {
    const fileCount = manifest.knowledge.reduce((n, k) => n + k.files.length, 0);
    items.push(`${manifest.knowledge.length} document(s), ${fileCount} file(s)`);
  }
  if (manifest.catalog?.length) {
    const fileCount = manifest.catalog.reduce((n, k) => n + k.files.length, 0);
    items.push(`${manifest.catalog.length} catalog(s), ${fileCount} file(s)`);
  }
  if (manifest.queries?.length) items.push(`${manifest.queries.length} query file(s)`);
  if (manifest.tools?.length) items.push(`${manifest.tools.length} tool(s)`);
  if (manifest.prompts?.length) items.push(`${manifest.prompts.length} prompt(s)`);
  if (manifest.schema?.length) items.push(`${manifest.schema.length} schema(s)`);
  if (manifest.structured_data?.length) items.push(`${manifest.structured_data.length} structured data load(s)`);

  return (
    <div style={{
      fontSize: sz(11),
      fontFamily: theme.font.mono,
      color: theme.text.secondary,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      padding: "8px 0",
    }}>
      <div>Workspace: {manifest.workspace.id} ({manifest.workspace.name})</div>
      {items.map((item, i) => <div key={i}>{item}</div>)}
    </div>
  );
}

function PhaseIcon({ status }: { status: Phase["status"] }) {
  const { theme, sz } = useTheme();
  const size = sz(16);
  const common = { width: size, height: size, borderRadius: "50%", flexShrink: 0 } as const;

  if (status === "done") return (
    <div style={{ ...common, background: theme.palette.emerald, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#fff", fontSize: sz(10), lineHeight: 1 }}>&#10003;</span>
    </div>
  );
  if (status === "error") return (
    <div style={{ ...common, background: theme.palette.rose, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#fff", fontSize: sz(10), lineHeight: 1 }}>&#10005;</span>
    </div>
  );
  if (status === "active") return (
    <div style={{
      ...common,
      border: `2px solid ${theme.palette.blue}`,
      background: "transparent",
      animation: "pulse-ring 1.2s ease-in-out infinite",
    }} />
  );
  return (
    <div style={{ ...common, border: `2px solid ${theme.border.default}`, background: "transparent" }} />
  );
}

function ProgressOverlay({
  title,
  phases,
  loading,
  onClose,
}: {
  title: string;
  phases: Phase[];
  loading: boolean;
  onClose: () => void;
}) {
  const { theme, sz } = useTheme();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [phases]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const activeIdx = phases.findIndex((p) => p.status === "active");
      if (activeIdx >= 0) next.add(activeIdx);
      return next;
    });
  }, [phases]);

  const toggle = (i: number) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const colors: Record<LogEntry["status"], string> = {
    info: theme.text.secondary,
    success: theme.palette.emerald,
    error: theme.palette.rose,
    warning: theme.palette.amber,
  };

  const doneCount = phases.filter((p) => p.status === "done").length;
  const progress = phases.length > 0 ? doneCount / phases.length : 0;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <style>{`@keyframes pulse-ring { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      <div style={{
        background: theme.surface.overlay,
        border: `1px solid ${theme.border.default}`,
        borderRadius: 12,
        width: "min(600px, 90%)",
        maxHeight: "80%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          padding: `${sz(16)}px ${sz(20)}px`,
          borderBottom: `1px solid ${theme.border.default}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: sz(15),
              fontWeight: 600,
              fontFamily: theme.font.sans,
              color: theme.text.primary,
            }}>
              {title}
            </div>
            {loading && (
              <div style={{
                marginTop: 8,
                height: 3,
                borderRadius: 2,
                background: theme.border.default,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  borderRadius: 2,
                  background: theme.palette.blue,
                  width: `${Math.max(progress * 100, 5)}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
            )}
          </div>
          {!loading && (
            <Button size="sm" onClick={onClose}>Close</Button>
          )}
        </div>

        <div style={{
          flex: 1,
          overflow: "auto",
          padding: `${sz(12)}px ${sz(20)}px`,
        }}>
          {phases.map((phase, i) => (
            <div key={i} style={{ marginBottom: sz(8) }}>
              <div
                onClick={() => toggle(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: `${sz(6)}px 0`,
                }}>
                <PhaseIcon status={phase.status} />
                <div style={{
                  fontSize: sz(13),
                  fontWeight: 500,
                  fontFamily: theme.font.sans,
                  color: phase.status === "active" ? theme.text.primary : theme.text.secondary,
                  flex: 1,
                }}>
                  {phase.label}
                </div>
                {phase.details.length > 0 && (
                  <span style={{
                    fontSize: sz(10),
                    color: theme.text.hint,
                    fontFamily: theme.font.mono,
                  }}>
                    {expanded.has(i) ? "\u25B2" : "\u25BC"} {phase.details.length}
                  </span>
                )}
              </div>
              {expanded.has(i) && phase.details.length > 0 && (
                <div style={{
                  marginLeft: 26,
                  padding: `${sz(4)}px ${sz(10)}px`,
                  borderLeft: `2px solid ${theme.border.default}`,
                  fontFamily: theme.font.mono,
                  fontSize: sz(10),
                  lineHeight: 1.6,
                }}>
                  {phase.details.map((d, j) => (
                    <div key={j} style={{ color: colors[d.status] }}>{d.message}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export function DemoDataLoader() {
  const { theme, sz } = useTheme();
  const socket = useSocket();
  const { refetch: refetchWorkspaces } = useWorkspaces();

  const [index, setIndex] = useState<DatasetIndexEntry[] | null>(null);
  const [manifests, setManifests] = useState<Map<string, Manifest>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DatasetIndexEntry | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [detailHtml, setDetailHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [overlayTitle, setOverlayTitle] = useState("");

  useEffect(() => {
    fetchJson<DatasetIndexEntry[]>("index.json")
      .then(async (entries) => {
        setIndex(entries);
        const results = await Promise.all(
          entries.map(async (e) => {
            try {
              const m = await fetchJson<Manifest>(e.path);
              return [e.id, m] as const;
            } catch {
              return null;
            }
          }),
        );
        const map = new Map<string, Manifest>();
        for (const r of results) if (r) map.set(r[0], r[1]);
        setManifests(map);
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleSelect = useCallback(async (entry: DatasetIndexEntry) => {
    setSelected(entry);
    setPhases([]);
    setDetailHtml(null);
    const cached = manifests.get(entry.id);
    let m: Manifest;
    if (cached) {
      m = cached;
    } else {
      setManifest(null);
      try {
        m = await fetchJson<Manifest>(entry.path);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }
    }
    setManifest(m);
    if (m.detail) {
      try {
        const detailDir = dirOf(entry.path);
        const md = await fetchText(resolvePath(detailDir, m.detail));
        setDetailHtml(renderMarkdown(md, `${BASE_URL}/${detailDir}`));
      } catch {
        // detail file missing — not critical
      }
    }
  }, [manifests]);

  const handleLoad = useCallback(async () => {
    if (!manifest || !selected) return;
    setLoading(true);
    setPhases([]);
    setOverlayTitle(`Loading ${manifest.name}`);

    const baseDir = dirOf(selected.path);
    const tracker = new PhaseTracker(setPhases);

    try {
      await runLoader(socket, manifest, baseDir, tracker, () => refetchWorkspaces());
      toast.success(`Dataset '${manifest.name}' loaded successfully.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      tracker.log(`Error: ${msg}`, "error");
      tracker.error();
      toast.error(`Failed to load dataset: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [socket, manifest, selected]);

  const handleTestParse = useCallback(async () => {
    if (!manifest || !selected) return;
    setLoading(true);
    setPhases([]);
    setOverlayTitle(`Test Parse: ${manifest.name}`);

    const baseDir = dirOf(selected.path);
    const tracker = new PhaseTracker(setPhases);

    try {
      if (manifest.knowledge?.length) {
        for (const doc of manifest.knowledge) {
          tracker.start(`Parse ${doc.document_id}`);
          tracker.log(`Collection: ${doc.collection}, format: ${doc.format}`);
          for (const file of doc.files) {
            const fileUrl = `${BASE_URL}/${resolvePath(baseDir, file)}`;

            tracker.log(`Streaming ${file}...`);
            const { items: triples, count } = await countAsyncIterable(parseTurtleTriples(fileUrl));
            tracker.log(`${count} triples parsed`, "success");

            const show = count <= 10 ? triples : triples.slice(0, 5);
            for (const t of show) tracker.log(formatTriple(t));
            if (count > 10) tracker.log(`... and ${count - 5} more`);

            const { count: ctxCount } = await countAsyncIterable(parseTurtleEntityContexts(fileUrl));
            tracker.log(`${ctxCount} entity contexts parsed`, "success");
          }
        }
      }

      if (manifest.catalog?.length) {
        for (const doc of manifest.catalog) {
          tracker.start(`Parse catalog ${doc.document_id}`);
          tracker.log(`Collection: ${doc.collection}, format: ${doc.format}`);
          for (const file of doc.files) {
            const fileUrl = `${BASE_URL}/${resolvePath(baseDir, file)}`;

            tracker.log(`Streaming ${file}...`);
            const { items: triples, count } = await countAsyncIterable(parseTurtleTriples(fileUrl));
            tracker.log(`${count} triples parsed`, "success");

            const show = count <= 10 ? triples : triples.slice(0, 5);
            for (const t of show) tracker.log(formatTriple(t));
            if (count > 10) tracker.log(`... and ${count - 5} more`);

            const { count: ctxCount } = await countAsyncIterable(parseTurtleEntityContexts(fileUrl));
            tracker.log(`${ctxCount} entity contexts parsed`, "success");
          }
        }
      }

      if (manifest.structured_data?.length) {
        for (const entry of manifest.structured_data) {
          tracker.start(`Parse ${entry.file}`);
          const descriptor = await fetchJson<SdlDescriptor>(
            resolvePath(baseDir, entry.descriptor),
          );

          tracker.log(`Fetching ${entry.file}...`);
          const csvText = await fetchText(resolvePath(baseDir, entry.file));
          tracker.log(`${(csvText.length / 1024 / 1024).toFixed(1)} MB fetched`);

          tracker.log("Running SDL pipeline...");
          const pipeline = buildSdlPipeline(csvText, descriptor, "default",
            (msg) => tracker.log(msg, "warning"),
          );

          let rowCount = 0;
          const sample: Record<string, string>[] = [];
          for (const row of pipeline) {
            rowCount++;
            if (sample.length < 3) sample.push(row.values);
          }

          tracker.log(`${rowCount.toLocaleString()} rows processed (schema: ${descriptor.output.schema_name})`, "success");
          for (const row of sample) {
            const fields = Object.entries(row).slice(0, 6)
              .map(([k, v]) => `${k}=${v}`).join(", ");
            tracker.log(`${fields}${Object.keys(row).length > 6 ? ", ..." : ""}`);
          }
          if (rowCount > 3) tracker.log(`... and ${(rowCount - 3).toLocaleString()} more rows`);
        }
      }

      if (!manifest.knowledge?.length && !manifest.catalog?.length && !manifest.structured_data?.length) {
        tracker.start("Check manifest");
        tracker.log("No knowledge, catalog, or structured data entries found", "warning");
      }

      tracker.start("Complete");
      tracker.log("All data parsed successfully", "success");
      tracker.done();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      tracker.log(`Error: ${msg}`, "error");
      tracker.error();
      toast.error(`Parse failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [manifest, selected]);

  if (error) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "var(--page-height)",
        color: theme.palette.rose,
        fontFamily: theme.font.mono,
        fontSize: sz(13),
      }}>
        {error}
      </div>
    );
  }

  if (!index) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "var(--page-height)",
        color: theme.text.hint,
        fontFamily: theme.font.sans,
        fontSize: sz(13),
      }}>
        Loading datasets...
      </div>
    );
  }

  // Manifest detail view
  if (selected && manifest) {
    const showOverlay = loading || phases.length > 0;
    const heroUrl = manifest.thumbnail
      ? `${BASE_URL}/${dirOf(selected.path)}/${manifest.thumbnail}`
      : null;

    return (
      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "var(--page-height)", overflow: "auto" }}>
        {showOverlay && (
          <ProgressOverlay
            title={overlayTitle}
            phases={phases}
            loading={loading}
            onClose={() => setPhases([])}
          />
        )}
        {heroUrl && (
          <div style={{
            position: "relative",
            width: "100%",
            maxHeight: 280,
            overflow: "hidden",
            flexShrink: 0,
          }}>
            <img
              src={heroUrl}
              alt={manifest.name}
              style={{
                width: "100%",
                height: 280,
                objectFit: "cover",
                display: "block",
              }}
            />
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: `${sz(16)}px ${sz(32)}px`,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}>
              <div style={{
                fontSize: sz(20),
                fontWeight: 700,
                fontFamily: theme.font.sans,
                color: "#fff",
              }}>
                {manifest.name}
              </div>
            </div>
          </div>
        )}
        <div style={{
          maxWidth: 800,
          width: "100%",
          margin: "0 auto",
          padding: "24px 40px",
        }}>
          {!heroUrl && (
            <div style={{
              fontSize: sz(18),
              fontWeight: 700,
              fontFamily: theme.font.sans,
              color: theme.text.primary,
              marginBottom: 16,
            }}>
              {manifest.name}
            </div>
          )}
          <div style={{
            display: "flex",
            gap: 10,
            marginBottom: 24,
          }}>
            <Button size="sm" onClick={() => { setSelected(null); setManifest(null); }}>
              Back
            </Button>
            <Button size="sm" onClick={handleTestParse}>Test Parse</Button>
            <Button size="sm" onClick={handleLoad}>Load Dataset</Button>
          </div>
          {detailHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: `<style>.dd-detail p{margin:0.6em 0}.dd-detail img{max-width:100%;height:auto;border-radius:8px;margin:8px auto;display:block}.dd-detail a{color:inherit;text-decoration:underline}</style>${detailHtml}` }}
              className="dd-detail"
              style={{
                fontSize: sz(13),
                fontFamily: theme.font.sans,
                color: theme.text.secondary,
                lineHeight: 1.7,
                marginBottom: 24,
                maxWidth: "100%",
                overflow: "hidden",
              }}
            />
          ) : manifest.description ? (
            <div style={{
              fontSize: sz(13),
              fontFamily: theme.font.sans,
              color: theme.text.secondary,
              lineHeight: 1.6,
              marginBottom: 24,
            }}>
              {manifest.description}
            </div>
          ) : null}
          <ManifestSummary manifest={manifest} />
        </div>
      </div>
    );
  }

  // Dataset list
  return (
    <PageGuidance pageKey="demo-loader">
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
      <div style={{
        padding: "12px 28px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{
          fontSize: sz(14),
          fontWeight: 600,
          fontFamily: theme.font.sans,
          color: theme.text.primary,
        }}>
          Demo Datasets
        </div>
        <GuidanceSlot id="welcome" buttonOffset={{ top: "-0.75em", left: "0.5em" }} />
      </div>
      <div style={{
        padding: "24px 40px",
        overflow: "auto",
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
        gap: 20,
        alignContent: "start",
      }}>
        {index.map((entry) => (
          <DatasetCard
            key={entry.id}
            entry={entry}
            thumbnail={manifests.get(entry.id)?.thumbnail}
            onSelect={() => handleSelect(entry)}
          />
        ))}
      </div>
    </div>
    </PageGuidance>
  );
}
