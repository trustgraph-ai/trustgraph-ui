import { useRef, useEffect } from "react";
import { AgentStepCard } from "./AgentStepCard";
import type { AgentStep } from "../../hooks/useAgent";
import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";

interface AgentStepListProps {
  /** Agent reasoning steps */
  steps: AgentStep[];
  /** Whether the agent is still running */
  isQuerying: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * Scrollable list of agent reasoning steps with auto-scroll.
 */
export function AgentStepList({ steps, isQuerying, error }: AgentStepListProps) {
  const { theme, sz } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  if (error) {
    return (
      <div style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
      }}>
        <div style={{
          fontSize: sz(10),
          color: "rgba(239,68,68,0.53)",
          fontFamily: theme.font.mono,
          marginBottom: 6,
        }}>
          ERROR
        </div>
        <div style={{ fontSize: sz(13), color: theme.text.secondary, lineHeight: 1.6 }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step, idx) => (
          <AgentStepCard
            key={step.messageId}
            type={step.type}
            content={step.content}
            streaming={!step.complete && isQuerying}
            index={idx}
          />
        ))}
      </div>

      {isQuerying && steps.length === 0 && (
        <div style={{
          padding: "8px 12px",
          fontSize: sz(11),
          color: withGlow(theme.palette.amber, 0.6),
          fontFamily: theme.font.mono,
        }}>
          Agent is thinking...
        </div>
      )}

      <div ref={scrollRef} />
    </>
  );
}
