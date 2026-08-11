import { useGuidance } from "../../hooks/useGuidance";
import { GuidanceBanner } from "./GuidanceBanner";

interface PageGuidanceProps {
  pageKey: string;
}

export function PageGuidance({ pageKey }: PageGuidanceProps) {
  const { entries } = useGuidance(pageKey);

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry) => (
        <GuidanceBanner
          key={entry.id}
          id={`${pageKey}-${entry.id}`}
          title={entry.title}
          body={entry.body}
          color={entry.color}
          position={entry.position}
        />
      ))}
    </>
  );
}
