import { useState } from "react";
import { useTheme, SectionLabel, LoadingState } from "@trustgraph/trustkit";
import { useVowlState } from "./useVowlState";
import { VowlCanvas } from "./VowlCanvas";
import { VowlDetailPanel } from "./VowlDetailPanel";
import { VowlSearch } from "./VowlSearch";

export function VowlViewer() {
  const { theme, sz } = useTheme();
  const {
    schema,
    isLoading,
    isError,
    visibleClasses,
    visibleObjectProperties,
    visibleSubClassRelations,
    visibleDatatypeProperties,
    visibleUris,
    selection,
    setSelection,
    addClass,
    clearDiagram,
    showAll,
    searchClasses,
    relatedClasses,
  } = useVowlState();

  const [showSearch, setShowSearch] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "var(--page-height)", color: theme.text.subtle }}>
        <LoadingState message="Loading ontology…" />
      </div>
    );
  }

  if (isError || !schema) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "var(--page-height)", color: theme.text.subtle, fontFamily: theme.font.mono, fontSize: sz(12) }}>
        No ontology data available.
      </div>
    );
  }

  const btnStyle: React.CSSProperties = {
    background: "none",
    border: `1px solid ${theme.border.default}`,
    borderRadius: sz(6),
    color: theme.text.secondary,
    cursor: "pointer",
    fontFamily: theme.font.mono,
    fontSize: sz(10),
    padding: `${sz(4)}px ${sz(12)}px`,
  };

  const activeBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: `${theme.palette.cyan}22`,
    borderColor: theme.palette.cyan,
    color: theme.palette.cyan,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "var(--page-height)" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: `${sz(8)}px ${sz(20)}px`,
          borderBottom: `1px solid ${theme.border.default}`,
          display: "flex",
          alignItems: "center",
          gap: sz(12),
        }}
      >
        <SectionLabel>VOWL</SectionLabel>

        <button
          style={showSearch ? activeBtnStyle : btnStyle}
          onClick={() => setShowSearch(!showSearch)}
        >
          ◇ Search
        </button>

        <button style={btnStyle} onClick={showAll}>
          Show All
        </button>

        {visibleUris.size > 0 && (
          <button style={btnStyle} onClick={clearDiagram}>
            Clear
          </button>
        )}

        <span
          style={{
            marginLeft: "auto",
            fontSize: sz(10),
            fontFamily: theme.font.mono,
            color: theme.text.hint,
          }}
        >
          {visibleUris.size} / {schema.classes.length} classes
        </span>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {showSearch && (
          <VowlSearch
            searchClasses={searchClasses}
            visibleUris={visibleUris}
            onAddClass={addClass}
            onClose={() => setShowSearch(false)}
          />
        )}

        <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
          <VowlCanvas
            classes={visibleClasses}
            objectProperties={visibleObjectProperties}
            subClassRelations={visibleSubClassRelations}
            datatypeProperties={visibleDatatypeProperties}
            selection={selection}
            onSelect={setSelection}
            onClassDoubleClick={addClass}
          />
        </div>

        {selection && (
          <VowlDetailPanel
            selection={selection}
            schema={schema}
            relatedClasses={relatedClasses}
            visibleUris={visibleUris}
            onAddClass={addClass}
            onClose={() => setSelection(null)}
          />
        )}
      </div>
    </div>
  );
}
