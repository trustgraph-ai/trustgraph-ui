import { useState, useCallback, useRef } from "react";
import { useInference, useSettings } from "@trustgraph/react-state";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type RetailFlow = "build" | "gift" | "kit" | "compare" | "browse";

export interface RetailChatState {
  messages: ChatMessage[];
  send: (input: string) => Promise<void>;
  isQuerying: boolean;
  error: string | null;
  clear: () => void;
  detectedFlow: RetailFlow;
}

const FLOW_PATTERNS: { flow: RetailFlow; patterns: RegExp[] }[] = [
  {
    flow: "build",
    patterns: [
      /\b(build|assemble|put together)\b.*\b(pc|computer|rig|system|workstation)\b/i,
      /\b(gaming pc|gaming computer|gaming rig)\b/i,
      /\b(upgrade|bottleneck|compatible|socket|motherboard)\b/i,
      /\b(cpu|gpu|ram|psu|case)\b.*\b(recommend|suggest|pick|choose)\b/i,
    ],
  },
  {
    flow: "gift",
    patterns: [
      /\b(gift|present)\b/i,
      /\bfor (my|a|their)\b.*\b(friend|nephew|niece|son|daughter|teenager|kid|partner|wife|husband)\b/i,
    ],
  },
  {
    flow: "kit",
    patterns: [
      /\b(camping|camp|outdoor|hiking|backpacking)\b/i,
      /\b(trip|gear|essentials|kit|collection)\b.*\b(need|recommend|pack)\b/i,
    ],
  },
  {
    flow: "compare",
    patterns: [
      /\b(compare|vs|versus|difference between|which is better)\b/i,
      /\b(between the|or the)\b/i,
    ],
  },
];

function detectFlow(messages: ChatMessage[]): RetailFlow {
  const allText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text)
    .join(" ");

  for (const { flow, patterns } of FLOW_PATTERNS) {
    if (patterns.some((p) => p.test(allText))) return flow;
  }
  return "browse";
}

let messageCounter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export function useRetailChat({
  collection: collectionProp,
}: {
  collection?: string;
} = {}): RetailChatState {
  const { settings } = useSettings();
  const collection = collectionProp ?? settings.collection;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef("");

  const { agent } = useInference({});

  const send = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || isQuerying) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      };

      const assistantId = nextId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsQuerying(true);
      setError(null);
      streamRef.current = "";

      try {
        await agent({
          input: trimmed,
          collection,
          callbacks: {
            onAnswer: (chunk: string, complete: boolean) => {
              streamRef.current += chunk;
              const text = streamRef.current;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text, isStreaming: !complete }
                    : m,
                ),
              );
            },
            onError: (err: string) => setError(err),
          },
        });
      } catch (err) {
        setError(String(err));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, text: "Sorry, something went wrong.", isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsQuerying(false);
      }
    },
    [agent, collection, isQuerying],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    send,
    isQuerying,
    error,
    clear,
    detectedFlow: detectFlow(messages),
  };
}
