import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { SearchInput, SearchPreset, SectionLabel, Toolbar, EmptyState } from "../common";
import { StreamingResponse } from "./StreamingResponse";
import { SourceLinkBadge } from "./SourceLinkBadge";
import { SourcePanel } from "./SourcePanel";
import { useGraphRag } from "../../hooks/useGraphRag";
import { useExplainSession } from "../../hooks/useExplainSession";
import { useExplainEventFetcher } from "../../hooks/useExplainEventFetcher";
import type { ProvenanceChain } from "../../hooks/useExplainEventFetcher";
import { useSourceDocument } from "../../hooks/useSourceDocument";
import { useTheme } from "../../theme/ThemeContext";
import { useSettings } from "@trustgraph/react-state";

interface RagWithSourcesViewProps {
  collection?: string;
  presets?: SearchPreset[];
}

/**
 * Option 2: RAG with Source Summary.
 * Answer on the left, source citations on the right.
 * Clicking a source shows chunk text.
 */
export function RagWithSourcesView({ collection: collectionProp, presets }: RagWithSourcesViewProps) {
  const { theme, sz } = useTheme();
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const explainSession = useExplainSession();
  const { query, response, isQuerying, error } = useGraphRag({
    collection,
    onExplain: explainSession.addEvent,
  });
  useExplainEventFetcher(explainSession.events, explainSession.updateEvent);
  const { source, loadSource, close: closeSource } = useSourceDocument();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = useCallback((q: string) => {
    if (!q.trim() || isQuerying) return;
    explainSession.reset();
    closeSource();
    setInput("");
    query(q);
  }, [query, isQuerying, explainSession, closeSource]);

  // Extract unique sources from focus events, collapsed to document level
  const sources = useMemo(() => {
    const allSources: ProvenanceChain[] = [];
    const seenDocs = new Set<string>();

    for (const event of explainSession.events) {
      if (event.eventType !== "focus" || !event.data) continue;
      const d = event.data as Record<string, unknown>;
      const edgeSelections = (d.edgeSelections as Array<{
        edgeUri: string;
        edge?: { s: string; p: string; o: string };
        edgeLabels?: { s: string; p: string; o: string };
        sources?: ProvenanceChain[];
      }>) || [];

      for (const sel of edgeSelections) {
        if (!sel.sources) continue;
        for (const src of sel.sources) {
          if (src.chain.length === 0) continue;
          const docUri = src.chain[src.chain.length - 1].uri;
          if (!seenDocs.has(docUri)) {
            seenDocs.add(docUri);
            allSources.push(src);
          }
        }
      }
    }
    return allSources;
  }, [explainSession.events]);

  const handleSourceClick = useCallback((src: ProvenanceChain) => {
    if (src.chain.length === 0) return;
    const chunkUri = src.chain[0].uri;
    const docUri = src.chain[src.chain.length - 1].uri;
    loadSource(chunkUri, docUri);
  }, [loadSource]);

  return (
    <div style={{ display: "flex", height: "var(--page-height)" }}>
      {/* Left: Query + Response */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: `1px solid ${theme.border.default}` }}>
        <Toolbar>
          <SectionLabel marginBottom={12}>GRAPH RAG QUERY</SectionLabel>
          <SearchInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit(input)}
            placeholder="Ask a question..."
            buttonText="Query"
            isLoading={isQuerying}
            buttonColor={theme.palette.cyan}
          presets={presets}
          />
        </Toolbar>

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {!response && !isQuerying && !error && (
            <EmptyState message="Ask a question to get an answer with source citations." />
          )}

          <StreamingResponse
            text={response}
            isStreaming={isQuerying}
            error={error}
          />
          <div ref={scrollRef} />
        </div>

        {source && <SourcePanel source={source} onClose={closeSource} />}
      </div>

      {/* Right: Sources */}
      <div style={{ width: 320, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px", borderBottom: `1px solid ${theme.border.default}` }}>
          <SectionLabel>
            SOURCES
            {sources.length > 0 && (
              <span style={{ color: theme.text.muted, fontWeight: 400, marginLeft: 8 }}>
                {sources.length}
              </span>
            )}
          </SectionLabel>
        </div>
        <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto" }}>
          {sources.length === 0 && !isQuerying && (
            <div style={{ color: theme.text.hint, fontSize: sz(12), fontStyle: "italic" }}>
              Sources will appear here after a query.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sources.map((src, i) => (
              <SourceLinkBadge key={i} source={src} onClick={handleSourceClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
