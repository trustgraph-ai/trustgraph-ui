import { useState, useEffect, type ComponentType } from "react";
import { loadRemotePlugin } from "./loadRemotePlugin";

export interface PluginManifestEntry {
  id: string;
  title: string;
  icon: string;
  paletteKey: string;
  description: string;
  url?: string;
  globalName?: string;
  componentName?: string;
  screenshot?: string;
}

export interface ResolvedPlugin {
  id: string;
  title: string;
  icon: string;
  paletteKey: string;
  description: string;
  screenshot?: string;
  Component: ComponentType | null;
}

export interface ManifestSection {
  title: string;
  description: string;
  tab: string;
  navLabel?: string;
  navIcon?: string;
  components: ResolvedPlugin[];
}

interface RawSection {
  title: string;
  description: string;
  tab: string;
  navLabel?: string;
  navIcon?: string;
  components: PluginManifestEntry[];
}

interface LegacyManifest {
  workflows?: PluginManifestEntry[];
  demos?: PluginManifestEntry[];
}

function isLegacyFormat(data: unknown): data is LegacyManifest {
  return !Array.isArray(data) && typeof data === "object" && data !== null;
}

function normaliseSections(data: unknown): RawSection[] {
  if (Array.isArray(data)) return data as RawSection[];

  if (isLegacyFormat(data)) {
    const sections: RawSection[] = [];
    if (data.workflows) {
      sections.push({
        title: "TrustGraph Workflows",
        description: "Each workflow demonstrates how trustkit components compose to create a full experience.",
        tab: "home",
        components: data.workflows,
      });
    }
    if (data.demos) {
      sections.push({
        title: "Demos",
        description: "Interactive demonstrations showcasing TrustGraph capabilities with real-world datasets.",
        tab: "demos",
        components: data.demos,
      });
    }
    return sections;
  }

  return [];
}

async function resolveEntries(
  entries: PluginManifestEntry[],
  builtins?: Map<string, ComponentType>,
): Promise<ResolvedPlugin[]> {
  const resolved: ResolvedPlugin[] = [];
  for (const entry of entries) {
    try {
      let Component: ComponentType | null = null;

      if (entry.url && entry.globalName) {
        Component = await loadRemotePlugin(entry.url, entry.globalName, entry.componentName);
      } else if (builtins?.has(entry.id)) {
        Component = builtins.get(entry.id)!;
      }

      resolved.push({
        id: entry.id,
        title: entry.title,
        icon: entry.icon,
        paletteKey: entry.paletteKey,
        description: entry.description,
        screenshot: entry.screenshot,
        Component,
      });
    } catch (err) {
      console.warn(`Failed to load plugin "${entry.id}":`, err);
    }
  }
  return resolved;
}

export function usePluginManifest(
  manifestUrl: string,
  builtins?: Map<string, ComponentType>,
) {
  const [sections, setSections] = useState<ManifestSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(manifestUrl);
        if (!res.ok) throw new Error(`Failed to fetch plugin manifest: ${res.status}`);
        const data = await res.json();
        const rawSections = normaliseSections(data);

        const resolved = await Promise.all(
          rawSections.map(async (s) => ({
            title: s.title,
            description: s.description,
            tab: s.tab,
            navLabel: s.navLabel,
            navIcon: s.navIcon,
            components: await resolveEntries(s.components, builtins),
          })),
        );

        if (!cancelled) {
          setSections(resolved);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [manifestUrl, builtins]);

  const navTabs = (() => {
    const seen = new Set<string>();
    const result: { key: string; label: string; icon?: string }[] = [];
    for (const s of sections) {
      if (seen.has(s.tab)) continue;
      seen.add(s.tab);
      result.push({
        key: s.tab,
        label: s.navLabel ?? s.title,
        icon: s.navIcon,
      });
    }
    return result;
  })();

  const byTab = (tab: string) => sections.filter(s => s.tab === tab);

  // Backward compat helpers
  const workflows = byTab("home").flatMap(s => s.components);
  const demos = byTab("demos").flatMap(s => s.components);

  return { sections, navTabs, byTab, workflows, demos, isLoading, error };
}
