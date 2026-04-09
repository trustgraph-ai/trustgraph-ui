import { useState } from "react";
import { usePromptList } from "../../hooks/usePromptList";
import { usePromptDetail } from "../../hooks/usePromptDetail";
import { usePromptTest } from "../../hooks/usePromptTest";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { PromptTestPanel } from "./PromptTestPanel";
import { LoadingState } from "../common";
import { border } from "../../theme";

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

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 160px)",
    }}>
      {/* Prompt list */}
      <div style={{
        width: 260,
        flexShrink: 0,
        borderRight: `1px solid ${border.default}`,
        overflowY: "auto",
      }}>
        <PromptList
          prompts={prompts}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            reset();
          }}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        {detailLoading && <LoadingState />}

        {!data && !detailLoading && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            color: "#444",
            fontSize: 13,
            fontStyle: "italic",
          }}>
            Select a prompt to edit and test
          </div>
        )}

        {data && !detailLoading && selectedId && (
          <>
            {/* Editor */}
            <div style={{
              flex: 1,
              minWidth: 0,
              borderRight: `1px solid ${border.default}`,
              overflowY: "auto",
            }}>
              <PromptEditor
                data={data}
                onSave={save}
                isSaving={isSaving}
                saveError={saveError}
              />
            </div>

            {/* Test panel */}
            <div style={{
              width: 400,
              flexShrink: 0,
              overflowY: "auto",
            }}>
              <PromptTestPanel
                promptId={selectedId}
                templateText={data.prompt}
                result={result}
                onRun={run}
                onReset={reset}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
