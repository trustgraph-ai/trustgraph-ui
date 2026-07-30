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

interface PluginManifestFile {
  workflows?: PluginManifestEntry[];
  demos?: PluginManifestEntry[];
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
  const [workflows, setWorkflows] = useState<ResolvedPlugin[]>([]);
  const [demos, setDemos] = useState<ResolvedPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(manifestUrl);
        if (!res.ok) throw new Error(`Failed to fetch plugin manifest: ${res.status}`);
        const manifest: PluginManifestFile = await res.json();

        const [resolvedWorkflows, resolvedDemos] = await Promise.all([
          resolveEntries(manifest.workflows ?? [], builtins),
          resolveEntries(manifest.demos ?? [], builtins),
        ]);

        if (!cancelled) {
          setWorkflows(resolvedWorkflows);
          setDemos(resolvedDemos);
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

  return { workflows, demos, isLoading, error };
}
