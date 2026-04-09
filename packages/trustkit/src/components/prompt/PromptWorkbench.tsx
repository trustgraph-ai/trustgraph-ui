import { useState } from "react";
import { usePromptList } from "../../hooks/usePromptList";
import { usePromptDetail } from "../../hooks/usePromptDetail";
import { usePromptTest } from "../../hooks/usePromptTest";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { PromptTestPanel } from "./PromptTestPanel";
import { SplitPane, LoadingState } from "../common";

/**
 * Full prompt workbench — list on the left, editor in the middle,
 * test panel on the right. Edit prompts and test them with real
 * variable substitution.
 */
export function PromptWorkbench() {
  const { prompts, isLoading, error } = usePromptList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading: detailLoading, save, isSaving, saveError } = usePromptDetail(selectedId);
  const { result, run, reset } = usePromptTest();

  if (isLoading) return <LoadingState />;
  if (error) return <LoadingState variant="error" message={error} />;

  const emptyState = (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "#444",
      fontSize: 13,
      fontStyle: "italic",
    }}>
      Select a prompt to edit and test
    </div>
  );

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
          onSelect={(id) => {
            setSelectedId(id);
            reset();
          }}
        />
      }
    >
      {detailLoading && <LoadingState />}
      {!data && !detailLoading && emptyState}
      {data && !detailLoading && selectedId && (
        <div style={{ display: "flex", height: "100%" }}>
          {/* Editor */}
          <div style={{ flex: 1, minWidth: 0, borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "auto" }}>
            <PromptEditor
              data={data}
              onSave={save}
              isSaving={isSaving}
              saveError={saveError}
            />
          </div>

          {/* Test panel */}
          <div style={{ width: 400, flexShrink: 0, overflow: "auto" }}>
            <PromptTestPanel
              promptId={selectedId}
              templateText={data.prompt}
              result={result}
              onRun={run}
              onReset={reset}
            />
          </div>
        </div>
      )}
    </SplitPane>
  );
}
