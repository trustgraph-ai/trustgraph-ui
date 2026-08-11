import { useState, useMemo } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { QueryWorkbench } from "../common/QueryWorkbench";
import type { QueryPresetItem, QueryExample } from "../common/QueryWorkbench";

export type { QueryPresetItem as GraphqlPreset };

type ResultView = "raw" | "table";

function extractTable(data: unknown): { columns: string[]; rows: Record<string, unknown>[] } | null {
  if (!data || typeof data !== "object") return null;
  const entries = Object.values(data as Record<string, unknown>);
  let arr: unknown[] | null = null;
  if (Array.isArray(data)) {
    arr = data;
  } else if (entries.length === 1 && Array.isArray(entries[0])) {
    arr = entries[0];
  } else {
    for (const v of entries) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = Object.values(v as Record<string, unknown>);
        if (inner.length === 1 && Array.isArray(inner[0])) {
          arr = inner[0];
          break;
        }
      }
    }
  }
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  const columns = Object.keys(first as Record<string, unknown>);
  if (columns.length === 0) return null;
  return { columns, rows: arr as Record<string, unknown>[] };
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface GraphqlResult {
  data?: unknown;
  errors?: unknown[];
}

export interface GraphqlWorkbenchProps {
  onExecute?: (query: string) => Promise<GraphqlResult>;
  presets?: QueryPresetItem[];
}

const EXAMPLE_QUERIES: QueryExample[] = [
  {
    label: "Introspect types",
    query: `{
  __schema {
    types {
      name
      kind
    }
  }
}`,
  },
  {
    label: "Introspect fields",
    query: `{
  __schema {
    queryType {
      fields {
        name
        type { name kind }
      }
    }
  }
}`,
  },
];

function GraphqlResults({ result }: { result: GraphqlResult }) {
  const { theme, sz } = useTheme();
  const [resultView, setResultView] = useState<ResultView>("table");

  const formattedResult = useMemo(() => {
    if (!result?.data) return null;
    return JSON.stringify(result.data, null, 2);
  }, [result]);

  const tableData = useMemo(() => {
    if (!result?.data) return null;
    return extractTable(result.data);
  }, [result]);

  if (!formattedResult) return null;

  return (
    <>
      {/* View toggle in a sticky bar */}
      <div style={{
        padding: "4px 16px",
        display: "flex",
        justifyContent: "flex-end",
        gap: 2,
      }}>
        {(["table", "raw"] as const).map((v) => (
          <Button key={v} size="sm"
            onClick={() => setResultView(v)}
            active={resultView === v}
            style={{
              padding: "2px 8px",
              borderRadius: 3,
              border: `1px solid ${resultView === v ? theme.border.default : "transparent"}`,
              background: resultView === v ? theme.surface.cardHover : "transparent",
              color: resultView === v ? theme.text.muted : theme.text.hint,
              textTransform: "capitalize",
            }}>
            {v}
          </Button>
        ))}
      </div>

      {resultView === "raw" && (
        <pre style={{
          margin: 0,
          padding: "12px 16px",
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          color: theme.text.muted,
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {formattedResult}
        </pre>
      )}

      {resultView === "table" && tableData && (
        <div style={{ padding: "8px 16px" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: sz(11),
            fontFamily: theme.font.mono,
          }}>
            <thead>
              <tr>
                {tableData.columns.map((col) => (
                  <th key={col} style={{
                    padding: "6px 10px",
                    textAlign: "left",
                    color: theme.text.subtle,
                    fontWeight: 600,
                    borderBottom: `1px solid ${theme.border.default}`,
                    whiteSpace: "nowrap",
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${theme.border.subtle}` }}>
                  {tableData.columns.map((col) => (
                    <td key={col} style={{
                      padding: "5px 10px",
                      color: theme.text.muted,
                      maxWidth: 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resultView === "table" && !tableData && (
        <pre style={{
          margin: 0,
          padding: "12px 16px",
          fontSize: sz(11),
          fontFamily: theme.font.mono,
          color: theme.text.muted,
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {formattedResult}
        </pre>
      )}
    </>
  );
}

export function GraphqlWorkbench({ onExecute, presets }: GraphqlWorkbenchProps) {
  return (
    <QueryWorkbench<GraphqlResult>
      language="GRAPHQL"
      defaultQuery={EXAMPLE_QUERIES[0].query}
      examples={EXAMPLE_QUERIES}
      presets={presets}
      onExecute={onExecute}
      processResponse={(res) => {
        if (res.errors && (res.errors as unknown[]).length > 0) {
          return { error: JSON.stringify(res.errors, null, 2) };
        }
        return {};
      }}
      renderResultsHeader={(result, elapsed) => {
        const table = result.data ? extractTable(result.data) : null;
        return (
          <span style={{ fontSize: 9, fontFamily: "inherit", color: "inherit" }}>
            {elapsed !== null && `${(elapsed / 1000).toFixed(2)}s`}
            {table && ` · ${table.rows.length} rows`}
          </span>
        );
      }}
      renderResults={(result) => (
        <GraphqlResults result={result} />
      )}
    />
  );
}
