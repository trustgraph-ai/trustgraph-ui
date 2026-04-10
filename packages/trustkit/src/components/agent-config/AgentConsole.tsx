import { useState } from "react";
import { ConfigSidebar } from "./ConfigSidebar";
import { ConfigEditor } from "./ConfigEditor";
import { AgentTestStrip } from "./AgentTestStrip";
import type { SelectedItem } from "./types";
import { border } from "../../theme";

/**
 * Full agent configuration console — sidebar with all 5 config types
 * on the left, editor in the middle, agent test strip across the bottom.
 */
export function AgentConsole() {
  const [selected, setSelected] = useState<SelectedItem | null>(null);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 110px)",
    }}>
      {/* Top: sidebar + editor */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{
          width: 240,
          flexShrink: 0,
          borderRight: `1px solid ${border.default}`,
          overflowY: "auto",
        }}>
          <ConfigSidebar selected={selected} onSelect={setSelected} />
        </div>

        <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          <ConfigEditor selected={selected} />
        </div>
      </div>

      {/* Bottom: agent test strip */}
      <AgentTestStrip />
    </div>
  );
}
