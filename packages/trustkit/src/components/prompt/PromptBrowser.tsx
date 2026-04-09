import { useState } from "react";
import { usePromptList } from "../../hooks/usePromptList";
import { usePromptDetail } from "../../hooks/usePromptDetail";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { SplitPane, LoadingState } from "../common";

/**
 * Browse-only view of prompts. List on the left, read-only
 * template view on the right.
 */
export function PromptBrowser() {
  const { prompts, isLoading, error } = usePromptList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading: detailLoading } = usePromptDetail(selectedId);

  if (isLoading) return <LoadingState />;
  if (error) return <LoadingState variant="error" message={error} />;

  return (
    <SplitPane
      height="calc(100vh - 160px)"
      panelSide="left"
      panelBorder
      panelWidth={260}
      panel={
        <PromptList
          prompts={prompts}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      }
    >
      {detailLoading && <LoadingState />}
      {data && !detailLoading && (
        <PromptEditor
          data={data}
          onSave={() => {}}
          readOnly
        />
      )}
      {!data && !detailLoading && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#444",
          fontSize: 13,
          fontStyle: "italic",
        }}>
          Select a prompt to view
        </div>
      )}
    </SplitPane>
  );
}
