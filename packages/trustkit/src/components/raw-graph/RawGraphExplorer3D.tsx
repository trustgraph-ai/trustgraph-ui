import { useState } from "react";
import { useRawGraphState } from "../../hooks/useRawGraphState";
import type { RawNode } from "../../hooks/useRawGraphData";
import { RawGraphCanvas3D } from "./RawGraphCanvas3D";
import { RawNodeDetailPanel } from "./RawNodeDetailPanel";
import { RawNodeSearch } from "./RawNodeSearch";
import { SplitPane, LoadingState } from "../common";
import { text, palette, border } from "../../theme";

interface RawGraphExplorer3DProps {
  startUri?: string;
  onNodeSelect?: (node: RawNode | null) => void;
}

/**
 * Full 3D raw graph explorer — search panel on the left, detail panel
 * on the right, 3D force-directed canvas in the middle.
 */
export function RawGraphExplorer3D({ startUri, onNodeSelect }: RawGraphExplorer3DProps) {
  const {
    visibleNodes, visibleEdges, centerUri, selectedNode, highlightedNodes, stats,
    initialLoading, isError, error, isFetching, searchNodes,
    handleNodeClick, handleNodeNavigate, handleSearchSelect, handleClose, handleReset,
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

  const detailPanel = selectedNode ? (
    <RawNodeDetailPanel
      uri={selectedNode.id}
      nodeColor={selectedNode.color}
      onClose={handleClose}
      onNodeNavigate={handleNodeNavigate}
    />
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
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

        {isFetching && !showSearch && (
          <span style={{
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: palette.amber,
          }}>
            loading...
          </span>
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
        <SplitPane
          height="100%"
          panelSide="right"
          panelBorder
          panel={detailPanel}
        >
          {visibleNodes.length > 0 ? (
            <RawGraphCanvas3D
              nodes={visibleNodes}
              edges={visibleEdges}
              centerUri={centerUri}
              highlightedNodes={highlightedNodes}
              activePredicate={null}
              onNodeClick={handleNodeClick}
              onNodeNavigate={handleNodeNavigate}
            />
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: text.hint,
              fontSize: 13,
              fontStyle: "italic",
            }}>
              Open search to find entities
            </div>
          )}
        </SplitPane>
      </SplitPane>
    </div>
  );
}
