import type { AgentStepType } from "../../hooks/useAgent";
import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";

interface AgentStepCardProps {
  /** Step type */
  type: AgentStepType;
  /** Text content */
  content: string;
  /** Whether the step is still streaming */
  streaming: boolean;
  /** Step index (0-based) */
  index: number;
}

/**
 * Renders a single agent reasoning step (thought, observation, or answer).
 */
export function AgentStepCard({ type, content, streaming, index }: AgentStepCardProps) {
  const { theme, sz } = useTheme();

  const stepMeta: Record<AgentStepType, { label: string; color: string; icon: string }> = {
    thought:     { label: "THOUGHT",     color: theme.semantic.thinking,    icon: "◆" },
    observation: { label: "OBSERVATION", color: theme.semantic.observation, icon: "◈" },
    answer:      { label: "ANSWER",      color: theme.semantic.answer,      icon: "✓" },
  };

  const meta = stepMeta[type];

  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: 10,
      background: withGlow(meta.color, 0.08),
      border: `1px solid ${withGlow(meta.color, 0.25)}`,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
        fontSize: sz(10),
        fontFamily: "'IBM Plex Mono', monospace",
        color: meta.color,
        letterSpacing: "0.05em",
      }}>
        <span style={{ color: meta.color }}>{meta.icon}</span>
        {meta.label}
        <span style={{ color: theme.text.faint, marginLeft: "auto" }}>#{index + 1}</span>
      </div>

      {/* Content */}
      <div style={{
        fontSize: sz(13),
        color: type === "answer" ? theme.text.primary : theme.text.secondary,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
      }}>
        {content}
      </div>

      {/* Streaming indicator */}
      {streaming && (
        <div style={{
          marginTop: 8,
          fontSize: sz(10),
          color: withGlow(theme.palette.cyan, 0.5),
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          streaming...
        </div>
      )}
    </div>
  );
}
