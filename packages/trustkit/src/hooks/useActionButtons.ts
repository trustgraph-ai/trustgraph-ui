import { useState, useEffect, useMemo } from "react";

export interface ActionButtonEntry {
  id: string;
  label: string;
  icon?: string;
  body: string;
  color?: string;
  position?: string;
  order?: number;
}

export function useActionButtons(key: string) {
  const [data, setData] = useState<ActionButtonEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/config/action-buttons.json");
        if (!res.ok) { setIsLoading(false); return; }
        const json = await res.json();
        if (!cancelled) {
          setData(json[key] ?? null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [key]);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [data]);

  return { buttons: sorted, isLoading };
}
