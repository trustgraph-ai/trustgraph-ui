import { useState, useEffect } from "react";
import type { OWLObjectProperty, OWLDatatypeProperty, Ontology } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { FormLabel } from "../common/FormLabel";

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

  const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: theme.font.mono, outline: "none" };
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
            <div style={{ fontSize: sz(14), color: theme.text.primary, fontFamily: theme.font.mono, fontWeight: 600 }}>{labelValue || propertyId}</div>
            <span style={{ padding: "2px 6px", borderRadius: 3, background: `${typeBadgeColor}1a`, color: typeBadgeColor, fontSize: sz(9), fontFamily: theme.font.mono, fontWeight: 600 }}>
              {propertyType === "object" ? "Object" : "Datatype"}
            </span>
          </div>
          <div style={{ fontSize: sz(10), color: theme.text.hint, fontFamily: theme.font.mono, marginTop: 2 }}>{property.uri}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <Button size="lg" onClick={handleSave} color={theme.palette.emerald}>
              Save
            </Button>
          )}
          <Button size="lg" onClick={() => { if (window.confirm(`Delete ${propertyType} property "${labelValue || propertyId}"?`)) onDeleteProperty(propertyId, propertyType); }}
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
          <div style={hintStyle}>Human-readable name</div>

          <FormLabel>DESCRIPTION</FormLabel>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
          <div style={hintStyle}>What this property represents</div>

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />

          <FormLabel>DOMAIN</FormLabel>
          <Select value={domain} onChange={setDomain} style={{ width: "100%" }}>
            <option value="">Not specified</option>
            {classes.map(([id, cls]) => <option key={id} value={id}>{cls["rdfs:label"]?.[0]?.value || id}</option>)}
          </Select>
          <div style={hintStyle}>The class this property belongs to</div>

          <FormLabel>RANGE</FormLabel>
          {propertyType === "object" ? (
            <Select value={range} onChange={setRange} style={{ width: "100%" }}>
              <option value="">Not specified</option>
              {classes.map(([id, cls]) => <option key={id} value={id}>{cls["rdfs:label"]?.[0]?.value || id}</option>)}
            </Select>
          ) : (
            <Input value={range} onChange={setRange} placeholder="e.g. xsd:string" style={{ width: "100%" }} />
          )}
          <div style={hintStyle}>{propertyType === "object" ? "Target class" : "XSD datatype (e.g. xsd:string, xsd:integer)"}</div>

          <div style={{ borderTop: `1px solid ${theme.border.subtle}`, margin: "8px 0 16px" }} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={functional} onChange={(e) => setFunctional(e.target.checked)} />
            <span style={{ fontSize: sz(11), fontFamily: theme.font.mono, color: theme.text.secondary }}>Functional property</span>
          </label>
          <div style={hintStyle}>Each individual can have at most one value for this property</div>
        </div>
      </div>
    </div>
  );
}
