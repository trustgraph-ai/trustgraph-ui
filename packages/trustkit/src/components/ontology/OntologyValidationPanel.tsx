import type { ValidationResult, ValidationIssue } from "../../utils/ontology-validator";
import { text, border, palette } from "../../theme";

interface OntologyValidationPanelProps {
  result: ValidationResult;
  onNavigateToItem?: (itemId: string, itemType: "class" | "objectProperty" | "datatypeProperty") => void;
  onClose?: () => void;
}

const iconMap = { error: "●", warning: "▲", info: "○" };
const colorMap = { error: palette.red, warning: palette.amber, info: palette.blue };

export function OntologyValidationPanel({ result, onNavigateToItem, onClose }: OntologyValidationPanelProps) {
  return (
    <div style={{ padding: 16, borderBottom: `1px solid ${border.default}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: text.faint, letterSpacing: "0.1em" }}>VALIDATION</div>
          {result.summary.errors > 0 && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${palette.red}1a`, color: palette.red, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{result.summary.errors} error{result.summary.errors !== 1 ? "s" : ""}</span>}
          {result.summary.warnings > 0 && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${palette.amber}1a`, color: palette.amber, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{result.summary.warnings} warning{result.summary.warnings !== 1 ? "s" : ""}</span>}
          {result.summary.info > 0 && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${palette.blue}1a`, color: palette.blue, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{result.summary.info} info</span>}
          {result.isValid && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${palette.emerald}1a`, color: palette.emerald, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>Valid</span>}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ padding: "2px 8px", border: "none", background: "transparent", color: text.hint, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>×</button>
        )}
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {result.issues.map((issue: ValidationIssue, i: number) => (
          <div key={i}
            onClick={() => issue.itemId && issue.itemType && onNavigateToItem?.(issue.itemId, issue.itemType)}
            style={{ display: "flex", gap: 8, padding: "4px 0", cursor: issue.itemId ? "pointer" : "default", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
            <span style={{ color: colorMap[issue.type], flexShrink: 0 }}>{iconMap[issue.type]}</span>
            <div>
              <div style={{ color: text.secondary }}>{issue.message}</div>
              {issue.suggestion && <div style={{ color: text.hint, fontSize: 10, marginTop: 1 }}>{issue.suggestion}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
