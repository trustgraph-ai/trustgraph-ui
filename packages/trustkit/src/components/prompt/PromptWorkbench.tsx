import { useState } from "react";
import { usePromptList } from "../../hooks/usePromptList";
import { usePromptDetail } from "../../hooks/usePromptDetail";
import { usePromptTest } from "../../hooks/usePromptTest";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { PromptTestPanel } from "./PromptTestPanel";
import { LoadingState } from "../common";
import { useTheme } from "../../theme/ThemeContext";

export function PromptWorkbench() {
  const { theme, sz } = useTheme();
  const { prompts, isLoading, error, create } = usePromptList();
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
      <div style={{
        width: 260,
        flexShrink: 0,
        borderRight: `1px solid ${theme.border.default}`,
        overflowY: "auto",
      }}>
        <PromptList
          prompts={prompts}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            reset();
          }}
          onCreate={create}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        {detailLoading && <LoadingState />}

        {!data && !detailLoading && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            color: theme.text.hint,
            fontSize: sz(13),
            fontStyle: "italic",
          }}>
            Select a prompt to edit and test
          </div>
        )}

        {data && !detailLoading && selectedId && (
          <>
            <div style={{
              flex: 1,
              minWidth: 0,
              borderRight: `1px solid ${theme.border.default}`,
              overflowY: "auto",
            }}>
              <PromptEditor
                data={data}
                onSave={save}
                isSaving={isSaving}
                saveError={saveError}
              />
            </div>

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
