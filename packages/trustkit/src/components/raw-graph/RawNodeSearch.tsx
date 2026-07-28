import { useState, useRef, useEffect, useCallback } from "react";
import type { RawNode } from "../../hooks/useRawGraphData";
import { useTheme } from "../../theme/ThemeContext";

interface RawNodeSearchProps {
  /** Called with search results when the user types */
  searchNodes: (query: string) => Promise<RawNode[]>;
  /** Called when a result is selected */
  onSelect: (node: RawNode) => void;
  /** Called when a URI is submitted directly */
  onSubmitUri?: (uri: string) => void;
  /** Graph stats text to show below the search input */
  stats?: string;
  /** Whether data is currently being fetched */
  isFetching?: boolean;
}

export function RawNodeSearch({
  searchNodes,
  onSelect,
  onSubmitUri,
  stats,
  isFetching,
}: RawNodeSearchProps) {
  const { theme, sz } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RawNode[]>([]);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build search index on mount
  useEffect(() => {
    searchNodes("").then(() => setReady(true));
  }, [searchNodes]);

  // Update results when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (!ready) return;
    searchNodes(query).then(setResults);
  }, [query, ready, searchNodes]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (q && (q.startsWith("http://") || q.startsWith("https://")) && onSubmitUri) {
      onSubmitUri(q);
    }
  }, [query, onSubmitUri]);

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search input */}
      <div style={{ marginBottom: 12 }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Search..."
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 6,
            border: `1px solid ${theme.border.default}`,
            background: theme.surface.card,
            color: theme.text.primary,
            fontSize: sz(13),
            fontFamily: "'IBM Plex Sans', sans-serif",
            outline: "none",
          }}
        />
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          fontSize: sz(10),
          fontFamily: "'IBM Plex Mono', monospace",
          color: theme.text.hint,
          marginBottom: 12,
          padding: "0 2px",
        }}>
          {stats}
        </div>
      )}

      {/* Loading */}
      {(isFetching || (!ready && query)) && (
        <div style={{
          fontSize: sz(11),
          fontFamily: "'IBM Plex Mono', monospace",
          color: theme.palette.amber,
          marginBottom: 8,
          padding: "0 2px",
        }}>
          loading...
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {results.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelect(node)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              marginBottom: 2,
              borderRadius: 6,
              border: "1px solid transparent",
              background: "transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.surface.cardHover;
              e.currentTarget.style.borderColor = `${node.color}44`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <div style={{
              fontSize: sz(12),
              color: node.color,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              {node.label}
            </div>
          </button>
        ))}
        {query && ready && results.length === 0 && (
          <div style={{
            padding: "20px 4px",
            fontSize: sz(12),
            color: theme.text.hint,
            fontStyle: "italic",
          }}>
            {query.startsWith("http") ? "Press Enter to navigate to this URI" : "No matches"}
          </div>
        )}
        {!query && (
          <div style={{
            padding: "20px 4px",
            fontSize: sz(12),
            color: theme.text.hint,
            fontStyle: "italic",
            lineHeight: 1.6,
          }}>
            Type to search for entities in the graph
          </div>
        )}
      </div>
    </div>
  );
}
