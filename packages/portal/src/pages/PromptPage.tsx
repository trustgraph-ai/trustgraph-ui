import { useState } from "react";
import {
  PromptBrowser,
  PromptWorkbench,
  ModeSelector,
  SectionLabel,
  useTheme,
} from "@trustgraph/trustkit";
import { DevPanel } from "../components/DevPanel";

type PromptMode = "browse" | "workbench";

const modes = [
  { key: "browse", label: "Browse" },
  { key: "workbench", label: "Workbench" },
];

const modeDescriptions: Record<PromptMode, string> = {
  browse: "Read-only view of all prompt templates.",
  workbench: "Edit prompts, test with variables, see streaming results.",
};

export function PromptPage() {
  const { theme, sz } = useTheme();
  const [mode, setMode] = useState<PromptMode>("workbench");

  return (
    <>
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <SectionLabel>VIEW</SectionLabel>
        <ModeSelector
          modes={modes}
          activeMode={mode}
          onChange={(key) => setMode(key as PromptMode)}
          color={theme.palette.amber}
        />
        <span style={{
          fontSize: sz(11),
          color: theme.text.subtle,
          fontStyle: "italic",
          marginLeft: 8,
        }}>
          {modeDescriptions[mode]}
        </span>
      </div>

      {mode === "browse" && <PromptBrowser />}
      {mode === "workbench" && <PromptWorkbench />}

      <DevPanel
        explanation="This page demonstrates the prompt management components. Browse mode shows a read-only list of all prompts. Workbench mode adds editing and testing — modify a template and run it against the LLM with custom variables to see streaming results and token counts."
        codeSamples={[
          {
            label: "Option 1: Browse (read-only)",
            code: `import { PromptBrowser } from "@trustgraph/trustkit";

<PromptBrowser />`,
          },
          {
            label: "Option 2: Full workbench",
            code: `import { PromptWorkbench } from "@trustgraph/trustkit";

<PromptWorkbench />`,
          },
          {
            label: "Custom: using hooks directly",
            code: `import {
  usePromptList,
  usePromptDetail,
  usePromptTest,
} from "@trustgraph/trustkit";

function MyPromptUI() {
  const { prompts } = usePromptList();
  const { data, save } = usePromptDetail("template.question");
  const { result, run } = usePromptTest();

  return (
    <div>
      <textarea value={data?.prompt} />
      <button onClick={() => run("question", { question: "hello" })}>
        Test
      </button>
      <pre>{result.response}</pre>
    </div>
  );
}`,
          },
        ]}
        components={[
          { name: "PromptWorkbench", tier: "3", description: "Full editor + test panel" },
          { name: "PromptBrowser", tier: "3", description: "Read-only prompt list + viewer" },
          { name: "PromptList", tier: "2", description: "Prompt list with selection" },
          { name: "PromptEditor", tier: "2", description: "Template text editor with response type and schema" },
          { name: "PromptTestPanel", tier: "2", description: "Variable input + streaming test runner" },
        ]}
        hooks={[
          { name: "usePromptList", tier: "1", description: "Fetches all prompt IDs from config service" },
          { name: "usePromptDetail", tier: "1", description: "Fetches/saves a single prompt template" },
          { name: "usePromptTest", tier: "1", description: "Executes a prompt with streaming response" },
        ]}
      />
    </>
  );
}
