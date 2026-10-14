import { useTheme } from "@trustgraph/trustkit";
import type { OntologyClass, OntologySchema } from "@trustgraph/trustkit";
import type { VowlSelection } from "./types";

interface VowlDetailPanelProps {
  selection: VowlSelection;
  schema: OntologySchema;
  relatedClasses: OntologyClass[];
  visibleUris: Set<string>;
  onAddClass: (uri: string) => void;
  onClose: () => void;
}

function getLocalName(uri: string): string {
  const i = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  return i >= 0 ? uri.substring(i + 1) : uri;
}

export function VowlDetailPanel({
  selection,
  schema,
  relatedClasses,
  visibleUris,
  onAddClass,
  onClose,
}: VowlDetailPanelProps) {
  const { theme, sz } = useTheme();

  if (!selection) return null;

  const sectionStyle: React.CSSProperties = {
    marginBottom: sz(14),
  };

  const headingStyle: React.CSSProperties = {
    fontSize: sz(9),
    fontFamily: theme.font.mono,
    color: theme.text.subtle,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: sz(6),
  };

  const itemStyle: React.CSSProperties = {
    fontSize: sz(11),
    fontFamily: theme.font.sans,
    color: theme.text.secondary,
    padding: `${sz(3)}px 0`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const addBtnStyle: React.CSSProperties = {
    background: "none",
    border: `1px solid ${theme.border.default}`,
    borderRadius: sz(4),
    color: theme.palette.cyan,
    cursor: "pointer",
    fontFamily: theme.font.mono,
    fontSize: sz(8),
    padding: `${sz(2)}px ${sz(6)}px`,
  };

  const tagStyle = (color: string): React.CSSProperties => ({
    fontSize: sz(8),
    fontFamily: theme.font.mono,
    color,
    border: `1px solid ${color}44`,
    borderRadius: sz(3),
    padding: `${sz(1)}px ${sz(6)}px`,
    display: "inline-block",
    marginBottom: sz(8),
  });

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: sz(280),
    borderLeft: `1px solid ${theme.border.default}`,
    background: theme.surface.overlay,
    backdropFilter: "blur(12px)",
    overflowY: "auto",
    padding: sz(16),
    zIndex: 10,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: sz(12),
  };

  const closeBtn = (
    <button
      onClick={onClose}
      style={{
        background: "none",
        border: "none",
        color: theme.text.subtle,
        cursor: "pointer",
        fontSize: sz(14),
      }}
    >
      ✕
    </button>
  );

  // ── Class detail ──────────────────────────────────────────────
  if (selection.type === "class") {
    const cls = schema.classes.find((c) => c.uri === selection.uri);
    if (!cls) return null;

    const outgoing = schema.objectProperties.filter((p) => p.domain === cls.uri);
    const incoming = schema.objectProperties.filter((p) => p.range === cls.uri);
    const dataProps = schema.datatypeProperties.filter((p) => p.domain === cls.uri);

    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <span style={tagStyle("#1f77b4")}>CLASS</span>
            <div style={{ fontSize: sz(14), fontWeight: 600, color: theme.text.primary, fontFamily: theme.font.sans }}>
              {cls.label}
            </div>
            <div style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.hint, marginTop: sz(2) }}>
              {getLocalName(cls.uri)}
            </div>
          </div>
          {closeBtn}
        </div>

        {cls.comment && (
          <div style={{ ...sectionStyle, fontSize: sz(11), color: theme.text.secondary, fontStyle: "italic", lineHeight: 1.4 }}>
            {cls.comment}
          </div>
        )}

        {outgoing.length > 0 && (
          <div style={sectionStyle}>
            <div style={headingStyle}>Outgoing Relationships</div>
            {outgoing.map((p) => (
              <div key={p.uri} style={itemStyle}>
                <span>
                  <span style={{ color: theme.text.subtle }}>→</span>{" "}
                  {p.label}
                  {p.range && (
                    <span style={{ color: theme.text.hint }}> → {getLocalName(p.range)}</span>
                  )}
                </span>
                {p.range && !visibleUris.has(p.range) && (
                  <button style={addBtnStyle} onClick={() => onAddClass(p.range!)}>+ add</button>
                )}
              </div>
            ))}
          </div>
        )}

        {incoming.length > 0 && (
          <div style={sectionStyle}>
            <div style={headingStyle}>Incoming Relationships</div>
            {incoming.map((p) => (
              <div key={p.uri} style={itemStyle}>
                <span>
                  <span style={{ color: theme.text.subtle }}>←</span>{" "}
                  {p.label}
                  {p.domain && (
                    <span style={{ color: theme.text.hint }}> ← {getLocalName(p.domain)}</span>
                  )}
                </span>
                {p.domain && !visibleUris.has(p.domain) && (
                  <button style={addBtnStyle} onClick={() => onAddClass(p.domain!)}>+ add</button>
                )}
              </div>
            ))}
          </div>
        )}

        {dataProps.length > 0 && (
          <div style={sectionStyle}>
            <div style={headingStyle}>Datatype Properties</div>
            {dataProps.map((p) => (
              <div key={p.uri} style={itemStyle}>
                <span>{p.label}</span>
                <span style={{ fontSize: sz(9), color: theme.text.hint, fontFamily: theme.font.mono }}>
                  {p.range ? getLocalName(p.range) : "literal"}
                </span>
              </div>
            ))}
          </div>
        )}

        {relatedClasses.filter((c) => !visibleUris.has(c.uri)).length > 0 && (
          <div style={sectionStyle}>
            <div style={headingStyle}>Add Related Classes</div>
            {relatedClasses
              .filter((c) => !visibleUris.has(c.uri))
              .map((c) => (
                <div key={c.uri} style={itemStyle}>
                  <span>{c.label}</span>
                  <button style={addBtnStyle} onClick={() => onAddClass(c.uri)}>+ add</button>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  // ── Object property detail ────────────────────────────────────
  if (selection.type === "objectProperty") {
    const prop = schema.objectProperties.find((p) => p.uri === selection.uri);
    if (!prop) return null;

    const domainClass = prop.domain ? schema.classes.find((c) => c.uri === prop.domain) : undefined;
    const rangeClass = prop.range ? schema.classes.find((c) => c.uri === prop.range) : undefined;

    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <span style={tagStyle("#1f77b4")}>OBJECT PROPERTY</span>
            <div style={{ fontSize: sz(14), fontWeight: 600, color: theme.text.primary, fontFamily: theme.font.sans }}>
              {prop.label}
            </div>
            <div style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.hint, marginTop: sz(2) }}>
              {getLocalName(prop.uri)}
            </div>
          </div>
          {closeBtn}
        </div>

        <div style={sectionStyle}>
          <div style={headingStyle}>Domain → Range</div>
          <div style={{ ...itemStyle, flexDirection: "column", alignItems: "flex-start", gap: sz(4) }}>
            <div>
              <span style={{ color: theme.text.subtle }}>Domain: </span>
              <span style={{ color: theme.text.primary }}>
                {domainClass ? domainClass.label : prop.domain ? getLocalName(prop.domain) : "—"}
              </span>
              {prop.domain && !visibleUris.has(prop.domain) && (
                <button style={{ ...addBtnStyle, marginLeft: sz(6) }} onClick={() => onAddClass(prop.domain!)}>+ add</button>
              )}
            </div>
            <div>
              <span style={{ color: theme.text.subtle }}>Range: </span>
              <span style={{ color: theme.text.primary }}>
                {rangeClass ? rangeClass.label : prop.range ? getLocalName(prop.range) : "—"}
              </span>
              {prop.range && !visibleUris.has(prop.range) && (
                <button style={{ ...addBtnStyle, marginLeft: sz(6) }} onClick={() => onAddClass(prop.range!)}>+ add</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Datatype property detail ──────────────────────────────────
  if (selection.type === "datatypeProperty") {
    const prop = schema.datatypeProperties.find((p) => p.uri === selection.uri);
    if (!prop) return null;

    const domainClass = prop.domain ? schema.classes.find((c) => c.uri === prop.domain) : undefined;

    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <span style={tagStyle("#2ca02c")}>DATATYPE PROPERTY</span>
            <div style={{ fontSize: sz(14), fontWeight: 600, color: theme.text.primary, fontFamily: theme.font.sans }}>
              {prop.label}
            </div>
            <div style={{ fontSize: sz(9), fontFamily: theme.font.mono, color: theme.text.hint, marginTop: sz(2) }}>
              {getLocalName(prop.uri)}
            </div>
          </div>
          {closeBtn}
        </div>

        <div style={sectionStyle}>
          <div style={headingStyle}>Details</div>
          <div style={{ ...itemStyle, flexDirection: "column", alignItems: "flex-start", gap: sz(4) }}>
            <div>
              <span style={{ color: theme.text.subtle }}>Domain: </span>
              <span style={{ color: theme.text.primary }}>
                {domainClass ? domainClass.label : prop.domain ? getLocalName(prop.domain) : "—"}
              </span>
              {prop.domain && !visibleUris.has(prop.domain) && (
                <button style={{ ...addBtnStyle, marginLeft: sz(6) }} onClick={() => onAddClass(prop.domain!)}>+ add</button>
              )}
            </div>
            <div>
              <span style={{ color: theme.text.subtle }}>Range: </span>
              <span style={{ color: theme.text.primary }}>
                {prop.range ? getLocalName(prop.range) : "literal"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
