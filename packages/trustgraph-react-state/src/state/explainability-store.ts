/**
 * Zustand store for managing explainability sessions
 * Sessions are keyed by ID and linked to messages via explainSessionId
 */

import { create } from "zustand";
import type { ExplainabilitySession } from "../utils/explainability";

export interface ExplainabilityStoreState {
  /** Map of session ID to session data */
  sessions: Record<string, ExplainabilitySession>;

  /** Add or update a session */
  addSession: (id: string, session: ExplainabilitySession) => void;

  /** Update an existing session (merges with existing data) */
  updateSession: (id: string, partial: Partial<ExplainabilitySession>) => void;

  /** Get a session by ID */
  getSession: (id: string) => ExplainabilitySession | undefined;

  /** Remove a session */
  removeSession: (id: string) => void;

  /** Clear all sessions */
  clearSessions: () => void;
}

export const useExplainabilityStore = create<ExplainabilityStoreState>()(
  (set, get) => ({
    sessions: {},

    addSession: (id, session) =>
      set((state) => ({
        sessions: {
          ...state.sessions,
          [id]: session,
        },
      })),

    updateSession: (id, partial) =>
      set((state) => ({
        sessions: {
          ...state.sessions,
          [id]: {
            ...state.sessions[id],
            ...partial,
          },
        },
      })),

    getSession: (id) => get().sessions[id],

    removeSession: (id) =>
      set((state) => {
        const { [id]: _, ...rest } = state.sessions;
        return { sessions: rest };
      }),

    clearSessions: () => set({ sessions: {} }),
  })
);
