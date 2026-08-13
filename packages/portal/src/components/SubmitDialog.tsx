import { useState, useEffect } from "react";
import { SectionLabel, Badge, useTheme, withGlow } from "@trustgraph/trustkit";
import { useFlows, useFlowBlueprints, useFlowParameters, useCollections } from "@trustgraph/react-state";

export interface SubmitParams {
  flowId: string;
  collection: string;
  newFlow?: {
    id: string;
    blueprintName: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  newCollection?: {
    id: string;
    name: string;
    description: string;
    tags: string[];
  };
}

interface SubmitDialogProps {
  documentTitle: string;
  documentId: string;
  onSubmit: (params: SubmitParams) => void;
  onCancel: () => void;
}

type Step = "flow" | "collection" | "confirm";

export function SubmitDialog({ documentTitle, onSubmit, onCancel }: SubmitDialogProps) {
  const { theme, sz } = useTheme();
  const [step, setStep] = useState<Step>("flow");

  // Flow selection
  const { flows } = useFlows();
  const { flowBlueprints } = useFlowBlueprints();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [creatingFlow, setCreatingFlow] = useState(false);

  // New flow form
  const [newFlowBlueprint, setNewFlowBlueprint] = useState<string | null>(null);
  const [newFlowId, setNewFlowId] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [newFlowParams, setNewFlowParams] = useState<Record<string, unknown>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Flow parameters for new flow
  const { parameterDefinitions, parameterMapping, parameterMetadata } = useFlowParameters(newFlowBlueprint || undefined);

  // Apply defaults when blueprint changes — skip controlled-by params
  // so they inherit from their controller
  useEffect(() => {
    if (parameterMapping && parameterDefinitions && parameterMetadata) {
      const defaults: Record<string, unknown> = {};
      Object.entries(parameterMapping).forEach(([flowParamName, defName]) => {
        // Skip parameters that are controlled by another — they should inherit
        if (parameterMetadata[flowParamName]?.["controlled-by"]) return;
        const schema = parameterDefinitions[defName];
        if (schema?.default !== undefined) {
          defaults[flowParamName] = schema.default;
        }
      });
      if (Object.keys(defaults).length > 0) {
        setNewFlowParams(prev => ({ ...defaults, ...prev }));
      }
    }
  }, [parameterDefinitions, parameterMapping, parameterMetadata]);

  // Collection selection
  const { collections } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [creatingCollection, setCreatingCollection] = useState(false);

  // New collection form
  const [newCollId, setNewCollId] = useState("");
  const [newCollName, setNewCollName] = useState("");
  const [newCollDescription, setNewCollDescription] = useState("");
  const [newCollTags, setNewCollTags] = useState<string[]>([]);

  const flowList = (flows || []) as any[];
  const bpList = (flowBlueprints || []) as any[];
  const collList = (collections || []) as any[];

  const handleConfirm = () => {
    const flowId = creatingFlow ? newFlowId : selectedFlowId!;
    const collection = creatingCollection ? newCollId : selectedCollection!;

    const params: SubmitParams = { flowId, collection };

    if (creatingFlow && newFlowBlueprint) {
      // Build resolved parameters
      const resolvedParams: Record<string, unknown> = {};
      if (parameterMapping) {
        Object.keys(parameterMapping).forEach(paramName => {
          let value = newFlowParams[paramName];
          if (value === undefined || value === "") {
            const meta = parameterMetadata?.[paramName];
            if (meta?.["controlled-by"]) {
              value = newFlowParams[meta["controlled-by"]];
            }
          }
          if (value === undefined || value === "") {
            const schema = parameterDefinitions?.[parameterMapping[paramName]];
            value = schema?.default ?? "";
          }
          resolvedParams[paramName] = value;
        });
      }
      params.newFlow = {
        id: newFlowId,
        blueprintName: newFlowBlueprint,
        description: newFlowDescription,
        parameters: resolvedParams,
      };
    }

    if (creatingCollection) {
      params.newCollection = {
        id: newCollId,
        name: newCollName,
        description: newCollDescription,
        tags: newCollTags,
      };
    }

    onSubmit(params);
  };

  const stepIndicator = (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
      {(["flow", "collection", "confirm"] as Step[]).map((s) => {
        const labels = { flow: "1. Flow", collection: "2. Collection", confirm: "3. Confirm" };
        const isActive = s === step;
        const isDone = (s === "flow" && (step === "collection" || step === "confirm")) ||
                       (s === "collection" && step === "confirm");
        return (
          <div
            key={s}
            onClick={isDone ? () => setStep(s) : undefined}
            style={{
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              fontWeight: 600,
              color: isActive ? theme.palette.cyan : isDone ? theme.palette.emerald : theme.text.disabled,
              cursor: isDone ? "pointer" : "default",
              padding: "4px 10px",
              borderRadius: 4,
              background: isActive ? withGlow(theme.palette.cyan, 0.1) : "transparent",
            }}
          >
            {isDone ? "✓ " : ""}{labels[s]}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: sz(11), fontFamily: theme.font.mono, color: theme.palette.amber, fontWeight: 600, marginBottom: 4 }}>
            SUBMIT FOR PROCESSING
          </div>
          <div style={{ fontSize: sz(14), fontWeight: 700, color: theme.text.primary }}>
            {documentTitle}
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", color: theme.text.faint, cursor: "pointer", fontSize: sz(18) }}
        >
          ×
        </button>
      </div>

      {stepIndicator}

      {/* Step 1: Choose Flow */}
      {step === "flow" && !creatingFlow && (
        <div>
          <SectionLabel marginBottom={12}>SELECT FLOW</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {flowList.map((flow: any) => {
              const id = flow.id || flow["flow-id"];
              const desc = flow.description || "";
              const bp = flow.blueprint || flow["blueprint-name"] || "";
              return (
                <div
                  key={id}
                  onClick={() => { setSelectedFlowId(id); setCreatingFlow(false); setStep("collection"); }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border.default}`,
                    background: theme.surface.card,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = theme.palette.amber + "88"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = theme.border.default; }}
                >
                  <div style={{ fontSize: sz(13), fontWeight: 600, color: theme.palette.amber }}>{id}</div>
                  {desc && <div style={{ fontSize: sz(11), color: theme.text.subtle, marginTop: 2 }}>{desc}</div>}
                  {bp && <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.faint, marginTop: 2 }}>blueprint: {bp}</div>}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setCreatingFlow(true)}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 6,
              fontSize: sz(11),
              fontFamily: theme.font.mono,
              fontWeight: 600,
              cursor: "pointer",
              background: "transparent",
              border: `1px dashed ${theme.border.medium}`,
              color: theme.text.muted,
              width: "100%",
            }}
          >
            + Start New Flow
          </button>
        </div>
      )}

      {/* Step 1b: Create New Flow */}
      {step === "flow" && creatingFlow && (
        <div>
          <SectionLabel marginBottom={12}>NEW FLOW</SectionLabel>

          {/* Blueprint selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.faint, marginBottom: 6, letterSpacing: "0.05em" }}>BLUEPRINT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {bpList.map((bp: any) => {
                const id = bp.id || bp[0];
                const data = bp[1] || bp;
                const desc = data?.description || "";
                const isSelected = newFlowBlueprint === id;
                return (
                  <div
                    key={id}
                    onClick={() => { setNewFlowBlueprint(id); setNewFlowParams({}); }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${isSelected ? theme.palette.amber + "88" : theme.border.default}`,
                      background: isSelected ? withGlow(theme.palette.amber, 0.08) : theme.surface.card,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: sz(12), fontWeight: 600, color: isSelected ? theme.palette.amber : theme.text.secondary }}>{id}</div>
                    {desc && <div style={{ fontSize: sz(10), color: theme.text.faint, marginTop: 2 }}>{desc}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flow ID and description */}
          {newFlowBlueprint && (
            <>
              <InputField label="FLOW ID" value={newFlowId} onChange={setNewFlowId} placeholder="e.g. my-flow" />
              <InputField label="DESCRIPTION" value={newFlowDescription} onChange={setNewFlowDescription} placeholder="What this flow does..." />

              {/* Parameters */}
              {parameterMapping && Object.keys(parameterMapping).length > 0 && (() => {
                const sorted = Object.entries(parameterMapping)
                  .sort(([a], [b]) => (parameterMetadata?.[a]?.order || 999) - (parameterMetadata?.[b]?.order || 999));
                const basicParams = sorted.filter(([name]) => !parameterMetadata?.[name]?.advanced);
                const advancedParams = sorted.filter(([name]) => parameterMetadata?.[name]?.advanced);

                const renderParam = ([flowParamName, defName]: [string, string]) => {
                  const schema = parameterDefinitions?.[defName];
                  const meta = parameterMetadata?.[flowParamName];
                  if (!schema) return null;

                  const label = meta?.description || flowParamName;
                  const value = newFlowParams[flowParamName] ?? schema.default ?? "";
                  const controlledBy = meta?.["controlled-by"];
                  const isInheriting = controlledBy && (newFlowParams[flowParamName] === undefined || newFlowParams[flowParamName] === "");

                  // Enum → select
                  if (schema.enum && schema.enum.length > 0) {
                    return (
                      <div key={flowParamName} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.faint, marginBottom: 4 }}>
                          {label}
                          {isInheriting && <span style={{ color: theme.text.disabled, marginLeft: 6 }}>(from {controlledBy})</span>}
                        </div>
                        <select
                          value={String(value)}
                          onChange={(e) => setNewFlowParams(prev => ({ ...prev, [flowParamName]: e.target.value }))}
                          style={{
                            width: "100%", padding: "6px 10px", fontSize: sz(11),
                            fontFamily: theme.font.mono,
                            color: theme.text.primary, background: theme.surface.base,
                            border: `1px solid ${theme.border.medium}`, borderRadius: 6, outline: "none",
                          }}
                        >
                          {(schema.enum as any[]).map((opt: any) => {
                            const optId = typeof opt === "object" ? opt.id : opt;
                            const optDesc = typeof opt === "object" ? opt.description : opt;
                            return <option key={optId} value={optId}>{optDesc}</option>;
                          })}
                        </select>
                      </div>
                    );
                  }

                  // Default → text input
                  return (
                    <InputField
                      key={flowParamName}
                      label={`${label}${isInheriting ? ` (from ${controlledBy})` : ""}`}
                      value={String(value)}
                      onChange={(v) => setNewFlowParams(prev => ({ ...prev, [flowParamName]: v }))}
                      placeholder={schema.placeholder || ""}
                      small
                    />
                  );
                };

                return (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.faint, marginBottom: 8, letterSpacing: "0.05em" }}>PARAMETERS</div>
                    {basicParams.map(renderParam)}

                    {advancedParams.length > 0 && (
                      <>
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: sz(10), fontFamily: theme.font.mono,
                            color: theme.text.muted, padding: "6px 0", marginTop: 4,
                          }}
                        >
                          {showAdvanced ? "▾" : "▸"} Advanced ({advancedParams.length})
                        </button>
                        {showAdvanced && (
                          <div style={{
                            paddingLeft: 12,
                            borderLeft: `2px solid ${theme.border.default}`,
                            marginTop: 4,
                          }}>
                            {advancedParams.map(renderParam)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              <button
                onClick={() => { setStep("collection"); }}
                disabled={!newFlowId.trim() || !newFlowBlueprint}
                style={{
                  marginTop: 12, width: "100%", padding: "8px 14px", borderRadius: 6,
                  fontSize: sz(12), fontWeight: 600, cursor: (!newFlowId.trim() || !newFlowBlueprint) ? "not-allowed" : "pointer",
                  background: theme.palette.amber + "20", border: `1px solid ${theme.palette.amber}66`,
                  color: theme.palette.amber, opacity: (!newFlowId.trim() || !newFlowBlueprint) ? 0.4 : 1,
                }}
              >
                Next →
              </button>

              <button
                onClick={() => { setCreatingFlow(false); setNewFlowBlueprint(null); }}
                style={{
                  marginTop: 6, width: "100%", padding: "6px 14px", borderRadius: 6,
                  fontSize: sz(11), cursor: "pointer", background: "transparent",
                  border: `1px solid ${theme.border.default}`, color: theme.text.muted,
                }}
              >
                ← Back to existing flows
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Choose Collection */}
      {step === "collection" && !creatingCollection && (
        <div>
          <SectionLabel marginBottom={12}>SELECT COLLECTION</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Always show "default" */}
            {(() => {
              const allColls = new Set<string>(["default"]);
              for (const c of collList) {
                const name = c.collection || c.name || c.id;
                if (name) allColls.add(name);
              }
              return Array.from(allColls).sort().map(name => (
                <div
                  key={name}
                  onClick={() => { setSelectedCollection(name); setCreatingCollection(false); setStep("confirm"); }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border.default}`,
                    background: theme.surface.card,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = theme.palette.emerald + "88"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = theme.border.default; }}
                >
                  <div style={{ fontSize: sz(13), fontWeight: 600, color: theme.palette.emerald }}>{name}</div>
                </div>
              ));
            })()}
          </div>
          <button
            onClick={() => setCreatingCollection(true)}
            style={{
              marginTop: 12, padding: "8px 14px", borderRadius: 6,
              fontSize: sz(11), fontFamily: theme.font.mono, fontWeight: 600,
              cursor: "pointer", background: "transparent",
              border: `1px dashed ${theme.border.medium}`, color: theme.text.muted, width: "100%",
            }}
          >
            + Create New Collection
          </button>
          <button
            onClick={() => setStep("flow")}
            style={{
              marginTop: 6, width: "100%", padding: "6px 14px", borderRadius: 6,
              fontSize: sz(11), cursor: "pointer", background: "transparent",
              border: `1px solid ${theme.border.default}`, color: theme.text.muted,
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 2b: Create New Collection */}
      {step === "collection" && creatingCollection && (
        <div>
          <SectionLabel marginBottom={12}>NEW COLLECTION</SectionLabel>
          <InputField label="ID" value={newCollId} onChange={setNewCollId} placeholder="e.g. my-collection" />
          <InputField label="NAME" value={newCollName} onChange={setNewCollName} placeholder="Human-readable name" />
          <InputField label="DESCRIPTION" value={newCollDescription} onChange={setNewCollDescription} placeholder="What this collection contains..." />

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, color: theme.text.faint, marginBottom: 4, letterSpacing: "0.05em" }}>TAGS</div>
            <input
              type="text"
              placeholder="Add tag, press Enter..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !newCollTags.includes(val)) {
                    setNewCollTags(prev => [...prev, val]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
              style={{
                width: "100%", padding: "6px 10px", fontSize: sz(11),
                fontFamily: theme.font.sans,
                color: theme.text.primary, background: "transparent",
                border: `1px solid ${theme.border.medium}`, borderRadius: 6, outline: "none",
              }}
            />
            {newCollTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {newCollTags.map((tag, i) => (
                  <Badge key={i} color={theme.palette.emerald} size="small"
                    onClick={() => setNewCollTags(prev => prev.filter((_, j) => j !== i))}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => { setSelectedCollection(newCollId); setStep("confirm"); }}
            disabled={!newCollId.trim()}
            style={{
              width: "100%", padding: "8px 14px", borderRadius: 6,
              fontSize: sz(12), fontWeight: 600, cursor: !newCollId.trim() ? "not-allowed" : "pointer",
              background: theme.palette.emerald + "20", border: `1px solid ${theme.palette.emerald}66`,
              color: theme.palette.emerald, opacity: !newCollId.trim() ? 0.4 : 1,
            }}
          >
            Next →
          </button>

          <button
            onClick={() => { setCreatingCollection(false); }}
            style={{
              marginTop: 6, width: "100%", padding: "6px 14px", borderRadius: 6,
              fontSize: sz(11), cursor: "pointer", background: "transparent",
              border: `1px solid ${theme.border.default}`, color: theme.text.muted,
            }}
          >
            ← Back to existing collections
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div>
          <SectionLabel marginBottom={12}>CONFIRM</SectionLabel>

          <div style={{
            padding: "16px",
            borderRadius: 8,
            background: theme.surface.card,
            border: `1px solid ${theme.border.default}`,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: sz(11), fontFamily: theme.font.mono, marginBottom: 10 }}>
              <span style={{ color: theme.text.faint }}>Document: </span>
              <span style={{ color: theme.palette.cyan }}>{documentTitle}</span>
            </div>
            <div style={{ fontSize: sz(11), fontFamily: theme.font.mono, marginBottom: 10 }}>
              <span style={{ color: theme.text.faint }}>Flow: </span>
              <span style={{ color: theme.palette.amber }}>{creatingFlow ? `${newFlowId} (new)` : selectedFlowId}</span>
            </div>
            <div style={{ fontSize: sz(11), fontFamily: theme.font.mono }}>
              <span style={{ color: theme.text.faint }}>Collection: </span>
              <span style={{ color: theme.palette.emerald }}>{creatingCollection ? `${newCollId} (new)` : selectedCollection}</span>
            </div>
          </div>

          {creatingFlow && (
            <div style={{ fontSize: sz(10), color: theme.text.subtle, marginBottom: 8 }}>
              Will create flow "{newFlowId}" using blueprint "{newFlowBlueprint}"
            </div>
          )}
          {creatingCollection && (
            <div style={{ fontSize: sz(10), color: theme.text.subtle, marginBottom: 8 }}>
              Will create collection "{newCollId}"
            </div>
          )}

          <button
            onClick={handleConfirm}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: 8,
              fontSize: sz(13), fontWeight: 600, cursor: "pointer",
              background: theme.palette.cyan + "20", border: `1px solid ${theme.palette.cyan}66`,
              color: theme.palette.cyan,
            }}
          >
            Submit for Processing
          </button>

          <button
            onClick={() => setStep("collection")}
            style={{
              marginTop: 6, width: "100%", padding: "6px 14px", borderRadius: 6,
              fontSize: sz(11), cursor: "pointer", background: "transparent",
              border: `1px solid ${theme.border.default}`, color: theme.text.muted,
            }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

// Simple input field helper
function InputField({ label, value, onChange, placeholder, small }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; small?: boolean;
}) {
  const { theme, sz } = useTheme();
  return (
    <div style={{ marginBottom: small ? 8 : 12 }}>
      <div style={{
        fontSize: sz(10), fontFamily: theme.font.mono,
        color: theme.text.faint, marginBottom: 4, letterSpacing: "0.05em",
      }}>
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: small ? "5px 8px" : "6px 10px",
          fontSize: sz(small ? 11 : 12),
          fontFamily: theme.font.sans,
          color: theme.text.primary, background: "transparent",
          border: `1px solid ${theme.border.medium}`, borderRadius: 6, outline: "none",
        }}
      />
    </div>
  );
}
