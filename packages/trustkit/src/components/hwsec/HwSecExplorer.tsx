import { useState, useMemo, useCallback } from "react";
import { useHwSecData } from "../../hooks/useHwSecData";
import type { HwNode } from "../../hooks/useHwSecData";
import { text, border, palette } from "../../theme";
import { LoadingState } from "../common";

export interface HwSecExplorerProps {}

const HW_ENTITY_TYPES: readonly string[] = ["System", "Subsystem", "Component", "SubComponent", "Element", "HardwareEntity"];

const TYPE_TIER: Record<string, number> = {
  System: 0, Subsystem: 1, Component: 2, SubComponent: 3, Element: 4, HardwareEntity: 5,
};

const KIND_COLORS: Record<string, string> = {
  System: palette.blue,
  Subsystem: palette.purple,
  Component: palette.emerald,
  SubComponent: palette.cyan,
  Element: palette.amber,
  HardwareEntity: "#888",
  Interface: palette.cyan,
  NetworkInterface: palette.cyan,
  PhysicalInterface: palette.orange,
  LogicalInterface: palette.purple,
  Firmware: palette.blue,
  Vulnerability: palette.rose,
  AttackSurface: palette.orange,
  Countermeasure: palette.emerald,
  SideChannel: palette.purple,
  ThreatModel: palette.amber,
  SecurityProperty: palette.rose,
  TrustBoundary: palette.pink,
};

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

