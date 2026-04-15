import { create } from "zustand";
import { Message } from "../model/message";

export type ChatMode = "graph-rag" | "agent" | "basic-llm";

export interface ConversationState {
  messages: Message[];
  input: string;
  chatMode: ChatMode;

  setMessages: (v: Message[]) => void;
  addMessage: (
    role: string,
    text: string,
    type?: "normal" | "thinking" | "observation" | "answer",
    explainSessionId?: string
  ) => void;
  updateLastMessage: (text: string, explainSessionId?: string) => void;
  setInput: (v: string) => void;
  setChatMode: (mode: ChatMode) => void;
}

export const useConversation = create<ConversationState>()((set) => ({
  messages: [
  ],

  input: "",
  chatMode: "graph-rag",

  setMessages: (v) =>
    set(() => ({
      messages: v,
    })),

  addMessage: (
    role: string,
    text: string,
    type?: "normal" | "thinking" | "observation" | "answer",
    explainSessionId?: string
  ) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          role: role,
          text: text,
          type: type || "normal",
          explainSessionId,
        },
      ],
    })),

  updateLastMessage: (text: string, explainSessionId?: string) =>
    set((state) => {
      if (state.messages.length === 0) return state;
      const messages = [...state.messages];
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        text: text,
        ...(explainSessionId !== undefined && { explainSessionId }),
      };
      return { messages };
    }),

  setInput: (v) =>
    set(() => ({
      input: v,
    })),

  setChatMode: (mode: ChatMode) =>
    set(() => ({
      chatMode: mode,
    })),
}));
