import { QueryWorkbench } from "../common/QueryWorkbench";
import type { QueryPresetItem, QueryExample } from "../common/QueryWorkbench";

export type { QueryPresetItem as QueryPreset };

export interface SparqlResult {
  columns: string[];
  rows: Record<string, string>[];
}

export interface SparqlWorkbenchProps {
  onExecute?: (query: string) => Promise<SparqlResult>;
  presets?: QueryPresetItem[];
}

const EXAMPLE_QUERIES: QueryExample[] = [
  {
    label: "All classes",
    query: `SELECT ?class ?label
WHERE {
  ?class a owl:Class .
  OPTIONAL { ?class rdfs:label ?label }
}
ORDER BY ?label
LIMIT 100`,
  },
  {
    label: "All properties",
    query: `SELECT ?prop ?label ?domain ?range
WHERE {
  { ?prop a owl:ObjectProperty } UNION { ?prop a owl:DatatypeProperty }
  OPTIONAL { ?prop rdfs:label ?label }
  OPTIONAL { ?prop rdfs:domain ?domain }
  OPTIONAL { ?prop rdfs:range ?range }
}
ORDER BY ?label
LIMIT 100`,
  },
  {
    label: "Count by type",
    query: `SELECT ?type (COUNT(?s) AS ?count)
WHERE {
  ?s a ?type .
}
GROUP BY ?type
ORDER BY DESC(?count)
LIMIT 50`,
  },
  {
    label: "Sample triples",
    query: `SELECT ?s ?p ?o
WHERE {
  ?s ?p ?o .
}
LIMIT 25`,
  },
  {
    label: "Find by label",
    query: `SELECT ?entity ?label ?type
WHERE {
  ?entity rdfs:label ?label .
  OPTIONAL { ?entity a ?type }
  FILTER(CONTAINS(LCASE(?label), "london"))
}
LIMIT 50`,
  },
];

function shortenUri(uri: string): string {
  const prefixes: Record<string, string> = {
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf:",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs:",
    "http://www.w3.org/2002/07/owl#": "owl:",
    "http://www.w3.org/2001/XMLSchema#": "xsd:",
  };
  for (const [full, short] of Object.entries(prefixes)) {
    if (uri.startsWith(full)) return short + uri.substring(full.length);
  }
  const hash = uri.lastIndexOf("#");
  if (hash > 0 && hash < uri.length - 1) {
    const ns = uri.substring(0, hash + 1);
    const local = uri.substring(hash + 1);
    if (ns.length > 30) return "…:" + local;
  }
  if (uri.length > 60) return "…" + uri.substring(uri.length - 40);
  return uri;
}

export function SparqlWorkbench({ onExecute, presets }: SparqlWorkbenchProps) {
  return (
    <QueryWorkbench<SparqlResult>
      language="SPARQL"
      defaultQuery={EXAMPLE_QUERIES[3].query}
      examples={EXAMPLE_QUERIES}
      presets={presets}
      onExecute={onExecute}
      renderResultsHeader={(result, elapsed) => (
        <span style={{ fontSize: 9, fontFamily: "inherit", color: "inherit" }}>
          {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
          {elapsed !== null && ` · ${(elapsed / 1000).toFixed(2)}s`}
        </span>
      )}
      renderResults={(result, _elapsed, { theme, sz }) => {
        if (result.rows.length === 0) {
          return (
            <div style={{ padding: 32, textAlign: "center", color: theme.text.faint, fontSize: sz(11), fontFamily: theme.font.mono }}>
              Query returned no results.
            </div>
          );
        }

        return (
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: sz(11),
            fontFamily: theme.font.mono,
          }}>
            <thead>
              <tr>
                {result.columns.map(col => (
                  <th key={col} style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    color: theme.palette.cyan,
                    fontWeight: 600,
                    fontSize: sz(10),
                    borderBottom: `1px solid ${theme.border.default}`,
                    position: "sticky",
                    top: 0,
                    background: theme.surface.base,
                    zIndex: 1,
                  }}>
                    ?{col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : theme.surface.card }}>
                  {result.columns.map(col => {
                    const val = row[col] || "";
                    const isUri = val.startsWith("http://") || val.startsWith("https://");
                    return (
                      <td key={col} title={val} style={{
                        padding: "6px 12px",
                        color: isUri ? theme.palette.blue : theme.text.muted,
                        borderBottom: `1px solid ${theme.border.subtle}`,
                        maxWidth: 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {isUri ? shortenUri(val) : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }}
    />
  );
}