function trustColor(level: number): string {
  if (level >= 5) return palette.emerald;
  if (level >= 4) return palette.cyan;
  if (level >= 3) return palette.blue;
  if (level >= 2) return palette.amber;
  if (level >= 1) return palette.orange;
  return palette.rose;
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
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 8, color, fontFamily: "'IBM Plex Mono', monospace",
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
  const data = useHwSecData();
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
      <div style={{ padding: 48, textAlign: "center", color: palette.rose }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Failed to load data</div>
        <div style={{ fontSize: 11, color: text.muted }}>{data.error.message}</div>
      </div>
    );
  }

  function renderTreeNode(node: HwNode, depth: number) {
    if (!hasVisibleDescendant(node.uri) && !matchesSearch(node)) return null;

    const kids = treeChildren.get(node.uri) || [];
    const hasChildren = kids.length > 0;
    const isExpanded = expandedNodes.has(node.uri);
    const isSelected = selectedUri === node.uri;
    const color = KIND_COLORS[node.kind] || text.muted;
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
                fontSize: 8, color: text.faint, cursor: "pointer",
                width: 10, textAlign: "center", userSelect: "none",
              }}
            >
              {isExpanded ? "▼" : "▶"}
            </span>
          ) : (
            <span style={{ width: 10 }} />
          )}

          <span style={{ fontSize: 10, color, opacity: 0.7 }}>
            {KIND_ICONS[node.kind] || "●"}
          </span>

          <span style={{
            fontSize: 11, color: isSelected ? color : text.primary,
            fontWeight: isSelected ? 600 : 400,
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {node.label}
          </span>

          {isInferred && (
            <span style={{
              fontSize: 6, padding: "1px 3px", borderRadius: 3,
              background: "rgba(255,255,255,0.06)",
              color: text.hint,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              ~
            </span>
          )}

          {trust !== undefined && (
            <span style={{
              fontSize: 7, padding: "1px 4px", borderRadius: 4,
              background: trustColor(trust) + "18",
              color: trustColor(trust),
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              T{trust}
            </span>
          )}

          {sc > 0 && (
            <span style={{
              fontSize: 7, padding: "1px 4px", borderRadius: 4,
              background: palette.rose + "18",
              color: palette.rose,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {sc}
            </span>
          )}

          {ic > 0 && (
            <span style={{
              fontSize: 7, padding: "1px 4px", borderRadius: 4,
              background: palette.cyan + "18",
              color: palette.cyan,
              fontFamily: "'IBM Plex Mono', monospace",
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
          height: "100%", color: text.hint, fontSize: 12,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          Select an entity to view details
        </div>
      );
    }

    const color = KIND_COLORS[selected.kind] || text.muted;
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
              fontSize: 8, padding: "2px 6px", borderRadius: 4,
              background: color + "18", color, border: `1px solid ${color}33`,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {selected.kind}
            </span>
            {trust !== undefined && (
              <span style={{
                fontSize: 8, padding: "2px 6px", borderRadius: 4,
                background: trustColor(trust) + "18",
                color: trustColor(trust),
                border: `1px solid ${trustColor(trust)}33`,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                Trust Level {trust}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700, color,
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
                fontSize: 11, color: text.secondary, lineHeight: 1.5,
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
          const pc = KIND_COLORS[parent.kind] || text.muted;
          const isInferred = !data.parentOf.has(selected.uri);
          return (
            <Section title={isInferred ? "Contained By (inferred)" : "Contained By"} color={palette.blue}>
              <div
                onClick={() => navigateTo(parentUri)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 8px", borderRadius: 6, cursor: "pointer",
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${border.subtle}`,
                }}
              >
                <span style={{ fontSize: 9, color: pc }}>
                  {KIND_ICONS[parent.kind] || "●"}
                </span>
                <span style={{ fontSize: 11, color: pc }}>
                  {parent.label}
                </span>
                <span style={{
                  fontSize: 8, color: text.hint,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {parent.kind}
                </span>
              </div>
            </Section>
          );
        })()}

        {/* Children */}
        {childUris.length > 0 && (
          <Section title={`Contains (${childUris.length})`} color={palette.emerald}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {childUris.map(uri => {
                const child = data.nodes.get(uri);
                if (!child) return null;
                const cc = KIND_COLORS[child.kind] || text.muted;
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
                    <span style={{ fontSize: 9, color: cc }}>
                      {KIND_ICONS[child.kind] || "●"}
                    </span>
                    <span style={{ fontSize: 11, color: text.primary }}>
                      {child.label}
                    </span>
                    <span style={{
                      fontSize: 8, color: text.hint,
                      fontFamily: "'IBM Plex Mono', monospace",
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
          <Section title={`Interfaces (${ifaces.length})`} color={palette.cyan}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {ifaces.map(uri => {
                const iface = data.nodes.get(uri);
                if (!iface) return null;
                const proto = data.protocols.get(uri);
                const ic = KIND_COLORS[iface.kind] || palette.cyan;
                return (
                  <div key={uri} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px", borderRadius: 4,
                  }}>
                    <span style={{ fontSize: 9, color: ic }}>
                      {KIND_ICONS[iface.kind] || "⊘"}
                    </span>
                    <span style={{ fontSize: 11, color: text.primary }}>
                      {iface.label}
                    </span>
                    {proto && (
                      <span style={{
                        fontSize: 8, padding: "1px 5px", borderRadius: 4,
                        background: ic + "18", color: ic, border: `1px solid ${ic}33`,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        {proto}
                      </span>
                    )}
                    <span style={{
                      fontSize: 8, color: text.hint,
                      fontFamily: "'IBM Plex Mono', monospace",
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
          <Section title={`Firmware (${fws.length})`} color={palette.blue}>
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
                    <span style={{ fontSize: 9, color: palette.blue }}>▧</span>
                    <span style={{ fontSize: 11, color: text.primary }}>
                      {fw.label}
                    </span>
                    {ver && (
                      <span style={{
                        fontSize: 8, padding: "1px 5px", borderRadius: 4,
                        background: palette.blue + "18", color: palette.blue,
                        border: `1px solid ${palette.blue}33`,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}>
                        v{ver}
                      </span>
                    )}
                    {signed !== undefined && (
                      <span style={{
                        fontSize: 8, padding: "1px 5px", borderRadius: 4,
                        background: (signed ? palette.emerald : palette.rose) + "18",
                        color: signed ? palette.emerald : palette.rose,
                        border: `1px solid ${(signed ? palette.emerald : palette.rose)}33`,
                        fontFamily: "'IBM Plex Mono', monospace",
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
          <Section title={`Security Annotations (${secs.length})`} color={palette.rose}>
            {Array.from(secByKind.entries()).map(([kind, nodes]) => {
              const kc = KIND_COLORS[kind] || palette.rose;
              return (
                <div key={kind} style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: 9, color: kc, marginBottom: 4,
                    fontFamily: "'IBM Plex Mono', monospace",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span>{KIND_ICONS[kind] || "●"}</span>
                    <span>{securityKindLabel(kind)}</span>
                    <span style={{ color: text.hint }}>({nodes.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {nodes.map(n => (
                      <div key={n.uri} style={{
                        fontSize: 11, color: text.secondary,
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
          <Section title={`Interacts With (${interactions.length})`} color={palette.amber}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {interactions.map(uri => {
                const other = data.nodes.get(uri);
                if (!other) return null;
                const oc = KIND_COLORS[other.kind] || text.muted;
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
                    <span style={{ fontSize: 9, color: oc }}>
                      {KIND_ICONS[other.kind] || "●"}
                    </span>
                    <span style={{ fontSize: 11, color: text.primary }}>
                      {other.label}
                    </span>
                    <span style={{
                      fontSize: 8, color: text.hint,
                      fontFamily: "'IBM Plex Mono', monospace",
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
      height: "calc(100vh - 110px)",
      display: "flex", flexDirection: "column",
      padding: "0 16px 16px",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${border.subtle}`,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: palette.blue,
          fontFamily: "'IBM Plex Sans', sans-serif",
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
            border: `1px solid ${border.default}`,
            color: text.primary, fontSize: 11,
            fontFamily: "'IBM Plex Sans', sans-serif",
            outline: "none",
          }}
        />

        <div style={{
          display: "flex", gap: 8, marginLeft: "auto",
        }}>
          {[
            { label: "Entities", count: hwEntities.length, color: palette.blue },
            { label: "Interfaces", count: Array.from(data.nodes.values()).filter(n => n.kind.includes("Interface")).length, color: palette.cyan },
            { label: "Security", count: Array.from(data.nodes.values()).filter(n => ["Vulnerability", "AttackSurface", "Countermeasure", "SideChannel", "ThreatModel", "SecurityProperty"].includes(n.kind)).length, color: palette.rose },
          ].map(s => (
            <div key={s.label} style={{
              fontSize: 9, color: text.hint,
              fontFamily: "'IBM Plex Mono', monospace",
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
          borderRight: `1px solid ${border.subtle}`,
          overflowY: "auto",
          paddingTop: 4,
        }}>
          {treeRoots.map(root => renderTreeNode(root, 0))}

          {/* Legend */}
          <div style={{
            padding: "12px 12px 16px",
            borderTop: `1px solid ${border.subtle}`,
            marginTop: 8,
          }}>
            <div style={{
              fontSize: 8, color: text.hint, marginBottom: 6,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              Legend
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {["System", "Subsystem", "Component", "Element"].map(kind => (
                <span key={kind} style={{
                  fontSize: 7, padding: "1px 5px", borderRadius: 4,
                  background: (KIND_COLORS[kind] || "#888") + "18",
                  color: KIND_COLORS[kind] || "#888",
                  fontFamily: "'IBM Plex Mono', monospace",
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <span>{KIND_ICONS[kind]}</span>
                  <span>{kind}</span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{
                fontSize: 7, padding: "1px 5px", borderRadius: 4,
                background: palette.emerald + "18", color: palette.emerald,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                T5 = trust
              </span>
              <span style={{
                fontSize: 7, padding: "1px 5px", borderRadius: 4,
                background: palette.rose + "18", color: palette.rose,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                3 = security
              </span>
              <span style={{
                fontSize: 7, padding: "1px 5px", borderRadius: 4,
                background: palette.cyan + "18", color: palette.cyan,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                2 = interfaces
              </span>
              <span style={{
                fontSize: 7, padding: "1px 5px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: text.hint,
                fontFamily: "'IBM Plex Mono', monospace",
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
