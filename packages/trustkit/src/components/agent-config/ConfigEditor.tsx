import { useState, useEffect } from "react";
import { useConfigItem } from "../../hooks/useConfigItem";
import { useConfigItems } from "../../hooks/useConfigItems";
import { useMcpToolInvoke } from "../../hooks/useMcpToolInvoke";
import type { SelectedItem, AgentPattern, AgentTaskType, AgentTool, ToolArgument, McpTool, ToolService } from "./types";
import { LoadingState } from "../common";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { FormLabel } from "../common/FormLabel";

interface ConfigEditorProps {
  selected: SelectedItem | null;
  onDelete?: () => void;
}

export function ConfigEditor({ selected, onDelete }: ConfigEditorProps) {
  const { theme, sz } = useTheme();

  if (!selected) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: theme.text.hint,
        fontSize: sz(13),
        fontStyle: "italic",
      }}>
        Select an item from the sidebar
      </div>
    );
  }

  return <Editor selected={selected} onDelete={onDelete} key={`${selected.kind}-${selected.key}`} />;
}

function Editor({ selected, onDelete }: { selected: SelectedItem; onDelete?: () => void }) {
  const { theme, sz } = useTheme();
  const { data, isLoading, error, save, isSaving, saveError, remove } = useConfigItem(
    selected.kind,
    selected.key,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const ok = await remove();
    setIsDeleting(false);
    if (ok && onDelete) onDelete();
  };

  if (isLoading) return <LoadingState />;
  if (error) return <LoadingState variant="error" message={error} />;
  if (!data) return null;

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div>
          <FormLabel style={{ color: kindColor(selected.kind, theme.palette) }}>
            {kindLabel(selected.kind)}
          </FormLabel>
          <div style={{
            fontSize: sz(18),
            fontWeight: 700,
            color: theme.text.primary,
          }}>
            {selected.key}
          </div>
        </div>
        <Button size="md" onClick={handleDelete} disabled={isDeleting}
          color={theme.palette.rose} active={false}
          style={{ border: `1px solid ${theme.palette.rose}33`, color: theme.palette.rose }}>
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      {selected.kind === "agent-pattern" && (
        <PatternFields data={data as AgentPattern} onSave={save} isSaving={isSaving} saveError={saveError} />
      )}
      {selected.kind === "agent-task-type" && (
        <TaskTypeFields data={data as AgentTaskType} onSave={save} isSaving={isSaving} saveError={saveError} />
      )}
      {selected.kind === "tool" && (
        <ToolFields data={data as AgentTool} onSave={save} isSaving={isSaving} saveError={saveError} />
      )}
      {selected.kind === "mcp" && (
        <McpToolFields data={data as McpTool} onSave={save} isSaving={isSaving} saveError={saveError} itemKey={selected.key} />
      )}
      {selected.kind === "tool-service" && (
        <ToolServiceFields data={data as ToolService} onSave={save} isSaving={isSaving} saveError={saveError} />
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function kindColor(kind: string, p: { cyan: string; amber: string; emerald: string; purple: string; pink: string }): string {
  const colors: Record<string, string> = {
    "agent-pattern": p.cyan,
    "agent-task-type": p.amber,
    "tool": p.emerald,
    "mcp": p.purple,
    "tool-service": p.pink,
  };
  return colors[kind] || p.cyan;
}

function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    "agent-pattern": "PATTERN",
    "agent-task-type": "TASK TYPE",
    "tool": "TOOL",
    "mcp": "MCP TOOL",
    "tool-service": "TOOL SERVICE",
  };
  return labels[kind] || kind;
}

interface FieldsProps<T> {
  data: T;
  onSave: (updated: T) => void;
  isSaving?: boolean;
  saveError?: string | null;
}

// ── Common form primitives ───────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FormLabel>{label.toUpperCase()}</FormLabel>
      {children}
    </div>
  );
}

function TextArea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const { theme, sz } = useTheme();
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: 6,
        border: `1px solid ${theme.border.default}`,
        background: theme.surface.card,
        color: theme.text.primary,
        fontSize: sz(12),
        fontFamily: theme.font.sans,
        lineHeight: 1.5,
        outline: "none",
        resize: "vertical",
      }}
    />
  );
}

