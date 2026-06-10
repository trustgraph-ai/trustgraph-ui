import { useState, useCallback } from "react";
import { ConfigSidebar } from "./ConfigSidebar";
import { ConfigEditor } from "./ConfigEditor";
import { AgentDebugPanel } from "./AgentDebugPanel";
import type { SelectedItem } from "./types";
import { border } from "../../theme";

/**
 * Full agent configuration console — three-column layout:
 * config sidebar | editor | debug panel
 */
export function AgentConsole() {
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
      {/* Config sidebar */}
      <div style={{
        width: 240,
        flexShrink: 0,
        borderRight: `1px solid ${border.default}`,
        overflowY: "auto",
      }}>
        <ConfigSidebar selected={selected} onSelect={setSelected} generation={generation} />
      </div>

      {/* Config editor */}
      <div style={{
        flex: 1,
        minWidth: 0,
        borderRight: `1px solid ${border.default}`,
        overflowY: "auto",
      }}>
        <ConfigEditor selected={selected} onDelete={handleDelete} />
      </div>

      {/* Debug panel */}
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
