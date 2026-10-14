import { useState, useCallback } from "react";
import { useTheme } from "@trustgraph/trustkit";
import type { OntologyClass } from "@trustgraph/trustkit";

interface VowlSearchProps {
  searchClasses: (query: string) => OntologyClass[];
  visibleUris: Set<string>;
  onAddClass: (uri: string) => void;
  onClose: () => void;
}

export function VowlSearch({ searchClasses, visibleUris, onAddClass, onClose }: VowlSearchProps) {
  const { theme, sz } = useTheme();
  const [query, setQuery] = useState("");
  const results = query.trim() ? searchClasses(query) : [];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  return (
    <div
      style={{
        width: sz(240),
        flexShrink: 0,
        borderRight: `1px solid ${theme.border.default}`,
        background: theme.surface.overlay,
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: `${sz(10)}px ${sz(12)}px`, borderBottom: `1px solid ${theme.border.subtle}` }}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search classes…"
          style={{
            width: "100%",
            background: "transparent",
            border: `1px solid ${theme.border.default}`,
            borderRadius: sz(6),
            padding: `${sz(6)}px ${sz(10)}px`,
            color: theme.text.primary,
            fontFamily: theme.font.mono,
            fontSize: sz(11),
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: `${sz(6)}px 0` }}>
        {results.map((cls) => {
          const alreadyVisible = visibleUris.has(cls.uri);
          return (
            <div
              key={cls.uri}
              onClick={alreadyVisible ? undefined : () => onAddClass(cls.uri)}
              style={{
                padding: `${sz(6)}px ${sz(12)}px`,
                cursor: alreadyVisible ? "default" : "pointer",
                opacity: alreadyVisible ? 0.5 : 1,
                fontSize: sz(11),
                fontFamily: theme.font.sans,
                color: theme.text.secondary,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{cls.label}</span>
              {alreadyVisible ? (
                <span style={{ fontSize: sz(8), color: theme.text.hint, fontFamily: theme.font.mono }}>
                  visible
                </span>
              ) : (
                <span style={{ fontSize: sz(8), color: theme.palette.cyan, fontFamily: theme.font.mono }}>
                  + add
                </span>
              )}
            </div>
          );
        })}
        {query.trim() && results.length === 0 && (
          <div style={{ padding: `${sz(12)}px`, color: theme.text.hint, fontSize: sz(10), fontFamily: theme.font.mono, textAlign: "center" }}>
            No classes found
          </div>
        )}
      </div>
    </div>
  );
}