function SaveButton({ onClick, isDirty, isSaving, saveError }: { onClick: () => void; isDirty: boolean; isSaving?: boolean; saveError?: string | null }) {
  const { theme, sz } = useTheme();
  return (
    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
      <Button size="lg" onClick={onClick} disabled={!isDirty || isSaving}
        color={theme.palette.emerald} active={isDirty}>
        {isSaving ? "Saving..." : "Save"}
      </Button>
      {saveError && (
        <span style={{ fontSize: sz(11), color: theme.palette.red }}>{saveError}</span>
      )}
    </div>
  );
}

// ── Pattern fields ───────────────────────────────────────────────

function PatternFields({ data, onSave, isSaving, saveError }: FieldsProps<AgentPattern>) {
  const [name, setName] = useState(data.name || "");
  const [description, setDescription] = useState(data.description || "");
  const [maxIterations, setMaxIterations] = useState(data.max_iterations || 10);

  useEffect(() => {
    setName(data.name || "");
    setDescription(data.description || "");
    setMaxIterations(data.max_iterations || 10);
  }, [data]);

  const isDirty = name !== data.name || description !== data.description || maxIterations !== data.max_iterations;

  return (
    <>
      <Field label="Name"><Input value={name} onChange={setName} style={{ width: "100%" }} /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} rows={4} /></Field>
      <Field label="Max Iterations">
        <Input value={String(maxIterations)} onChange={(v) => setMaxIterations(parseInt(v, 10) || 0)} style={{ width: 100 }} />
      </Field>
      <SaveButton
        onClick={() => onSave({ ...data, name, description, max_iterations: maxIterations })}
        isDirty={isDirty}
        isSaving={isSaving}
        saveError={saveError}
      />
    </>
  );
}

// ── Task Type fields ─────────────────────────────────────────────

