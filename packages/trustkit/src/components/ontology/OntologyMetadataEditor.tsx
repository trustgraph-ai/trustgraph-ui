import { useState, useEffect } from "react";
import type { OntologyMetadata } from "@trustgraph/react-state";
import { useTheme } from "../../theme/ThemeContext";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { FormLabel } from "../common/FormLabel";

interface OntologyMetadataEditorProps {
  metadata: OntologyMetadata;
  onUpdateMetadata: (metadata: OntologyMetadata) => void;
}

export function OntologyMetadataEditor({ metadata, onUpdateMetadata }: OntologyMetadataEditorProps) {
  const { theme, sz } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [namespace, setNamespace] = useState("");
  const [creator, setCreator] = useState("");

  useEffect(() => {
    setName(metadata.name || "");
    setDescription(metadata.description || "");
    setVersion(metadata.version || "");
    setNamespace(metadata.namespace || "");
    setCreator(metadata.creator || "");
  }, [metadata]);

  const isDirty = name !== (metadata.name || "") || description !== (metadata.description || "") || version !== (metadata.version || "") || namespace !== (metadata.namespace || "") || creator !== (metadata.creator || "");

  const handleSave = () => {
    onUpdateMetadata({ ...metadata, name: name.trim(), description: description.trim(), version: version.trim(), namespace: namespace.trim(), creator: creator.trim(), modified: new Date().toISOString() });
  };

  const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${theme.border.default}`, background: theme.surface.card, color: theme.text.primary, fontSize: sz(11), fontFamily: theme.font.mono, outline: "none" };
  const hintStyle = { fontSize: sz(9), color: theme.text.hint, marginTop: 2, marginBottom: 16 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <FormLabel marginBottom={0}>METADATA</FormLabel>
        {isDirty && (
          <Button size="lg" onClick={handleSave} color={theme.palette.emerald}>
            Save
          </Button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 500 }}>
          <FormLabel>NAME</FormLabel>
          <Input value={name} onChange={setName} style={{ width: "100%" }} />
          <div style={hintStyle}>Display name for this ontology</div>

          <FormLabel>DESCRIPTION</FormLabel>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
          <div style={hintStyle}>Purpose and scope of this ontology</div>

          <FormLabel>VERSION</FormLabel>
          <Input value={version} onChange={setVersion} placeholder="e.g. 1.0.0" style={{ width: "100%" }} />
          <div style={hintStyle}>Version identifier</div>

          <FormLabel>NAMESPACE URI</FormLabel>
          <Input value={namespace} onChange={setNamespace} placeholder="e.g. http://example.org/myontology#" style={{ width: "100%" }} />
          <div style={hintStyle}>Base URI for all classes and properties in this ontology</div>

          <FormLabel>CREATOR</FormLabel>
          <Input value={creator} onChange={setCreator} style={{ width: "100%" }} />
          <div style={hintStyle}>Author or organization</div>
        </div>
      </div>
    </div>
  );
}
