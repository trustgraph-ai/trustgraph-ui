import { useState, useEffect } from "react";
import type { OWLObjectProperty, OWLDatatypeProperty, Ontology } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";

interface OntologyPropertyEditorProps {
  propertyId: string;
  property: OWLObjectProperty | OWLDatatypeProperty;
  propertyType: "object" | "datatype";
  ontology: Ontology;
  onUpdateProperty: (id: string, updated: OWLObjectProperty | OWLDatatypeProperty, type: "object" | "datatype") => void;
  onDeleteProperty: (id: string, type: "object" | "datatype") => void;
}

export function OntologyPropertyEditor({ propertyId, property, propertyType, ontology, onUpdateProperty, onDeleteProperty }: OntologyPropertyEditorProps) {
  const { theme, sz } = useTheme();

  const labelStyle = { fontSize: sz(10), fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: theme.text.faint, letterSpacing: "0.1em", marginBottom: 4 };
  const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none" };
  const hintStyle = { fontSize: sz(9), color: theme.text.hint, marginTop: 2, marginBottom: 16 };
  const [labelValue, setLabelValue] = useState("");
  const [comment, setComment] = useState("");
  const [domain, setDomain] = useState("");
  const [range, setRange] = useState("");
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    setLabelValue(property["rdfs:label"]?.[0]?.value || "");
    setComment(property["rdfs:comment"] || "");
    setDomain(property["rdfs:domain"] || "");
    setRange(property["rdfs:range"] || "");
    setFunctional(!!property["owl:functionalProperty"]);
  }, [propertyId, property]);

  const origLabel = property["rdfs:label"]?.[0]?.value || "";
  const origComment = property["rdfs:comment"] || "";
  const origDomain = property["rdfs:domain"] || "";
  const origRange = property["rdfs:range"] || "";
  const origFunctional = !!property["owl:functionalProperty"];
  const isDirty = labelValue !== origLabel || comment !== origComment || domain !== origDomain || range !== origRange || functional !== origFunctional;

  const handleSave = () => {
    const base = {
      ...property,
      "rdfs:label": labelValue.trim() ? [{ value: labelValue.trim(), lang: "en" }] : [],
      "rdfs:comment": comment.trim(),
      "rdfs:domain": domain || undefined,
      "rdfs:range": range || undefined,
      "owl:functionalProperty": functional || undefined,
    };
    onUpdateProperty(propertyId, base as OWLObjectProperty | OWLDatatypeProperty, propertyType);
  };

  const classes = Object.entries(ontology.classes);
  const typeBadgeColor = propertyType === "object" ? theme.palette.blue : theme.palette.purple;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: sz(14), color: theme.text.primary, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{labelValue || propertyId}</div>
            <span style={{ padding: "2px 6px", borderRadius: 3, background: `${typeBadgeColor}1a`, color: typeBadgeColor, fontSize: sz(9), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
              {propertyType === "object" ? "Object" : "Datatype"}
            </span>
          </div>
          <div style={{ fontSize: sz(10), color: theme.text.hint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{property.uri}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <button onClick={handleSave}
              style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${theme.palette.emerald}44`, background: `${theme.palette.emerald}1a`, color: theme.palette.emerald, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
              Save
            </button>
          )}
          <button onClick={() => { if (window.confirm(`Delete ${propertyType} property "${labelValue || propertyId}"?`)) onDeleteProperty(propertyId, propertyType); }}
            style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${theme.palette.red}44`, background: "transparent", color: theme.palette.red, fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 500 }}>
          <div style={labelStyle}>LABEL</div>
          <input type="text" value={labelValue} onChange={(e) => setLabelValue(e.target.value)} style={inputStyle} />
          <div style={hintStyle}>Human-readable name</div>

          <div style={labelStyle}>DESCRIPTION</div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
          <div style={hintStyle}>What this property represents</div>

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />

          <div style={labelStyle}>DOMAIN</div>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Not specified</option>
            {classes.map(([id, cls]) => <option key={id} value={id}>{cls["rdfs:label"]?.[0]?.value || id}</option>)}
          </select>
          <div style={hintStyle}>The class this property belongs to</div>

          <div style={labelStyle}>RANGE</div>
          {propertyType === "object" ? (
            <select value={range} onChange={(e) => setRange(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Not specified</option>
              {classes.map(([id, cls]) => <option key={id} value={id}>{cls["rdfs:label"]?.[0]?.value || id}</option>)}
            </select>
          ) : (
            <input type="text" value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. xsd:string" style={inputStyle} />
          )}
          <div style={hintStyle}>{propertyType === "object" ? "Target class" : "XSD datatype (e.g. xsd:string, xsd:integer)"}</div>

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={functional} onChange={(e) => setFunctional(e.target.checked)} />
            <span style={{ fontSize: sz(11), fontFamily: "'IBM Plex Mono', monospace", color: theme.text.secondary }}>Functional property</span>
          </label>
          <div style={hintStyle}>Each individual can have at most one value for this property</div>
        </div>
      </div>
    </div>
  );
}
