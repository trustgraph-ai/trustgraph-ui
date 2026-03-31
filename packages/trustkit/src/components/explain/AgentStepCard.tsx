import type { AgentStepType } from "../../hooks/useAgent";
import { semantic, text, withGlow, palette } from "../../theme";

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

const stepMeta: Record<AgentStepType, { label: string; color: string; icon: string }> = {
  thought:     { label: "THOUGHT",     color: semantic.thinking,    icon: "◆" },
  observation: { label: "OBSERVATION", color: semantic.observation, icon: "◈" },
  answer:      { label: "ANSWER",      color: semantic.answer,      icon: "✓" },
};

/**
 * Renders a single agent reasoning step (thought, observation, or answer).
 */
export function AgentStepCard({ type, content, streaming, index }: AgentStepCardProps) {
  const meta = stepMeta[type];

  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: 10,
      background: withGlow(meta.color, 0.06),
      border: `1px solid ${withGlow(meta.color, 0.15)}`,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        color: withGlow(meta.color, 0.53),
        letterSpacing: "0.05em",
      }}>
        <span style={{ color: meta.color }}>{meta.icon}</span>
        {meta.label}
        <span style={{ color: text.faint, marginLeft: "auto" }}>#{index + 1}</span>
      </div>

      {/* Content */}
      <div style={{
        fontSize: 13,
        color: type === "answer" ? text.primary : text.secondary,
        lineHeight: 1.65,
        whiteSpace: "pre-wrap",
      }}>
        {content}
      </div>

      {/* Streaming indicator */}
      {streaming && (
        <div style={{
          marginTop: 8,
          fontSize: 10,
          color: withGlow(palette.cyan, 0.5),
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          streaming...
        </div>
      )}
    </div>
  );
}
