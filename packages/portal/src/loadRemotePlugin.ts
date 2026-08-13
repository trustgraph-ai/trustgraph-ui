import type { ComponentType } from "react";

const scriptCache = new Map<string, Record<string, unknown>>();

export function loadRemotePlugin(
  url: string,
  globalName: string,
  componentName?: string,
): Promise<ComponentType> {
  const loadGlobal = scriptCache.has(url)
    ? Promise.resolve(scriptCache.get(url)!)
    : new Promise<Record<string, unknown>>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => {
          const raw = (window as unknown as Record<string, unknown>)[globalName];
          if (!raw) {
            reject(new Error(`Plugin at ${url} did not register global "${globalName}"`));
            return;
          }
          const obj = typeof raw === "function" ? { default: raw } : raw as Record<string, unknown>;
          scriptCache.set(url, obj);
          resolve(obj);
        };
        script.onerror = () => reject(new Error(`Failed to load plugin from ${url}`));
        document.head.appendChild(script);
      });

  return loadGlobal.then((obj) => {
    const key = componentName ?? "default";
    const component = obj[key] as ComponentType | undefined;
    if (!component) {
      const available = Object.keys(obj).join(", ");
      throw new Error(
        `Plugin "${globalName}" has no export "${key}" (available: ${available})`,
      );
    }
    return component;
  });
}
