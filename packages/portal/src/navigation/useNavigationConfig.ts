import { useState, useEffect, type ComponentType } from "react";
import { loadRemotePlugin } from "../loadRemotePlugin";
import type {
  NavigationConfig,
  TabEntry,
  ComponentEntry,
  RouteEntry,
  ResolvedComponent,
} from "./types";

interface NavigationState {
  navConfig: NavigationConfig;
  tabs: TabEntry[];
  components: Map<string, ResolvedComponent>;
  routes: RouteEntry[];
  isLoading: boolean;
  error: string | null;
}

export function useNavigationConfig(
  builtins?: Map<string, ComponentType>,
): NavigationState {
  const [state, setState] = useState<NavigationState>({
    navConfig: { default: "" },
    tabs: [],
    components: new Map(),
    routes: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [navRes, tabsRes, componentsRes, routesRes] = await Promise.all([
          fetch("/config/navigation.json"),
          fetch("/config/tabs.json"),
          fetch("/config/components.json"),
          fetch("/config/routes.json"),
        ]);

        if (!navRes.ok) throw new Error(`Failed to fetch navigation.json: ${navRes.status}`);
        if (!tabsRes.ok) throw new Error(`Failed to fetch tabs.json: ${tabsRes.status}`);
        if (!componentsRes.ok) throw new Error(`Failed to fetch components.json: ${componentsRes.status}`);
        if (!routesRes.ok) throw new Error(`Failed to fetch routes.json: ${routesRes.status}`);

        const navConfig: NavigationConfig = await navRes.json();
        const tabs: TabEntry[] = await tabsRes.json();
        const componentEntries: ComponentEntry[] = await componentsRes.json();
        const routes: RouteEntry[] = await routesRes.json();

        const resolved = new Map<string, ResolvedComponent>();

        await Promise.all(
          componentEntries.map(async (entry) => {
            try {
              let Component: ComponentType | null = null;

              if (entry.url && entry.globalName) {
                Component = await loadRemotePlugin(
                  entry.url,
                  entry.globalName,
                  entry.componentName,
                );
              } else if (builtins?.has(entry.id)) {
                Component = builtins.get(entry.id)!;
              }

              let config: unknown = undefined;
              if (entry.config) {
                const configRes = await fetch(entry.config);
                if (configRes.ok) {
                  config = await configRes.json();
                }
              }

              resolved.set(entry.id, { id: entry.id, Component, config });
            } catch (err) {
              console.warn(`Failed to load component "${entry.id}":`, err);
            }
          }),
        );

        // Also register builtins that aren't in components.json
        if (builtins) {
          for (const [id, Component] of builtins) {
            if (!resolved.has(id)) {
              resolved.set(id, { id, Component });
            }
          }
        }

        if (!cancelled) {
          setState({
            navConfig,
            tabs,
            components: resolved,
            routes,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: String(err),
          }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, [builtins]);

  return state;
}
