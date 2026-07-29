import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { withGlow } from "../../theme";
import type { ChatMessage } from "../../hooks/useRetailChat";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (input: string) => void;
  isQuerying: boolean;
  error: string | null;
  suggestedPrompts?: string[];
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const { theme, sz } = useTheme();
  const isUser = message.role === "user";
  const color = isUser ? theme.palette.amber : theme.palette.emerald;

  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        padding: "10px 14px",
        borderRadius: 10,
        background: withGlow(color, 0.08),
        border: `1px solid ${withGlow(color, 0.2)}`,
      }}
    >
      <div
        style={{
          fontSize: sz(10),
          color: withGlow(color, 0.53),
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 4,
        }}
      >
        {isUser ? "YOU" : "ASSISTANT"}
      </div>
      <div
        style={{
          fontSize: sz(13),
          color: theme.text.primary,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {message.text}
        {message.isStreaming && (
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 14,
              background: color,
              marginLeft: 2,
              animation: "blink 1s step-end infinite",
              verticalAlign: "text-bottom",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  messages,
  onSend,
  isQuerying,
  error,
  suggestedPrompts,
}: ChatPanelProps) {
  const { theme, sz } = useTheme();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isQuerying) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showPrompts = messages.length === 0 && suggestedPrompts && suggestedPrompts.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Message area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {showPrompts && (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div
              style={{
                fontSize: sz(18),
                fontWeight: 700,
                color: theme.text.primary,
                marginBottom: 6,
              }}
            >
              Retail Shopping Assistant
            </div>
            <div
              style={{
                fontSize: sz(12),
                color: theme.text.subtle,
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Ask me about building a PC, finding a gift, planning a camping
              trip, or comparing products.
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
              }}
            >
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border.medium}`,
                    background: theme.surface.card,
                    color: theme.text.muted,
                    fontSize: sz(12),
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    maxWidth: 320,
                    textAlign: "left",
                    lineHeight: 1.4,
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: withGlow(theme.palette.red, 0.1),
              border: `1px solid ${withGlow(theme.palette.red, 0.3)}`,
              color: theme.palette.red,
              fontSize: sz(12),
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: `1px solid ${theme.border.default}`,
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about products, builds, gifts, or gear..."
          rows={1}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${theme.border.medium}`,
            background: theme.surface.card,
            color: theme.text.primary,
            fontSize: sz(13),
            fontFamily: "'IBM Plex Sans', sans-serif",
            outline: "none",
            resize: "none",
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isQuerying}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: `1px solid ${theme.palette.emerald}44`,
            background:
              !input.trim() || isQuerying
                ? theme.surface.card
                : `${theme.palette.emerald}1a`,
            color:
              !input.trim() || isQuerying ? theme.text.disabled : theme.palette.emerald,
            cursor:
              !input.trim() || isQuerying ? "not-allowed" : "pointer",
            fontSize: sz(13),
            fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            whiteSpace: "nowrap",
          }}
        >
          {isQuerying ? "..." : "Send"}
        </button>
      </div>

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
