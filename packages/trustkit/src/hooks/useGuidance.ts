import { useState, useEffect, useMemo } from "react";
import type { GuidanceEntry } from "../components/common/GuidanceBanner";

export function useGuidance(pageKey: string) {
  const [data, setData] = useState<GuidanceEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/config/guidance.json");
        if (!res.ok) { setIsLoading(false); return; }
        const json = await res.json();
        if (!cancelled) {
          setData(json[pageKey] ?? null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pageKey]);

  const lookup = useMemo(() => {
    const map = new Map<string, GuidanceEntry>();
    if (data) {
      for (const entry of data) {
        map.set(entry.id, entry);
      }
    }
    return (id: string) => map.get(id) ?? null;
  }, [data]);

  return { lookup, entries: data ?? [], isLoading };
}
