import { useState, useEffect } from "react";
import type { OntologyMetadata } from "@trustgraph/react-state";
import { text, border, surface, palette } from "../../theme";

interface OntologyMetadataEditorProps {
  metadata: OntologyMetadata;
  onUpdateMetadata: (metadata: OntologyMetadata) => void;
}

const labelStyle = { fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" as const, fontWeight: 600 as const, color: text.faint, letterSpacing: "0.1em", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${border.default}`, background: surface.card, color: text.primary, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" as const, outline: "none" };
const hintStyle = { fontSize: 9, color: text.hint, marginTop: 2, marginBottom: 16 };

export function OntologyMetadataEditor({ metadata, onUpdateMetadata }: OntologyMetadataEditorProps) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: text.faint, letterSpacing: "0.1em" }}>METADATA</div>
        {isDirty && (
          <button onClick={handleSave}
            style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${palette.emerald}44`, background: `${palette.emerald}1a`, color: palette.emerald, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
            Save
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 500 }}>
          <div style={labelStyle}>NAME</div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <div style={hintStyle}>Display name for this ontology</div>

          <div style={labelStyle}>DESCRIPTION</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.5 }} />
          <div style={hintStyle}>Purpose and scope of this ontology</div>

          <div style={labelStyle}>VERSION</div>
          <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.0.0" style={inputStyle} />
          <div style={hintStyle}>Version identifier</div>

          <div style={labelStyle}>NAMESPACE URI</div>
          <input type="text" value={namespace} onChange={(e) => setNamespace(e.target.value)} placeholder="e.g. http://example.org/myontology#" style={inputStyle} />
          <div style={hintStyle}>Base URI for all classes and properties in this ontology</div>

          <div style={labelStyle}>CREATOR</div>
          <input type="text" value={creator} onChange={(e) => setCreator(e.target.value)} style={inputStyle} />
          <div style={hintStyle}>Author or organization</div>
        </div>
      </div>
    </div>
  );
}
