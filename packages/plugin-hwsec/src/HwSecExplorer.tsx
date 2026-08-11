import { useState, useMemo, useCallback } from "react";
import { useTheme, LoadingState } from "@trustgraph/trustkit";
import type { Theme } from "@trustgraph/trustkit";
import { useHwSecData } from "./useHwSecData";
import type { HwNode } from "./useHwSecData";

export interface HwSecExplorerProps {}

const HW_ENTITY_TYPES: readonly string[] = ["System", "Subsystem", "Component", "SubComponent", "Element", "HardwareEntity"];

const TYPE_TIER: Record<string, number> = {
  System: 0, Subsystem: 1, Component: 2, SubComponent: 3, Element: 4, HardwareEntity: 5,
};

function buildKindColors(p: Theme["palette"]): Record<string, string> {
  return {
    System: p.blue,
    Subsystem: p.purple,
    Component: p.emerald,
    SubComponent: p.cyan,
    Element: p.amber,
    HardwareEntity: "#888",
    Interface: p.cyan,
    NetworkInterface: p.cyan,
    PhysicalInterface: p.orange,
    LogicalInterface: p.purple,
    Firmware: p.blue,
    Vulnerability: p.rose,
    AttackSurface: p.orange,
    Countermeasure: p.emerald,
    SideChannel: p.purple,
    ThreatModel: p.amber,
    SecurityProperty: p.rose,
    TrustBoundary: p.pink,
  };
}

const KIND_ICONS: Record<string, string> = {
  System: "◆",
  Subsystem: "◇",
  Component: "◈",
  SubComponent: "▪",
  Element: "·",
  HardwareEntity: "○",
  Interface: "⊘",
  NetworkInterface: "◎",
  PhysicalInterface: "⊡",
  LogicalInterface: "⊞",
  Firmware: "▧",
  Vulnerability: "▲",
  AttackSurface: "⬡",
  Countermeasure: "◉",
  SideChannel: "≋",
  ThreatModel: "⚠",
  SecurityProperty: "◐",
};

function trustColor(p: Theme["palette"], level: number): string {
  if (level >= 5) return p.emerald;
  if (level >= 4) return p.cyan;
  if (level >= 3) return p.blue;
  if (level >= 2) return p.amber;
  if (level >= 1) return p.orange;
  return p.rose;
}

