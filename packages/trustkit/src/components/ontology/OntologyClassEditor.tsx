import { useState, useEffect } from "react";
import type { OWLClass, Ontology } from "@trustgraph/react-state";
import { text, border, surface, palette } from "../../theme";

interface OntologyClassEditorProps {
  classId: string;
  owlClass: OWLClass;
  ontology: Ontology;
  onUpdateClass: (classId: string, updated: OWLClass) => void;
  onDeleteClass: (classId: string) => void;
}

const labelStyle = { fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: text.faint, letterSpacing: "0.1em", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none" };
const readOnlyStyle = { ...inputStyle, color: text.subtle, background: "transparent" };
const hintStyle = { fontSize: 9, color: text.hint, marginTop: 2 };

export function OntologyClassEditor({ classId, owlClass, ontology, onUpdateClass, onDeleteClass }: OntologyClassEditorProps) {
  const [labelValue, setLabelValue] = useState("");
  const [comment, setComment] = useState("");
  const [subClassOf, setSubClassOf] = useState("");

  useEffect(() => {
    setLabelValue(owlClass["rdfs:label"]?.[0]?.value || "");
    setComment(owlClass["rdfs:comment"] || "");
    setSubClassOf(owlClass["rdfs:subClassOf"] || "");
  }, [classId, owlClass]);

  const origLabel = owlClass["rdfs:label"]?.[0]?.value || "";
  const origComment = owlClass["rdfs:comment"] || "";
  const origSubClassOf = owlClass["rdfs:subClassOf"] || "";
  const isDirty = labelValue !== origLabel || comment !== origComment || subClassOf !== origSubClassOf;

  const handleSave = () => {
    const updated: OWLClass = {
      ...owlClass,
      "rdfs:label": labelValue.trim() ? [{ value: labelValue.trim(), lang: "en" }] : [],
      "rdfs:comment": comment.trim(),
      "rdfs:subClassOf": subClassOf || undefined,
    };
    onUpdateClass(classId, updated);
  };

  const otherClasses = Object.entries(ontology.classes).filter(([id]) => id !== classId);
  const domainProperties = [
    ...Object.entries(ontology.objectProperties).filter(([, p]) => p["rdfs:domain"] === classId).map(([id, p]) => ({ id, label: p["rdfs:label"]?.[0]?.value || id, kind: "object" as const })),
    ...Object.entries(ontology.datatypeProperties).filter(([, p]) => p["rdfs:domain"] === classId).map(([id, p]) => ({ id, label: p["rdfs:label"]?.[0]?.value || id, kind: "datatype" as const })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: text.primary, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{labelValue || classId}</div>
          <div style={{ fontSize: 10, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{owlClass.uri}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <button onClick={handleSave}
              style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${palette.emerald}44`, background: `${palette.emerald}1a`, color: palette.emerald, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
              Save
            </button>
          )}
          <button onClick={() => { if (window.confirm(`Delete class "${labelValue || classId}"?`)) onDeleteClass(classId); }}
            style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${palette.red}44`, background: "transparent", color: palette.red, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 500 }}>
          <div style={labelStyle}>LABEL</div>
          <input type="text" value={labelValue} onChange={(e) => setLabelValue(e.target.value)} style={inputStyle} />
          <div style={{ ...hintStyle, marginBottom: 16 }}>Human-readable name for this class</div>

          <div style={labelStyle}>DESCRIPTION</div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
          <div style={{ ...hintStyle, marginBottom: 16 }}>Brief description of what this class represents</div>

          <div style={labelStyle}>URI</div>
          <input type="text" value={owlClass.uri} readOnly style={readOnlyStyle} />
          <div style={{ ...hintStyle, marginBottom: 16 }}>Unique identifier (read-only)</div>

          <div style={{ borderTop: `1px solid ${border.subtle}`, margin: "8px 0 16px" }} />

          <div style={labelStyle}>SUBCLASS OF</div>
          <select value={subClassOf} onChange={(e) => setSubClassOf(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">None (top-level class)</option>
            {otherClasses.map(([id, cls]) => (
              <option key={id} value={id}>{cls["rdfs:label"]?.[0]?.value || id}</option>
            ))}
          </select>
          <div style={{ ...hintStyle, marginBottom: 16 }}>Parent class in the hierarchy</div>

          {domainProperties.length > 0 && (
            <>
              <div style={{ borderTop: `1px solid ${border.subtle}`, margin: "8px 0 16px" }} />
              <div style={labelStyle}>PROPERTIES USING THIS CLASS AS DOMAIN</div>
              {domainProperties.map((p) => (
                <div key={p.id} style={{ padding: "4px 8px", marginBottom: 2, borderRadius: 4, background: surface.card, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: text.secondary, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "1px 4px", borderRadius: 2, background: p.kind === "object" ? `${palette.blue}1a` : `${palette.purple}1a`, color: p.kind === "object" ? palette.blue : palette.purple, fontSize: 8, fontWeight: 600 }}>
                    {p.kind === "object" ? "OBJ" : "DT"}
                  </span>
                  {p.label}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
