import { useState } from "react";
import { useRawGraphState } from "../../hooks/useRawGraphState";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas } from "./RawGraphCanvas";
import { RawNodeSearch } from "./RawNodeSearch";
import { SplitPane, LoadingState } from "../common";
import { text, palette, border } from "../../theme";

interface RawGraphWithSearchProps {
  startUri?: string;
  onNodeSelect?: (node: RawNode | null) => void;
}

/**
 * Raw graph with a search panel on the left. Search for entities
 * and add them to the graph. No detail panel.
 */
export function RawGraphWithSearch({ startUri, onNodeSelect }: RawGraphWithSearchProps) {
  const {
    visibleNodes, visibleEdges, centerUri, highlightedNodes, stats,
    initialLoading, isError, error, isFetching, searchNodes,
    handleNodeClick, handleNodeNavigate, handleSearchSelect, handleReset,
  } = useRawGraphState({ startUri, onNodeSelect });

  const [showSearch, setShowSearch] = useState(false);

  if (initialLoading) return <LoadingState />;
  if (isError) return <LoadingState variant="error" message={error?.message || "Failed to load graph"} />;

  const searchPanel = showSearch ? (
    <RawNodeSearch
      searchNodes={searchNodes}
      onSelect={handleSearchSelect}
      onSubmitUri={(uri) => handleNodeNavigate(uri)}
      stats={stats}
      isFetching={isFetching}
    />
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            border: `1px solid ${showSearch ? palette.cyan + "44" : border.default}`,
            background: showSearch ? `${palette.cyan}1a` : "transparent",
            color: showSearch ? palette.cyan : text.subtle,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ⌕ Search
        </button>

        {visibleNodes.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: `1px solid ${border.default}`,
              background: "transparent",
              color: text.faint,
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}

        <div style={{ flex: 1 }} />

        <span style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          color: text.hint,
        }}>
          {stats}
        </span>
      </div>

      <SplitPane
        height="calc(100vh - 160px)"
        panelSide="left"
        panelBorder
        panel={searchPanel}
      >
        <RawGraphCanvas
          nodes={visibleNodes}
          edges={visibleEdges}
          centerUri={centerUri}
          highlightedNodes={highlightedNodes}
          activePredicate={null}
          onNodeClick={handleNodeClick}
          onNodeNavigate={handleNodeNavigate}
        />
      </SplitPane>
    </div>
  );
}
