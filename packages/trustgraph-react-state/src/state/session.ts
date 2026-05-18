import { create } from "zustand";

// Interface defining the shape of the session state store
export interface SessionState {
  // Current flow ID
  flowId: string;

  // Current flow name/type
  flow: string | null;

  // Description of the current flow
  flowDescription: string;

  // Function to update the current flow ID
  setFlowId: (v: string) => void;

  // Function to update the current flow
  setFlow: (v: string) => void;
}

// Zustand store for managing session/workflow state
export const useSessionStore = create<SessionState>()((set) => ({
  flowId: "default",
  flow: null,
  flowDescription: "",

  setFlowId: (v) =>
    set(() => ({
      flowId: v,
    })),

  setFlow: (v) =>
    set(() => ({
      flow: v,
    })),
}));
