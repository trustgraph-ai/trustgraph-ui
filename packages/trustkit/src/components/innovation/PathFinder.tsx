import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { IINode } from "../../hooks/useInnovationData";
import { text, border, palette } from "../../theme";

interface PathFinderProps {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  adjacency: Map<string, { target: string; label: string }[]>;
  onSelectNode: (uri: string) => void;
}

interface PathStep {
  uri: string;
  edgeLabel: string;
}

type FoundPath = PathStep[];

const MAX_DEPTH = 5;
const MAX_PATHS = 8;

const NOISY_EDGES = new Set([
  "located in", "location of",
  "within nation", "contains area",
  "scoped to", "scope of",
  "member nation", "member of",
  "operates in sector", "sector contains",
]);

function findPaths(
  adj: Map<string, { target: string; label: string }[]>,
  start: string,
  end: string,
): FoundPath[] {
  const results: FoundPath[] = [];
  const visited = new Set<string>();

  function dfs(current: string, path: PathStep[], depth: number) {
    if (results.length >= MAX_PATHS) return;
    if (depth > MAX_DEPTH) return;
    if (current === end) {
      results.push([...path]);
      return;
    }

    visited.add(current);
    const edges = adj.get(current) || [];
    for (const edge of edges) {
      if (visited.has(edge.target)) continue;
      path.push({ uri: edge.target, edgeLabel: edge.label });
      dfs(edge.target, path, depth + 1);
      path.pop();
      if (results.length >= MAX_PATHS) break;
    }
    visited.delete(current);
  }

  dfs(start, [{ uri: start, edgeLabel: "" }], 0);
  return results;
}