function TaskTypeFields({ data, onSave, isSaving, saveError }: FieldsProps<AgentTaskType>) {
  const { theme } = useTheme();
  const [name, setName] = useState(data.name || "");
  const [description, setDescription] = useState(data.description || "");
  const [framing, setFraming] = useState(data.framing || "");
  const [validPatterns, setValidPatterns] = useState<string[]>(data.valid_patterns || []);

  const { keys: patternKeys } = useConfigItems("agent-pattern");

  useEffect(() => {
    setName(data.name || "");
    setDescription(data.description || "");
    setFraming(data.framing || "");
    setValidPatterns(data.valid_patterns || []);
  }, [data]);

  const togglePattern = (p: string) => {
    setValidPatterns(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const isDirty =
    name !== data.name ||
    description !== data.description ||
    framing !== data.framing ||
    JSON.stringify(validPatterns) !== JSON.stringify(data.valid_patterns || []);

  return (
    <>
      <Field label="Name"><Input value={name} onChange={setName} style={{ width: "100%" }} /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} rows={3} /></Field>
      <Field label="Framing"><TextArea value={framing} onChange={setFraming} rows={4} placeholder="Text injected into the agent prompt for this task type" /></Field>
      <Field label="Valid Patterns">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {patternKeys.map(p => (
            <Button key={p} size="md" onClick={() => togglePattern(p)}
              color={theme.palette.cyan} active={validPatterns.includes(p)}>
              {p}
            </Button>
          ))}
        </div>
      </Field>
      <SaveButton
        onClick={() => onSave({ ...data, name, description, framing, valid_patterns: validPatterns })}
        isDirty={isDirty}
        isSaving={isSaving}
        saveError={saveError}
      />
    </>
  );
}

// ── Tool fields ──────────────────────────────────────────────────

const TOOL_TYPES = [
  "knowledge-query",
  "text-completion",
  "structured-query",
  "row-embeddings-query",
  "mcp-tool",
  "prompt",
  "tool-service",
];

type ArgsMode = "fields" | "json";

function ToolFields({ data, onSave, isSaving, saveError }: FieldsProps<AgentTool>) {
  const { theme, sz } = useTheme();
  const [name, setName] = useState(data.name || "");
  const [description, setDescription] = useState(data.description || "");
  const [type, setType] = useState(data.type || "knowledge-query");
  const [collection, setCollection] = useState(data.collection || "");
  const [templateId, setTemplateId] = useState(data.template_id || "");
  const [mcpToolId, setMcpToolId] = useState(data.mcp_tool_id || "");
  const [service, setService] = useState(data.service || "");
  const [argsJson, setArgsJson] = useState(JSON.stringify(data.arguments || [], null, 2));
  const [argsFields, setArgsFields] = useState<ToolArgument[]>(data.arguments || []);
  const [argsMode, setArgsMode] = useState<ArgsMode>("fields");

  useEffect(() => {
    setName(data.name || "");
    setDescription(data.description || "");
    setType(data.type || "knowledge-query");
    setCollection(data.collection || "");
    setTemplateId(data.template_id || "");
    setMcpToolId(data.mcp_tool_id || "");
    setService(data.service || "");
    setArgsJson(JSON.stringify(data.arguments || [], null, 2));
    setArgsFields(data.arguments || []);
  }, [data]);

  const currentArgs = (): ToolArgument[] => {
    if (argsMode === "fields") return argsFields;
    try { return JSON.parse(argsJson); } catch { return []; }
  };

  const isDirty =
    name !== data.name ||
    description !== data.description ||
    type !== data.type ||
    collection !== (data.collection || "") ||
    templateId !== (data.template_id || "") ||
    mcpToolId !== (data.mcp_tool_id || "") ||
    service !== (data.service || "") ||
    JSON.stringify(currentArgs()) !== JSON.stringify(data.arguments || []);

  const handleSave = () => {
    const parsedArgs = currentArgs();
    const updated: AgentTool = { ...data, name, description, type, arguments: parsedArgs };
    if (collection) updated.collection = collection;
    if (templateId) updated.template_id = templateId;
    if (mcpToolId) updated.mcp_tool_id = mcpToolId;
    if (service) updated.service = service;
    onSave(updated);
  };

  const switchArgsMode = (mode: ArgsMode) => {
    if (mode === argsMode) return;
    if (mode === "json") {
      setArgsJson(JSON.stringify(argsFields, null, 2));
    } else {
      try { setArgsFields(JSON.parse(argsJson)); } catch { /* keep current */ }
    }
    setArgsMode(mode);
  };

  const updateArg = (index: number, field: keyof ToolArgument, value: string) => {
    setArgsFields(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const addArg = () => {
    setArgsFields(prev => [...prev, { name: "", type: "string", description: "" }]);
  };

  const removeArg = (index: number) => {
    setArgsFields(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Field label="Name"><Input value={name} onChange={setName} style={{ width: "100%" }} /></Field>
      <Field label="Description"><TextArea value={description} onChange={setDescription} rows={3} placeholder="Shown to the LLM" /></Field>
      <Field label="Type">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TOOL_TYPES.map(t => (
            <Button key={t} size="sm" onClick={() => setType(t)}
              color={theme.palette.emerald} active={type === t}>
              {t}
            </Button>
          ))}
        </div>
      </Field>

      {/* Type-specific fields */}
      {type === "knowledge-query" && (
        <Field label="Collection"><Input value={collection} onChange={setCollection} style={{ width: "100%" }} /></Field>
      )}
      {type === "prompt" && (
        <Field label="Template ID"><Input value={templateId} onChange={setTemplateId} placeholder="e.g. extract-definitions" style={{ width: "100%" }} /></Field>
      )}
      {type === "mcp-tool" && (
        <Field label="MCP Tool ID"><Input value={mcpToolId} onChange={setMcpToolId} style={{ width: "100%" }} /></Field>
      )}
      {type === "tool-service" && (
        <Field label="Service ID"><Input value={service} onChange={setService} style={{ width: "100%" }} /></Field>
      )}

      <Field label="Arguments">
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {(["fields", "json"] as const).map(mode => (
            <Button key={mode} size="sm" onClick={() => switchArgsMode(mode)}
              active={argsMode === mode}>
              {mode === "fields" ? "Fields" : "JSON"}
            </Button>
          ))}
        </div>

        {argsMode === "json" && (
          <textarea
            value={argsJson}
            onChange={(e) => setArgsJson(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: 140,
              padding: 10,
              borderRadius: 6,
              border: `1px solid ${theme.border.default}`,
              background: theme.surface.card,
              color: theme.text.primary,
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              lineHeight: 1.5,
              outline: "none",
              resize: "vertical",
            }}
          />
        )}

        {argsMode === "fields" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {argsFields.map((arg, i) => (
              <div key={i} style={{
                padding: "10px 12px",
                borderRadius: 6,
                border: `1px solid ${theme.border.default}`,
                background: theme.surface.card,
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 2 }}>
                    <FormLabel>{`NAME`}</FormLabel>
                    <Input value={arg.name} onChange={(v) => updateArg(i, "name", v)}
                      placeholder="arg_name" style={{ width: "100%", background: "transparent" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FormLabel>{`TYPE`}</FormLabel>
                    <Input value={arg.type} onChange={(v) => updateArg(i, "type", v)}
                      placeholder="string" style={{ width: "100%", background: "transparent" }} />
                  </div>
                  <Button size="sm" onClick={() => removeArg(i)}
                    color={theme.palette.rose} active={false}
                    style={{ alignSelf: "flex-end", border: `1px solid ${theme.palette.rose}33`, color: theme.palette.rose }}>
                    ×
                  </Button>
                </div>
                <div>
                  <FormLabel>{`DESCRIPTION`}</FormLabel>
                  <Input value={arg.description} onChange={(v) => updateArg(i, "description", v)}
                    placeholder="What this argument does..." style={{ width: "100%", background: "transparent" }} />
                </div>
              </div>
            ))}
            <Button size="md" onClick={addArg}
              color={theme.palette.cyan} active={false}
              style={{ alignSelf: "flex-start", border: `1px solid ${theme.palette.cyan}33`, color: theme.palette.cyan }}>
              + Add argument
            </Button>
          </div>
        )}
      </Field>

      <SaveButton onClick={handleSave} isDirty={isDirty} isSaving={isSaving} saveError={saveError} />
    </>
  );
}

// ── MCP Tool fields ──────────────────────────────────────────────

function McpToolFields({ data, onSave, isSaving, saveError, itemKey }: FieldsProps<McpTool> & { itemKey: string }) {
  const [remoteName, setRemoteName] = useState(data["remote-name"] || "");
  const [url, setUrl] = useState(data.url || "");
  const [authToken, setAuthToken] = useState(data["auth-token"] || "");

  useEffect(() => {
    setRemoteName(data["remote-name"] || "");
    setUrl(data.url || "");
    setAuthToken(data["auth-token"] || "");
  }, [data]);

  const isDirty =
    remoteName !== (data["remote-name"] || "") ||
    url !== data.url ||
    authToken !== (data["auth-token"] || "");

  return (
    <>
      <Field label="Remote Name"><Input value={remoteName} onChange={setRemoteName} style={{ width: "100%" }} /></Field>
      <Field label="URL"><Input value={url} onChange={setUrl} placeholder="https://..." style={{ width: "100%" }} /></Field>
      <Field label="Auth Token"><Input value={authToken} onChange={setAuthToken} placeholder="optional" style={{ width: "100%" }} /></Field>
      <SaveButton
        onClick={() => onSave({ "remote-name": remoteName, url, ...(authToken && { "auth-token": authToken }) })}
        isDirty={isDirty}
        isSaving={isSaving}
        saveError={saveError}
      />

      {/* Test panel */}
      <McpToolTester toolKey={itemKey} />
    </>
  );
}

function McpToolTester({ toolKey }: { toolKey: string }) {
  const { theme, sz } = useTheme();
  const [paramsJson, setParamsJson] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { response, error, isInvoking, invoke, reset } = useMcpToolInvoke();

  const handleRun = () => {
    try {
      const parsed = JSON.parse(paramsJson);
      setJsonError(null);
      invoke(toolKey, parsed);
    } catch {
      setJsonError("Invalid JSON");
    }
  };

  return (
    <div style={{
      marginTop: 32,
      paddingTop: 20,
      borderTop: `1px solid ${theme.border.default}`,
    }}>
      <FormLabel style={{ marginBottom: 12 }}>TEST</FormLabel>

      <Field label="Parameters (JSON)">
        <textarea
          value={paramsJson}
          onChange={(e) => { setParamsJson(e.target.value); setJsonError(null); }}
          spellCheck={false}
          placeholder='{"query": "weather in london"}'
          style={{
            width: "100%",
            height: 90,
            padding: 10,
            borderRadius: 6,
            border: `1px solid ${jsonError ? theme.palette.red + "44" : theme.border.default}`,
            background: theme.surface.card,
            color: theme.text.primary,
            fontSize: sz(11),
            fontFamily: theme.font.mono,
            lineHeight: 1.5,
            outline: "none",
            resize: "vertical",
          }}
        />
        {jsonError && (
          <div style={{ fontSize: sz(10), color: theme.palette.red, marginTop: 4 }}>{jsonError}</div>
        )}
      </Field>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Button size="md" onClick={handleRun} disabled={isInvoking}
          color={theme.palette.purple} active={!isInvoking}>
          {isInvoking ? "Running..." : "Run"}
        </Button>
        {(response || error) && (
          <Button size="md" onClick={reset} active={false}>
            Clear
          </Button>
        )}
      </div>

      {/* Result */}
      {(response || error || isInvoking) && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          border: `1px solid ${theme.border.default}`,
          background: theme.surface.card,
          minHeight: 80,
        }}>
          {error && (
            <div style={{
              fontSize: sz(11),
              color: theme.palette.red,
              fontFamily: theme.font.mono,
            }}>
              {error}
            </div>
          )}
          {response !== null && response !== undefined && (
            <pre style={{
              margin: 0,
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              color: theme.text.primary,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {typeof response === "string" ? response : JSON.stringify(response, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tool Service fields ──────────────────────────────────────────

function ToolServiceFields({ data, onSave, isSaving, saveError }: FieldsProps<ToolService>) {
  const { theme, sz } = useTheme();
  const [requestQueue, setRequestQueue] = useState(data["request-queue"] || "");
  const [responseQueue, setResponseQueue] = useState(data["response-queue"] || "");
  const [paramsJson, setParamsJson] = useState(JSON.stringify(data["config-params"] || [], null, 2));

  useEffect(() => {
    setRequestQueue(data["request-queue"] || "");
    setResponseQueue(data["response-queue"] || "");
    setParamsJson(JSON.stringify(data["config-params"] || [], null, 2));
  }, [data]);

  const isDirty =
    requestQueue !== data["request-queue"] ||
    responseQueue !== data["response-queue"] ||
    paramsJson !== JSON.stringify(data["config-params"] || [], null, 2);

  const handleSave = () => {
    let params: any[] = [];
    try { params = JSON.parse(paramsJson); } catch { /* ignore */ }
    onSave({ ...data, "request-queue": requestQueue, "response-queue": responseQueue, "config-params": params });
  };

  return (
    <>
      <Field label="Request Queue"><Input value={requestQueue} onChange={setRequestQueue} placeholder="non-persistent://tg/request/..." style={{ width: "100%" }} /></Field>
      <Field label="Response Queue"><Input value={responseQueue} onChange={setResponseQueue} placeholder="non-persistent://tg/response/..." style={{ width: "100%" }} /></Field>
      <Field label="Config Params (JSON)">
        <textarea
          value={paramsJson}
          onChange={(e) => setParamsJson(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            height: 100,
            padding: 10,
            borderRadius: 6,
            border: `1px solid ${theme.border.default}`,
            background: theme.surface.card,
            color: theme.text.primary,
            fontSize: sz(11),
            fontFamily: theme.font.mono,
            lineHeight: 1.5,
            outline: "none",
            resize: "vertical",
          }}
        />
      </Field>
      <SaveButton onClick={handleSave} isDirty={isDirty} isSaving={isSaving} saveError={saveError} />
    </>
  );
}
