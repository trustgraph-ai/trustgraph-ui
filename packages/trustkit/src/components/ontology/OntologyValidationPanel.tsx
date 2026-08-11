import type { ValidationResult, ValidationIssue } from "../../utils/ontology-validator";
import { useTheme } from "../../theme/ThemeContext";

interface OntologyValidationPanelProps {
  result: ValidationResult;
  onNavigateToItem?: (itemId: string, itemType: "class" | "objectProperty" | "datatypeProperty") => void;
  onClose?: () => void;
}

const iconMap = { error: "●", warning: "▲", info: "○" };

export function OntologyValidationPanel({ result, onNavigateToItem, onClose }: OntologyValidationPanelProps) {
  const { theme, sz } = useTheme();
  const colorMap = { error: theme.palette.red, warning: theme.palette.amber, info: theme.palette.blue };

  return (
    <div style={{ padding: 16, borderBottom: `1px solid ${theme.border.default}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: sz(10), fontFamily: theme.font.mono, fontWeight: 600, color: theme.text.faint, letterSpacing: "0.1em" }}>VALIDATION</div>
          {result.summary.errors > 0 && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${theme.palette.red}1a`, color: theme.palette.red, fontSize: sz(9), fontFamily: theme.font.mono, fontWeight: 600 }}>{result.summary.errors} error{result.summary.errors !== 1 ? "s" : ""}</span>}
          {result.summary.warnings > 0 && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${theme.palette.amber}1a`, color: theme.palette.amber, fontSize: sz(9), fontFamily: theme.font.mono, fontWeight: 600 }}>{result.summary.warnings} warning{result.summary.warnings !== 1 ? "s" : ""}</span>}
          {result.summary.info > 0 && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${theme.palette.blue}1a`, color: theme.palette.blue, fontSize: sz(9), fontFamily: theme.font.mono, fontWeight: 600 }}>{result.summary.info} info</span>}
          {result.isValid && <span style={{ padding: "2px 6px", borderRadius: 3, background: `${theme.palette.emerald}1a`, color: theme.palette.emerald, fontSize: sz(9), fontFamily: theme.font.mono, fontWeight: 600 }}>Valid</span>}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ padding: "2px 8px", border: "none", background: "transparent", color: theme.text.hint, fontSize: sz(11), fontFamily: theme.font.mono, cursor: "pointer" }}>×</button>
        )}
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {result.issues.map((issue: ValidationIssue, i: number) => (
          <div key={i}
            onClick={() => issue.itemId && issue.itemType && onNavigateToItem?.(issue.itemId, issue.itemType)}
            style={{ display: "flex", gap: 8, padding: "4px 0", cursor: issue.itemId ? "pointer" : "default", fontSize: sz(11), fontFamily: theme.font.mono }}>
            <span style={{ color: colorMap[issue.type], flexShrink: 0 }}>{iconMap[issue.type]}</span>
            <div>
              <div style={{ color: theme.text.secondary }}>{issue.message}</div>
              {issue.suggestion && <div style={{ color: theme.text.hint, fontSize: sz(10), marginTop: 1 }}>{issue.suggestion}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
