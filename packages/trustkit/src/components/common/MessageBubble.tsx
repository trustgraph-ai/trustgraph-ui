import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";

export interface Message {
  role: string;
  text: string;
  type?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { theme, sz } = useTheme();
  const isUser = message.role === "human";
  const messageType = message.type;

  const getTypeStyles = () => {
    switch (messageType) {
      case "thinking":
        return {
          bg: withGlow(theme.semantic.thinking, 0.08),
          border: withGlow(theme.semantic.thinking, 0.2),
          icon: "◈",
          label: "THINKING",
          color: theme.semantic.thinking,
        };
      case "observation":
        return {
          bg: withGlow(theme.semantic.observation, 0.08),
          border: withGlow(theme.semantic.observation, 0.2),
          icon: "◉",
          label: "OBSERVATION",
          color: theme.semantic.observation,
        };
      case "answer":
        return {
          bg: withGlow(theme.semantic.answer, 0.08),
          border: withGlow(theme.semantic.answer, 0.2),
          icon: "✓",
          label: "ANSWER",
          color: theme.semantic.answer,
        };
      default:
        return null;
    }
  };

  const typeStyles = getTypeStyles();

  if (isUser) {
    return (
      <div style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: withGlow(theme.semantic.user, 0.08),
        border: `1px solid ${withGlow(theme.semantic.user, 0.2)}`,
        alignSelf: "flex-end",
        maxWidth: "80%",
      }}>
        <div style={{ fontSize: sz(10), color: withGlow(theme.semantic.user, 0.53), fontFamily: theme.font.mono, marginBottom: 6 }}>
          YOU
        </div>
        <div style={{ fontSize: sz(14), color: theme.text.primary, lineHeight: 1.5 }}>
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: 10,
      background: typeStyles?.bg || theme.surface.card,
      border: `1px solid ${typeStyles?.border || theme.border.default}`,
      maxWidth: "90%",
    }}>
      {typeStyles && (
        <div style={{
          fontSize: sz(10),
          color: withGlow(typeStyles.color, 0.53),
          fontFamily: theme.font.mono,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{ color: typeStyles.color }}>{typeStyles.icon}</span>
          {typeStyles.label}
        </div>
      )}
      <div style={{ fontSize: sz(13), color: theme.text.secondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {message.text}
      </div>
    </div>
  );
}
