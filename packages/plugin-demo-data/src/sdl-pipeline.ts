import type { ExtractedRow, BulkMetadata } from "@trustgraph/react-provider";

// ── SDL descriptor types ──

interface SdlFormat {
  type: string;
  encoding?: string;
  options?: {
    delimiter?: string;
    has_header?: boolean;
    header?: boolean;
  };
}

interface SdlPreprocessingRule {
  operation: string;
  condition?: string;
  description?: string;
}

interface SdlTransform {
  type: string;
}

interface SdlValidation {
  type: string;
  min?: number;
  max?: number;
}

interface SdlMapping {
  source_field: string;
  target_field: string;
  transforms: SdlTransform[];
  validation: SdlValidation[];
}

interface SdlOutput {
  format?: string;
  schema_name: string;
  options?: {
    confidence?: number;
    batch_size?: number;
  };
  error_handling?: {
    on_validation_error?: string;
    on_transform_error?: string;
    max_errors?: number;
  };
}

export interface SdlDescriptor {
  version?: string;
  metadata?: Record<string, unknown>;
  globals?: Record<string, unknown>;
  format: SdlFormat;
  preprocessing?: SdlPreprocessingRule[];
  mappings: SdlMapping[];
  postprocessing?: unknown[];
  output: SdlOutput;
}

// ── Stage 1: Parse CSV into row objects ──

export function* parseCsvRows(
  text: string,
  delimiter: string = ",",
  hasHeader: boolean = true,
): Generator<Record<string, string>> {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return;

  let headers: string[];
  let startLine: number;

  if (hasHeader) {
    headers = parseCsvLine(lines[0], delimiter);
    startLine = 1;
  } else {
    const firstRow = parseCsvLine(lines[0], delimiter);
    headers = firstRow.map((_, i) => `field_${i + 1}`);
    startLine = 0;
  }

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const values = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    yield row;
  }
}

function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ── Stage 2: Apply preprocessing filters ──

export function* applyPreprocessing(
  rows: Iterable<Record<string, string>>,
  rules: SdlPreprocessingRule[],
): Generator<Record<string, string>> {
  const filters = rules
    .filter((r) => r.operation === "filter" && r.condition)
    .map((r) => compileFilter(r.condition!));

  for (const row of rows) {
    if (filters.every((fn) => fn(row))) {
      yield row;
    }
  }
}

function compileFilter(
  condition: string,
): (row: Record<string, string>) => boolean {
  // Handle "NOT (field IS NULL)" pattern
  const notNullMatch = condition.match(
    /^NOT\s*\(\s*(\w+)\s+IS\s+NULL\s*\)$/i,
  );
  if (notNullMatch) {
    const field = notNullMatch[1];
    return (row) => row[field] != null && row[field] !== "";
  }

  // Handle "field IS NOT NULL" pattern
  const isNotNullMatch = condition.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    const field = isNotNullMatch[1];
    return (row) => row[field] != null && row[field] !== "";
  }

  // Default: pass through
  return () => true;
}

// ── Stage 3: Apply field mappings and transforms ──

export function* applyMappings(
  rows: Iterable<Record<string, string>>,
  mappings: SdlMapping[],
  onError?: (msg: string) => void,
): Generator<Record<string, string>> {
  let rowNum = 0;

  for (const row of rows) {
    rowNum++;
    const out: Record<string, string> = {};
    let valid = true;

    for (const mapping of mappings) {
      const sourceField = mapping.source_field;
      const targetField = mapping.target_field;

      if (!(sourceField in row)) continue;

      let value: string | number | null = row[sourceField];

      // Apply transforms
      for (const transform of mapping.transforms) {
        switch (transform.type) {
          case "trim":
            if (typeof value === "string") value = value.trim();
            break;
          case "upper":
            if (typeof value === "string") value = value.toUpperCase();
            break;
          case "lower":
            if (typeof value === "string") value = value.toLowerCase();
            break;
          case "title_case":
            if (typeof value === "string")
              value = value.replace(
                /\w\S*/g,
                (w) => w[0].toUpperCase() + w.slice(1).toLowerCase(),
              );
            break;
          case "to_integer":
          case "to_int":
            if (value === "" || value == null) {
              value = null;
            } else {
              const n = parseInt(String(value), 10);
              if (isNaN(n)) {
                onError?.(
                  `Row ${rowNum}: failed to convert '${value}' to int for ${sourceField}`,
                );
                value = null;
              } else {
                value = n;
              }
            }
            break;
          case "to_float":
            if (value === "" || value == null) {
              value = null;
            } else {
              const f = parseFloat(String(value));
              if (isNaN(f)) {
                onError?.(
                  `Row ${rowNum}: failed to convert '${value}' to float for ${sourceField}`,
                );
                value = null;
              } else {
                value = f;
              }
            }
            break;
        }
      }

      // Apply validation
      for (const rule of mapping.validation) {
        switch (rule.type) {
          case "required":
            if (value == null || value === "") {
              onError?.(
                `Row ${rowNum}: required field '${sourceField}' is empty`,
              );
              valid = false;
            }
            break;
          case "range":
            if (value != null && typeof value === "number") {
              if (rule.min != null && value < rule.min) valid = false;
              if (rule.max != null && value > rule.max) valid = false;
            }
            break;
        }
      }

      out[targetField] = value != null ? String(value) : "";
    }

    if (valid) yield out;
  }
}

// ── Stage 4: Format as ExtractedRow objects ──

export function* formatExtractedRows(
  rows: Iterable<Record<string, string>>,
  schemaName: string,
  collection: string,
  confidence: number,
): Generator<ExtractedRow> {
  let n = 0;
  const metadata: BulkMetadata = {
    id: "",
    metadata: [],
    collection,
  };

  for (const values of rows) {
    n++;
    yield {
      metadata: { ...metadata, id: `parsed-${n}` },
      schema_name: schemaName,
      values,
      confidence,
      source_span: "",
    };
  }
}

// ── Compose full pipeline from descriptor ──

export function buildSdlPipeline(
  csvText: string,
  descriptor: SdlDescriptor,
  collection: string = "default",
  onError?: (msg: string) => void,
): Generator<ExtractedRow> {
  const fmt = descriptor.format;
  const delimiter = fmt.options?.delimiter ?? ",";
  const hasHeader = fmt.options?.has_header ?? fmt.options?.header ?? true;

  const schemaName = descriptor.output.schema_name;
  const confidence = descriptor.output.options?.confidence ?? 0.9;

  const rows = parseCsvRows(csvText, delimiter, hasHeader);
  const filtered = applyPreprocessing(
    rows,
    descriptor.preprocessing ?? [],
  );
  const mapped = applyMappings(filtered, descriptor.mappings, onError);
  return formatExtractedRows(mapped, schemaName, collection, confidence);
}
