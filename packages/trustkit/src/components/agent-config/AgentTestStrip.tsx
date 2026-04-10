import { useState } from "react";
import { useAgent } from "../../hooks/useAgent";
import { AgentStepCard } from "../explain/AgentStepCard";
import { text, border, surface, palette } from "../../theme";

interface AgentTestStripProps {
  height?: number;
}

/**
 * Compact horizontal test strip for invoking the agent. Sits at the
 * bottom of the agent console. Question in, streaming reasoning + answer out.
 */
export function AgentTestStrip({ height = 280 }: AgentTestStripProps) {
  const [question, setQuestion] = useState("");
  const { query, steps, isQuerying, error } = useAgent();

  const handleRun = () => {
    const q = question.trim();
    if (!q || isQuerying) return;
    query(q);
  };

  return (
    <div style={{
      height,
      borderTop: `1px solid ${border.default}`,
      display: "flex",
      flexDirection: "column",
      background: surface.base,
    }}>
      {/* Header + input */}
      <div style={{
        padding: "10px 20px",
        borderBottom: `1px solid ${border.subtle}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: text.faint,
          letterSpacing: "0.1em",
          flexShrink: 0,
        }}>
          AGENT TEST
        </span>

        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
          placeholder="Ask the agent a question..."
          disabled={isQuerying}
          style={{
            flex: 1,
            padding: "7px 12px",
            borderRadius: 6,
            border: `1px solid ${border.default}`,
            background: surface.card,
            color: text.primary,
            fontSize: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
            outline: "none",
          }}
        />

        <button
          onClick={handleRun}
          disabled={!question.trim() || isQuerying}
          style={{
            padding: "7px 16px",
            borderRadius: 6,
            border: `1px solid ${palette.amber}44`,
            background: !question.trim() || isQuerying ? "transparent" : `${palette.amber}1a`,
            color: !question.trim() || isQuerying ? text.disabled : palette.amber,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            cursor: !question.trim() || isQuerying ? "default" : "pointer",
          }}
        >
          {isQuerying ? "Running..." : "Run"}
        </button>

        {/* Future debug controls — placeholders */}
        <button
          disabled
          title="Single step (coming soon)"
          style={{
            padding: "7px 12px",
            borderRadius: 6,
            border: `1px solid ${border.default}`,
            background: "transparent",
            color: text.disabled,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            cursor: "not-allowed",
          }}
        >
          Step ⏵
        </button>
      </div>

      {/* Response area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px 20px",
      }}>
        {error && (
          <div style={{
            fontSize: 12,
            color: palette.red,
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 8,
          }}>
            Error: {error}
          </div>
        )}

        {steps.length === 0 && !isQuerying && !error && (
          <div style={{
            fontSize: 12,
            color: text.hint,
            fontStyle: "italic",
          }}>
            Type a question and click Run to test the agent.
          </div>
        )}

        {steps.map((step, i) => (
          <AgentStepCard
            key={step.messageId}
            type={step.type}
            content={step.content}
            streaming={!step.complete}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