function securityKindLabel(kind: string): string {
  switch (kind) {
    case "Vulnerability": return "Vulnerabilities";
    case "AttackSurface": return "Attack Surfaces";
    case "Countermeasure": return "Countermeasures";
    case "SideChannel": return "Side Channels";
    case "ThreatModel": return "Threat Models";
    case "SecurityProperty": return "Security Properties";
    default: return kind;
  }
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const { sz } = useTheme();
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: sz(8), color, fontFamily: theme.font.mono,
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: 8, paddingBottom: 4,
        borderBottom: `1px solid ${color}22`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function HwSecExplorer(_props: HwSecExplorerProps) {
  const { theme, sz } = useTheme();
  const data = useHwSecData();
  const KIND_COLORS = useMemo(() => buildKindColors(theme.palette), [theme.palette]);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const relationshipScore = useCallback((uri: string): number => {
    return (data.children.get(uri)?.length || 0)
      + (data.entitySecurity.get(uri)?.length || 0)
      + (data.entityInterfaces.get(uri)?.length || 0)
      + (data.entityFirmware.get(uri)?.length || 0)
      + (data.entityInteractions.get(uri)?.length || 0);
  }, [data.children, data.entitySecurity, data.entityInterfaces, data.entityFirmware, data.entityInteractions]);

  const { treeChildren, treeParentOf, treeRoots } = useMemo(() => {
    const treeChildren = new Map<string, string[]>();
    const treeParentOf = new Map<string, string>();

    const addChild = (childUri: string, parentUri: string) => {
      if (treeParentOf.has(childUri)) return;
      if (childUri === parentUri) return;
      treeParentOf.set(childUri, parentUri);
      const kids = treeChildren.get(parentUri) || [];
      kids.push(childUri);
      treeChildren.set(parentUri, kids);
    };

    // Step 1: Copy explicit physicallyContains
    for (const [parent, kids] of data.children) {
      for (const kid of kids) addChild(kid, parent);
    }

    // Step 2: Collect hw entities by type
    const allHw: HwNode[] = [];
    for (const node of data.nodes.values()) {
      if (HW_ENTITY_TYPES.includes(node.kind)) allHw.push(node);
    }

    const byKind = (kind: string) => allHw.filter(n => n.kind === kind);
    const systems = byKind("System");

    // Step 3: Find primary system (most relationships)
    const ranked = [...systems].sort((a, b) => relationshipScore(b.uri) - relationshipScore(a.uri));
    const primary = ranked[0]?.uri;

    if (primary) {
      // Step 4: Nest unparented Subsystems under primary System
      for (const sub of byKind("Subsystem")) addChild(sub.uri, primary);

      // Step 5: Nest unparented Components under primary System
      for (const comp of byKind("Component")) addChild(comp.uri, primary);

      // Step 6: Nest unparented Elements under the richest Component (likely the SoC)
      const components = byKind("Component");
      const rankedComps = [...components].sort((a, b) => relationshipScore(b.uri) - relationshipScore(a.uri));
      const bestComponent = rankedComps[0]?.uri;

      for (const elem of byKind("Element")) {
        if (treeParentOf.has(elem.uri)) continue;
        // Try interactsWith to find a Component parent
        const interactions = data.entityInteractions.get(elem.uri) || [];
        const compParent = interactions.find(uri => data.nodes.get(uri)?.kind === "Component");
        addChild(elem.uri, compParent || bestComponent || primary);
      }

      // Step 7: Nest unparented generic HardwareEntity under primary if they have relationships
      for (const hw of byKind("HardwareEntity")) {
        if (treeParentOf.has(hw.uri)) continue;
        if (relationshipScore(hw.uri) > 0) addChild(hw.uri, primary);
      }
    }

    // Sort children: by type tier, then alphabetically
    for (const [, kids] of treeChildren) {
      kids.sort((a, b) => {
        const na = data.nodes.get(a);
        const nb = data.nodes.get(b);
        if (!na || !nb) return 0;
        const tierA = TYPE_TIER[na.kind] ?? 99;
        const tierB = TYPE_TIER[nb.kind] ?? 99;
        if (tierA !== tierB) return tierA - tierB;
        return na.label.localeCompare(nb.label);
      });
    }

    // Build roots: entities with no inferred parent
    const treeRoots = allHw
      .filter(e => !treeParentOf.has(e.uri))
      .sort((a, b) => {
        if (a.uri === primary) return -1;
        if (b.uri === primary) return 1;
        const sa = relationshipScore(a.uri);
        const sb = relationshipScore(b.uri);
        if (sa !== sb) return sb - sa;
        return a.label.localeCompare(b.label);
      });

    return { treeChildren, treeParentOf, treeRoots };
  }, [data.nodes, data.children, data.entityInteractions, relationshipScore]);

  const matchesSearch = useCallback((node: HwNode): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (node.label.toLowerCase().includes(term)) return true;
    const descs = data.descriptions.get(node.uri);
    if (descs?.some(d => d.toLowerCase().includes(term))) return true;
    return false;
  }, [searchTerm, data.descriptions]);

  const hasVisibleDescendant = useCallback((uri: string): boolean => {
    const node = data.nodes.get(uri);
    if (node && matchesSearch(node)) return true;
    const kids = treeChildren.get(uri) || [];
    return kids.some(k => hasVisibleDescendant(k));
  }, [data.nodes, treeChildren, matchesSearch]);

  const toggleNode = useCallback((uri: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  }, []);

  const expandToNode = useCallback((uri: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      let current = treeParentOf.get(uri);
      while (current) {
        next.add(current);
        current = treeParentOf.get(current);
      }
      return next;
    });
  }, [treeParentOf]);

  const selected = selectedUri ? data.nodes.get(selectedUri) : null;

  const securityCount = useCallback((uri: string) => {
    return data.entitySecurity.get(uri)?.length || 0;
  }, [data.entitySecurity]);

  const interfaceCount = useCallback((uri: string) => {
    return data.entityInterfaces.get(uri)?.length || 0;
  }, [data.entityInterfaces]);

  const hwEntities = useMemo(() => {
    const result: HwNode[] = [];
    for (const node of data.nodes.values()) {
      if (HW_ENTITY_TYPES.includes(node.kind)) result.push(node);
    }
    return result;
  }, [data.nodes]);

  // Auto-expand primary system on first load
  useMemo(() => {
    if (treeRoots.length > 0 && expandedNodes.size === 0) {
      const primary = treeRoots[0];
      if (primary && (treeChildren.get(primary.uri)?.length || 0) > 0) {
        setExpandedNodes(new Set([primary.uri]));
      }
    }
  }, [treeRoots.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data.isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <LoadingState message="Loading hardware security data..." />
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: theme.palette.rose }}>
        <div style={{ fontSize: sz(14), marginBottom: 8 }}>Failed to load data</div>
        <div style={{ fontSize: sz(11), color: theme.text.muted }}>{data.error.message}</div>
      </div>
    );
  }

  function renderTreeNode(node: HwNode, depth: number) {
    if (!hasVisibleDescendant(node.uri) && !matchesSearch(node)) return null;

    const kids = treeChildren.get(node.uri) || [];
    const hasChildren = kids.length > 0;
    const isExpanded = expandedNodes.has(node.uri);
    const isSelected = selectedUri === node.uri;
    const color = KIND_COLORS[node.kind] || theme.text.muted;
    const sc = securityCount(node.uri);
    const ic = interfaceCount(node.uri);
    const trust = data.trustLevels.get(node.uri);
    const isInferred = treeParentOf.has(node.uri) && !data.parentOf.has(node.uri);

    return (
      <div key={node.uri}>
        <div
          onClick={() => setSelectedUri(node.uri)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 8px", paddingLeft: 12 + depth * 16,
            cursor: "pointer",
            background: isSelected ? color + "12" : "transparent",
            borderLeft: isSelected ? `2px solid ${color}` : "2px solid transparent",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
          }}
          onMouseLeave={e => {
            if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          {hasChildren ? (
            <span
              onClick={e => { e.stopPropagation(); toggleNode(node.uri); }}
              style={{
                fontSize: sz(8), color: theme.text.faint, cursor: "pointer",
                width: 10, textAlign: "center", userSelect: "none",
              }}
            >
              {isExpanded ? "▼" : "▶"}
            </span>
          ) : (
            <span style={{ width: 10 }} />
          )}

          <span style={{ fontSize: sz(10), color, opacity: 0.7 }}>
            {KIND_ICONS[node.kind] || "●"}
          </span>

          <span style={{
            fontSize: sz(11), color: isSelected ? color : theme.text.primary,
            fontWeight: isSelected ? 600 : 400,
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {node.label}
          </span>

          {isInferred && (
            <span style={{
              fontSize: sz(6), padding: "1px 3px", borderRadius: 3,
              background: "rgba(255,255,255,0.06)",
              color: theme.text.hint,
              fontFamily: theme.font.mono,
            }}>
              ~
            </span>
          )}

          {trust !== undefined && (
            <span style={{
              fontSize: sz(7), padding: "1px 4px", borderRadius: 4,
              background: trustColor(theme.palette, trust) + "18",
              color: trustColor(theme.palette, trust),
              fontFamily: theme.font.mono,
            }}>
              T{trust}
            </span>
          )}

          {sc > 0 && (
            <span style={{
              fontSize: sz(7), padding: "1px 4px", borderRadius: 4,
              background: theme.palette.rose + "18",
              color: theme.palette.rose,
              fontFamily: theme.font.mono,
            }}>
              {sc}
            </span>
          )}

          {ic > 0 && (
            <span style={{
              fontSize: sz(7), padding: "1px 4px", borderRadius: 4,
              background: theme.palette.cyan + "18",
              color: theme.palette.cyan,
              fontFamily: theme.font.mono,
            }}>
              {ic}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {kids.map(childUri => {
              const child = data.nodes.get(childUri);
              if (!child) return null;
              return renderTreeNode(child, depth + 1);
            })}
          </div>
        )}
      </div>
    );
  }

  function renderDetailPanel() {
    if (!selected) {
      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", color: theme.text.hint, fontSize: sz(12),
          fontFamily: theme.font.mono,
        }}>
          Select an entity to view details
        </div>
      );
    }

    const color = KIND_COLORS[selected.kind] || theme.text.muted;
    const trust = data.trustLevels.get(selected.uri);
    const descs = data.descriptions.get(selected.uri) || [];
    const ifaces = data.entityInterfaces.get(selected.uri) || [];
    const fws = data.entityFirmware.get(selected.uri) || [];
    const secs = data.entitySecurity.get(selected.uri) || [];
    const interactions = data.entityInteractions.get(selected.uri) || [];
    const childUris = treeChildren.get(selected.uri) || [];
    const parentUri = treeParentOf.get(selected.uri);

    const secByKind = new Map<string, HwNode[]>();
    for (const uri of secs) {
      const node = data.nodes.get(uri);
      if (!node) continue;
      const list = secByKind.get(node.kind) || [];
      list.push(node);
      secByKind.set(node.kind, list);
    }

    const navigateTo = (uri: string) => {
      setSelectedUri(uri);
      expandToNode(uri);
    };

    return (
      <div style={{ padding: 16, overflowY: "auto", height: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
          }}>
            <span style={{
              fontSize: sz(8), padding: "2px 6px", borderRadius: 4,
              background: color + "18", color, border: `1px solid ${color}33`,
              fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {selected.kind}
            </span>
            {trust !== undefined && (
              <span style={{
                fontSize: sz(8), padding: "2px 6px", borderRadius: 4,
                background: trustColor(theme.palette, trust) + "18",
                color: trustColor(theme.palette, trust),
                border: `1px solid ${trustColor(theme.palette, trust)}33`,
                fontFamily: theme.font.mono,
              }}>
                Trust Level {trust}
              </span>
            )}
          </div>
          <div style={{
            fontSize: sz(16), fontWeight: 700, color,
            lineHeight: 1.3,
          }}>
            {selected.label}
          </div>
        </div>

        {/* Descriptions */}
        {descs.length > 0 && (
          <Section title="Description" color={color}>
            {descs.map((d, i) => (
              <div key={i} style={{
                fontSize: sz(11), color: theme.text.secondary, lineHeight: 1.5,
                marginBottom: 4,
              }}>
                {d}
              </div>
            ))}
          </Section>
        )}

        {/* Parent */}
        {parentUri && (() => {
          const parent = data.nodes.get(parentUri);
          if (!parent) return null;
          const pc = KIND_COLORS[parent.kind] || theme.text.muted;
          const isInferred = !data.parentOf.has(selected.uri);
          return (
            <Section title={isInferred ? "Contained By (inferred)" : "Contained By"} color={theme.palette.blue}>
              <div
                onClick={() => navigateTo(parentUri)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${theme.border.subtle}`,
                }}
              >
                <span style={{ fontSize: sz(9), color: pc }}>
                  {KIND_ICONS[parent.kind] || "●"}
                </span>
                <span style={{ fontSize: sz(11), color: pc }}>
                  {parent.label}
                </span>
                <span style={{
                  fontSize: sz(8), color: theme.text.hint,
                  fontFamily: theme.font.mono,
                }}>
                  {parent.kind}
                </span>
              </div>
            </Section>
          );
        })()}

        {/* Children */}
        {childUris.length > 0 && (
          <Section title={`Contains (${childUris.length})`} color={theme.palette.emerald}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {childUris.map(uri => {
                const child = data.nodes.get(uri);
                if (!child) return null;
                const cc = KIND_COLORS[child.kind] || theme.text.muted;
                return (
                  <div
                    key={uri}
                    onClick={() => navigateTo(uri)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: sz(9), color: cc }}>
                      {KIND_ICONS[child.kind] || "●"}
                    </span>
                    <span style={{ fontSize: sz(11), color: theme.text.primary }}>
                      {child.label}
                    </span>
                    <span style={{
                      fontSize: sz(8), color: theme.text.hint,
                      fontFamily: theme.font.mono,
                    }}>
                      {child.kind}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Interfaces */}
        {ifaces.length > 0 && (
          <Section title={`Interfaces (${ifaces.length})`} color={theme.palette.cyan}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {ifaces.map(uri => {
                const iface = data.nodes.get(uri);
                if (!iface) return null;
                const proto = data.protocols.get(uri);
                const ic = KIND_COLORS[iface.kind] || theme.palette.cyan;
                return (
                  <div key={uri} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px", borderRadius: 4,
                  }}>
                    <span style={{ fontSize: sz(9), color: ic }}>
                      {KIND_ICONS[iface.kind] || "⊘"}
                    </span>
                    <span style={{ fontSize: sz(11), color: theme.text.primary }}>
                      {iface.label}
                    </span>
                    {proto && (
                      <span style={{
                        fontSize: sz(8), padding: "1px 5px", borderRadius: 4,
                        background: ic + "18", color: ic, border: `1px solid ${ic}33`,
                        fontFamily: theme.font.mono,
                      }}>
                        {proto}
                      </span>
                    )}
                    <span style={{
                      fontSize: sz(8), color: theme.text.hint,
                      fontFamily: theme.font.mono,
                    }}>
                      {iface.kind.replace("Interface", "").toLowerCase() || "generic"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Firmware */}
        {fws.length > 0 && (
          <Section title={`Firmware (${fws.length})`} color={theme.palette.blue}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {fws.map(uri => {
                const fw = data.nodes.get(uri);
                if (!fw) return null;
                const ver = data.fwVersions.get(uri);
                const signed = data.fwSignatures.get(uri);
                return (
                  <div key={uri} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px", borderRadius: 4,
                  }}>
                    <span style={{ fontSize: sz(9), color: theme.palette.blue }}>▧</span>
                    <span style={{ fontSize: sz(11), color: theme.text.primary }}>
                      {fw.label}
                    </span>
                    {ver && (
                      <span style={{
                        fontSize: sz(8), padding: "1px 5px", borderRadius: 4,
                        background: theme.palette.blue + "18", color: theme.palette.blue,
                        border: `1px solid ${theme.palette.blue}33`,
                        fontFamily: theme.font.mono,
                      }}>
                        v{ver}
                      </span>
                    )}
                    {signed !== undefined && (
                      <span style={{
                        fontSize: sz(8), padding: "1px 5px", borderRadius: 4,
                        background: (signed ? theme.palette.emerald : theme.palette.rose) + "18",
                        color: signed ? theme.palette.emerald : theme.palette.rose,
                        border: `1px solid ${(signed ? theme.palette.emerald : theme.palette.rose)}33`,
                        fontFamily: theme.font.mono,
                      }}>
                        {signed ? "signed" : "unsigned"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Security Annotations */}
        {secs.length > 0 && (
          <Section title={`Security Annotations (${secs.length})`} color={theme.palette.rose}>
            {Array.from(secByKind.entries()).map(([kind, nodes]) => {
              const kc = KIND_COLORS[kind] || theme.palette.rose;
              return (
                <div key={kind} style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: sz(9), color: kc, marginBottom: 4,
                    fontFamily: theme.font.mono,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span>{KIND_ICONS[kind] || "●"}</span>
                    <span>{securityKindLabel(kind)}</span>
                    <span style={{ color: theme.text.hint }}>({nodes.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {nodes.map(n => (
                      <div key={n.uri} style={{
                        fontSize: sz(11), color: theme.text.secondary,
                        padding: "2px 8px 2px 16px",
                        borderLeft: `2px solid ${kc}33`,
                      }}>
                        {n.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </Section>
        )}

        {/* Interactions */}
        {interactions.length > 0 && (
          <Section title={`Interacts With (${interactions.length})`} color={theme.palette.amber}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {interactions.map(uri => {
                const other = data.nodes.get(uri);
                if (!other) return null;
                const oc = KIND_COLORS[other.kind] || theme.text.muted;
                return (
                  <div
                    key={uri}
                    onClick={() => navigateTo(uri)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: sz(9), color: oc }}>
                      {KIND_ICONS[other.kind] || "●"}
                    </span>
                    <span style={{ fontSize: sz(11), color: theme.text.primary }}>
                      {other.label}
                    </span>
                    <span style={{
                      fontSize: sz(8), color: theme.text.hint,
                      fontFamily: theme.font.mono,
                    }}>
                      {other.kind}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    );
  }

  return (
    <div style={{
      height: "var(--page-height)",
      display: "flex", flexDirection: "column",
      padding: "0 16px 16px",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${theme.border.subtle}`,
      }}>
        <div style={{
          fontSize: sz(13), fontWeight: 700, color: theme.palette.blue,
          fontFamily: theme.font.sans,
          whiteSpace: "nowrap",
        }}>
          Hardware Security Explorer
        </div>

        <input
          type="text"
          placeholder="Search entities..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1, maxWidth: 300,
            padding: "5px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${theme.border.default}`,
            color: theme.text.primary, fontSize: sz(11),
            fontFamily: theme.font.sans,
            outline: "none",
          }}
        />

        <div style={{
          display: "flex", gap: 8, marginLeft: "auto",
        }}>
          {[
            { label: "Entities", count: hwEntities.length, color: theme.palette.blue },
            { label: "Interfaces", count: Array.from(data.nodes.values()).filter(n => n.kind.includes("Interface")).length, color: theme.palette.cyan },
            { label: "Security", count: Array.from(data.nodes.values()).filter(n => ["Vulnerability", "AttackSurface", "Countermeasure", "SideChannel", "ThreatModel", "SecurityProperty"].includes(n.kind)).length, color: theme.palette.rose },
          ].map(s => (
            <div key={s.label} style={{
              fontSize: sz(9), color: theme.text.hint,
              fontFamily: theme.font.mono,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 3,
                background: s.color, opacity: 0.5,
                display: "inline-block",
              }} />
              <span style={{ color: s.color }}>{s.count}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content: tree + detail */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Tree panel */}
        <div style={{
          width: 380, minWidth: 300,
          borderRight: `1px solid ${theme.border.subtle}`,
          overflowY: "auto",
          paddingTop: 4,
        }}>
          {treeRoots.map(root => renderTreeNode(root, 0))}

          {/* Legend */}
          <div style={{
            padding: "12px 12px 16px",
            borderTop: `1px solid ${theme.border.subtle}`,
            marginTop: 8,
          }}>
            <div style={{
              fontSize: sz(8), color: theme.text.hint, marginBottom: 6,
              fontFamily: theme.font.mono,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              Legend
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {["System", "Subsystem", "Component", "Element"].map(kind => (
                <span key={kind} style={{
                  fontSize: sz(7), padding: "1px 5px", borderRadius: 4,
                  background: (KIND_COLORS[kind] || "#888") + "18",
                  color: KIND_COLORS[kind] || "#888",
                  fontFamily: theme.font.mono,
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <span>{KIND_ICONS[kind]}</span>
                  <span>{kind}</span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{
                fontSize: sz(7), padding: "1px 5px", borderRadius: 4,
                background: theme.palette.emerald + "18", color: theme.palette.emerald,
                fontFamily: theme.font.mono,
              }}>
                T5 = trust
              </span>
              <span style={{
                fontSize: sz(7), padding: "1px 5px", borderRadius: 4,
                background: theme.palette.rose + "18", color: theme.palette.rose,
                fontFamily: theme.font.mono,
              }}>
                3 = security
              </span>
              <span style={{
                fontSize: sz(7), padding: "1px 5px", borderRadius: 4,
                background: theme.palette.cyan + "18", color: theme.palette.cyan,
                fontFamily: theme.font.mono,
              }}>
                2 = interfaces
              </span>
              <span style={{
                fontSize: sz(7), padding: "1px 5px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: theme.text.hint,
                fontFamily: theme.font.mono,
              }}>
                ~ = inferred
              </span>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div style={{
          flex: 1,
          overflow: "hidden",
        }}>
          {renderDetailPanel()}
        </div>
      </div>
    </div>
  );
}
