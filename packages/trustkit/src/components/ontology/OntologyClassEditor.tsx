import { useState, useEffect } from "react";
import type { OWLClass, Ontology } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { FormLabel } from "../common/FormLabel";

interface OntologyClassEditorProps {
  classId: string;
  owlClass: OWLClass;
  ontology: Ontology;
  onUpdateClass: (classId: string, updated: OWLClass) => void;
  onDeleteClass: (classId: string) => void;
}

export function OntologyClassEditor({ classId, owlClass, ontology, onUpdateClass, onDeleteClass }: OntologyClassEditorProps) {
  const { theme, sz } = useTheme();

  const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: theme.font.mono, outline: "none" };
  const hintStyle = { fontSize: sz(9), color: theme.text.hint, marginTop: 2 };
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
          <div style={{ fontSize: sz(14), color: theme.text.primary, fontFamily: theme.font.mono, fontWeight: 600 }}>{labelValue || classId}</div>
          <div style={{ fontSize: sz(10), color: theme.text.hint, fontFamily: theme.font.mono, marginTop: 2 }}>{owlClass.uri}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <Button size="lg" onClick={handleSave} color={theme.palette.emerald}>
              Save
            </Button>
          )}
          <Button size="lg" onClick={() => { if (window.confirm(`Delete class "${labelValue || classId}"?`)) onDeleteClass(classId); }}
            color={theme.palette.red} active={false}
            style={{ border: `1px solid ${theme.palette.red}44`, color: theme.palette.red }}>
            Delete
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 500 }}>
          <FormLabel>LABEL</FormLabel>
          <Input value={labelValue} onChange={setLabelValue} style={{ width: "100%" }} />
          <div style={{ ...hintStyle, marginBottom: 16 }}>Human-readable name for this class</div>

          <FormLabel>DESCRIPTION</FormLabel>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
          <div style={{ ...hintStyle, marginBottom: 16 }}>Brief description of what this class represents</div>

          <FormLabel>URI</FormLabel>
          <input type="text" value={owlClass.uri} readOnly style={{ ...inputStyle, color: theme.text.subtle, background: "transparent" }} />
          <div style={{ ...hintStyle, marginBottom: 16 }}>Unique identifier (read-only)</div>

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />

          <FormLabel>SUBCLASS OF</FormLabel>
          <Select value={subClassOf} onChange={setSubClassOf} style={{ width: "100%" }}>
            <option value="">None (top-level class)</option>
            {otherClasses.map(([id, cls]) => (
              <option key={id} value={id}>{cls["rdfs:label"]?.[0]?.value || id}</option>
            ))}
          </Select>
          <div style={{ ...hintStyle, marginBottom: 16 }}>Parent class in the hierarchy</div>

          {domainProperties.length > 0 && (
            <>
              <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />
              <FormLabel>PROPERTIES USING THIS CLASS AS DOMAIN</FormLabel>
              {domainProperties.map((p) => (
                <div key={p.id} style={{ padding: "4px 8px", marginBottom: 2, borderRadius: 4, background: theme.surface.card, fontSize: sz(11), fontFamily: theme.font.mono, color: theme.text.secondary, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "1px 4px", borderRadius: 2, background: p.kind === "object" ? `${theme.palette.blue}1a` : `${theme.palette.purple}1a`, color: p.kind === "object" ? theme.palette.blue : theme.palette.purple, fontSize: sz(8), fontWeight: 600 }}>
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