function EntityPicker({
  nodes,
  abbreviations,
  value,
  onChange,
  placeholder,
}: {
  nodes: Map<string, IINode>;
  abbreviations: Map<string, string>;
  value: string | null;
  onChange: (uri: string | null) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const matches = useMemo(() => {
    if (!search) return [];
    const term = search.toLowerCase();
    const result: IINode[] = [];
    for (const node of nodes.values()) {
      if (result.length >= 20) break;
      const abbr = abbreviations.get(node.uri)?.toLowerCase() || "";
      if (node.label.toLowerCase().includes(term) || abbr.includes(term)) {
        result.push(node);
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [search, nodes, abbreviations]);

  const selected = value ? nodes.get(value) : null;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      {selected && !open ? (
        <div
          onClick={() => { setOpen(true); setSearch(""); }}
          style={{
            padding: "8px 12px", borderRadius: 6, fontSize: 13,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${border.medium}`,
            color: text.primary, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span>{selected.label}</span>
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); setSearch(""); }}
            style={{ color: text.faint, cursor: "pointer", fontSize: 11, marginLeft: 8 }}
          >✕</span>
        </div>
      ) : (
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={open}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: 13,
            background: "rgba(255,255,255,0.04)", border: `1px solid ${border.default}`,
            color: text.primary, outline: "none",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        />
      )}
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          marginTop: 4, borderRadius: 6, overflow: "hidden",
          background: "#15151F", border: `1px solid ${border.medium}`,
          maxHeight: 240, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {matches.map(node => (
            <div
              key={node.uri}
              onClick={() => { onChange(node.uri); setOpen(false); setSearch(""); }}
              style={{
                padding: "6px 12px", cursor: "pointer", fontSize: 12,
                color: text.secondary, borderBottom: `1px solid ${border.subtle}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: text.primary }}>{node.label}</span>
              <span style={{ color: text.faint, fontSize: 10, marginLeft: 8 }}>
                {node.kind.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EDGE_COLORS: Record<string, string> = {
  "delivers capability in": palette.emerald,
  "seeks capability in": palette.rose,
  "sub-organisation of": palette.blue,
  "parent of": palette.blue,
  "member of": palette.cyan,
  "partner": palette.pink,
  "operates framework": palette.purple,
  "listed on framework": palette.purple,
  "provides access to": palette.cyan,
  "holds role at": palette.amber,
  "has expertise in": palette.emerald,
  "sub-domain of": palette.emerald,
  "located in": "#67E8F9",
  "funded by": palette.pink,
  "operates in sector": palette.orange,
  "targets segment": palette.rose,
  "belongs to segment": palette.rose,
  "member nation": palette.cyan,
  "within nation": "#67E8F9",
  "scoped to": palette.cyan,
};

function edgeColor(label: string): string {
  return EDGE_COLORS[label] || text.faint;
}

export function PathFinder({ nodes, abbreviations, adjacency, onSelectNode }: PathFinderProps) {
  const [startUri, setStartUri] = useState<string | null>(null);
  const [endUri, setEndUri] = useState<string | null>(null);
  const [paths, setPaths] = useState<FoundPath[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allEdgeLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const edges of adjacency.values()) {
      for (const e of edges) labels.add(e.label);
    }
    return [...labels].sort();
  }, [adjacency]);

  const [disabledEdges, setDisabledEdges] = useState<Set<string>>(() => new Set(NOISY_EDGES));

  const filteredAdj = useMemo(() => {
    if (disabledEdges.size === 0) return adjacency;
    const adj = new Map<string, { target: string; label: string }[]>();
    for (const [uri, edges] of adjacency) {
      const filtered = edges.filter(e => !disabledEdges.has(e.label));
      if (filtered.length > 0) adj.set(uri, filtered);
    }
    return adj;
  }, [adjacency, disabledEdges]);

  const toggleEdge = useCallback((label: string) => {
    setDisabledEdges(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const handleFind = useCallback(() => {
    if (!startUri || !endUri) return;
    setSearching(true);
    setTimeout(() => {
      const found = findPaths(filteredAdj, startUri, endUri);
      setPaths(found);
      setSearching(false);
    }, 10);
  }, [startUri, endUri, filteredAdj]);

  const nodeLabel = useCallback((uri: string): string => {
    const n = nodes.get(uri);
    if (!n) return uri.split("/").pop() || uri;
    return n.label;
  }, [nodes]);

  const nodeKindColor = useCallback((uri: string): string => {
    const n = nodes.get(uri);
    if (!n) return text.muted;
    const KIND_COLORS: Record<string, string> = {
      GovernmentDepartment: palette.blue, MilitaryCommand: "#5B8DEF",
      Agency: palette.cyan, InnovationHub: palette.emerald,
      PrimeContractor: palette.orange, SME: palette.amber,
      Startup: "#FCD34D", Investor: palette.pink,
      Accelerator: palette.emerald, ResearchOrganisation: palette.purple,
      University: "#C4B5FD", Person: palette.amber,
      CapabilityDomain: palette.emerald, Framework: palette.purple,
      InnovationChallenge: "#C4B5FD", CustomerSegment: palette.rose,
      Nation: palette.cyan, Region: "#67E8F9",
      IndustrySector: palette.orange,
    };
    return KIND_COLORS[n.kind] || text.muted;
  }, [nodes]);

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: text.primary, marginBottom: 6,
          }}>
            Pathway Finder
          </div>
          <div style={{ fontSize: 12, color: text.faint, lineHeight: 1.5 }}>
            Find connection paths between any two entities in the ecosystem.
            Discover how organisations, capabilities, procurement routes, and people are linked.
          </div>
        </div>

        {/* Selectors */}
        <div style={{
          display: "flex", gap: 12, alignItems: "center", marginBottom: 20,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 9, color: palette.emerald, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
            }}>From</div>
            <EntityPicker
              nodes={nodes}
              abbreviations={abbreviations}
              value={startUri}
              onChange={setStartUri}
              placeholder="Search start entity..."
            />
          </div>
          <div style={{ color: text.faint, fontSize: 18, paddingTop: 16 }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 9, color: palette.rose, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
            }}>To</div>
            <EntityPicker
              nodes={nodes}
              abbreviations={abbreviations}
              value={endUri}
              onChange={setEndUri}
              placeholder="Search destination entity..."
            />
          </div>
          <div style={{ paddingTop: 16 }}>
            <button
              onClick={handleFind}
              disabled={!startUri || !endUri || startUri === endUri || searching}
              style={{
                padding: "8px 20px", borderRadius: 6,
                background: startUri && endUri && startUri !== endUri
                  ? `${palette.emerald}22` : "rgba(255,255,255,0.04)",
                color: startUri && endUri && startUri !== endUri
                  ? palette.emerald : text.faint,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace",
                transition: "all 0.15s",
                border: `1px solid ${startUri && endUri ? palette.emerald + "44" : border.default}`,
              }}
            >
              {searching ? "Searching..." : "Find Paths"}
            </button>
          </div>
        </div>

        {/* Edge type filters */}
        {allEdgeLabels.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                cursor: "pointer", userSelect: "none",
                fontSize: 10, color: text.faint,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              <span style={{
                display: "inline-block", transition: "transform 0.15s",
                transform: filtersOpen ? "rotate(90deg)" : "rotate(0deg)",
                fontSize: 8,
              }}>▶</span>
              Relationship filters
              {disabledEdges.size > 0 && (
                <span style={{
                  fontSize: 9, color: palette.amber,
                  background: `${palette.amber}15`, padding: "1px 6px",
                  borderRadius: 3,
                }}>
                  {disabledEdges.size} excluded
                </span>
              )}
            </div>
            {filtersOpen && (
              <div style={{
                marginTop: 8, padding: 12, borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${border.subtle}`,
              }}>
                <div style={{
                  display: "flex", gap: 8, marginBottom: 10,
                  fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  <span
                    onClick={() => setDisabledEdges(new Set())}
                    style={{ color: palette.emerald, cursor: "pointer" }}
                  >Enable all</span>
                  <span style={{ color: border.medium }}>|</span>
                  <span
                    onClick={() => setDisabledEdges(new Set(NOISY_EDGES))}
                    style={{ color: text.faint, cursor: "pointer" }}
                  >Reset defaults</span>
                </div>
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 6,
                }}>
                  {allEdgeLabels.map(label => {
                    const disabled = disabledEdges.has(label);
                    const color = edgeColor(label);
                    return (
                      <div
                        key={label}
                        onClick={() => toggleEdge(label)}
                        style={{
                          padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                          background: disabled ? "rgba(255,255,255,0.02)" : `${color}15`,
                          border: `1px solid ${disabled ? border.subtle : color + "44"}`,
                          color: disabled ? text.hint : color,
                          opacity: disabled ? 0.5 : 1,
                          transition: "all 0.12s",
                          textDecoration: disabled ? "line-through" : "none",
                        }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {paths !== null && (
          <div>
            {paths.length === 0 ? (
              <div style={{
                padding: 32, textAlign: "center", borderRadius: 8,
                background: "rgba(255,255,255,0.02)", border: `1px solid ${border.subtle}`,
              }}>
                <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>∅</div>
                <div style={{ color: text.faint, fontSize: 13 }}>
                  No paths found within {MAX_DEPTH} steps
                </div>
                <div style={{ color: text.hint, fontSize: 11, marginTop: 4 }}>
                  These entities may not be connected in the current dataset
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: 10, color: text.faint, marginBottom: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {paths.length} path{paths.length !== 1 ? "s" : ""} found
                  {paths.length >= MAX_PATHS && " (showing first " + MAX_PATHS + ")"}
                </div>

                {paths.map((path, pi) => (
                  <div
                    key={pi}
                    style={{
                      marginBottom: 12, padding: 16, borderRadius: 8,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${border.subtle}`,
                    }}
                  >
                    <div style={{
                      fontSize: 9, color: text.hint, marginBottom: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      PATH {pi + 1} — {path.length - 1} step{path.length - 1 !== 1 ? "s" : ""}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                      {path.map((step, si) => {
                        const color = nodeKindColor(step.uri);
                        const kind = nodes.get(step.uri)?.kind || "";
                        return (
                          <div key={si} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {si > 0 && (
                              <div style={{
                                display: "flex", alignItems: "center", gap: 2,
                                margin: "0 2px",
                              }}>
                                <div style={{
                                  width: 16, height: 1,
                                  background: edgeColor(step.edgeLabel),
                                }} />
                                <div style={{
                                  fontSize: 8, color: edgeColor(step.edgeLabel),
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  whiteSpace: "nowrap", padding: "1px 4px",
                                  borderRadius: 3, background: `${edgeColor(step.edgeLabel)}11`,
                                }}>
                                  {step.edgeLabel}
                                </div>
                                <div style={{
                                  width: 0, height: 0,
                                  borderTop: "4px solid transparent",
                                  borderBottom: "4px solid transparent",
                                  borderLeft: `6px solid ${edgeColor(step.edgeLabel)}`,
                                }} />
                              </div>
                            )}
                            <div
                              onClick={() => onSelectNode(step.uri)}
                              style={{
                                padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                                background: `${color}11`, border: `1px solid ${color}33`,
                                transition: "all 0.12s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = `${color}22`)}
                              onMouseLeave={e => (e.currentTarget.style.background = `${color}11`)}
                            >
                              <div style={{ fontSize: 11, color, fontWeight: 500 }}>
                                {nodeLabel(step.uri)}
                              </div>
                              <div style={{
                                fontSize: 8, color: text.hint,
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}>
                                {kind.replace(/([A-Z])/g, " $1").trim()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {paths === null && startUri && endUri && (
          <div style={{
            padding: 32, textAlign: "center", color: text.hint, fontSize: 12,
          }}>
            Click "Find Paths" to discover connections
          </div>
        )}
      </div>
    </div>
  );
}
