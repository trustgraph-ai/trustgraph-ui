import { useState, useCallback } from "react";
import { ConfigSidebar } from "./ConfigSidebar";
import { ConfigEditor } from "./ConfigEditor";
import { AgentDebugPanel } from "./AgentDebugPanel";
import type { SelectedItem } from "./types";
import { useTheme } from "../../theme/ThemeContext";

export function AgentConsole() {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [generation, setGeneration] = useState(0);

  const handleDelete = useCallback(() => {
    setSelected(null);
    setGeneration(g => g + 1);
  }, []);

  return (
    <div style={{
      display: "flex",
      height: "var(--page-height)",
    }}>
      <div style={{
        width: 240,
        flexShrink: 0,
        borderRight: `1px solid ${theme.border.default}`,
        overflowY: "auto",
      }}>
        <ConfigSidebar selected={selected} onSelect={setSelected} generation={generation} />
      </div>

      <div style={{
        flex: 1,
        minWidth: 0,
        borderRight: `1px solid ${theme.border.default}`,
        overflowY: "auto",
      }}>
        <ConfigEditor selected={selected} onDelete={handleDelete} />
      </div>

      <div style={{
        width: 480,
        flexShrink: 0,
        overflow: "hidden",
      }}>
        <AgentDebugPanel />
      </div>
    </div>
  );
}
