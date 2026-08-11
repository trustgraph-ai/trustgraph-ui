import { createContext, useContext } from "react";
import { useGuidance } from "../../hooks/useGuidance";
import type { GuidanceEntry } from "./GuidanceBanner";

interface GuidanceContextValue {
  pageKey: string;
  entries: Map<string, GuidanceEntry>;
  isLoading: boolean;
}

const GuidanceContext = createContext<GuidanceContextValue>({ pageKey: "", entries: new Map(), isLoading: true });

export function useGuidanceContext() {
  return useContext(GuidanceContext);
}

interface PageGuidanceProps {
  pageKey: string;
  children: React.ReactNode;
}

export function PageGuidance({ pageKey, children }: PageGuidanceProps) {
  const { entries, isLoading } = useGuidance(pageKey);

  const map = new Map<string, GuidanceEntry>();
  for (const entry of entries) {
    map.set(entry.id, entry);
  }

  return (
    <GuidanceContext.Provider value={{ pageKey, entries: map, isLoading }}>
      {children}
    </GuidanceContext.Provider>
  );
}
