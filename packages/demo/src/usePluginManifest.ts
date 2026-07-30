import { useState, useEffect, type ComponentType } from "react";
import { loadRemotePlugin } from "./loadRemotePlugin";

export type PluginPlacement = "workflow" | "demo";

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
  placement?: PluginPlacement;
}

export interface ResolvedPlugin {
  id: string;
  title: string;
  icon: string;
  paletteKey: string;
  description: string;
  screenshot?: string;
  placement: PluginPlacement;
  Component: ComponentType | null;
}

export function usePluginManifest(
  manifestUrl: string,
  builtins?: Map<string, ComponentType>,
) {
  const [plugins, setPlugins] = useState<ResolvedPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(manifestUrl);
        if (!res.ok) throw new Error(`Failed to fetch plugin manifest: ${res.status}`);
        const entries: PluginManifestEntry[] = await res.json();

        const resolved: ResolvedPlugin[] = [];
        for (const entry of entries) {
          try {
            let Component: ComponentType | null = null;

            if (entry.url && entry.globalName) {
              Component = await loadRemotePlugin(entry.url, entry.globalName, entry.componentName);
            } else if (builtins?.has(entry.id)) {
              Component = builtins.get(entry.id)!;
            }

            if (!cancelled) {
              resolved.push({
                id: entry.id,
                title: entry.title,
                icon: entry.icon,
                paletteKey: entry.paletteKey,
                description: entry.description,
                screenshot: entry.screenshot,
                placement: entry.placement ?? "demo",
                Component,
              });
            }
          } catch (err) {
            console.warn(`Failed to load plugin "${entry.id}":`, err);
          }
        }

        if (!cancelled) {
          setPlugins(resolved);
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

  return { plugins, isLoading, error };
}
