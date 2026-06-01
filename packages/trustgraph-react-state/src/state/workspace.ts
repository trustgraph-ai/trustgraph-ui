import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSocket, useConnectionState } from "@trustgraph/react-provider";
import { useSessionStore } from "./session";
import { useSettings } from "./settings";

// Active workspace is tied to the authenticated session, so it lives in
// sessionStorage alongside the auth token rather than localStorage.
const WORKSPACE_STORAGE_KEY = "tg.workspace.active";

const readSession = (): string | null => {
  try {
    return sessionStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeSession = (value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(WORKSPACE_STORAGE_KEY);
    else sessionStorage.setItem(WORKSPACE_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
};

export interface WorkspaceStoreState {
  // The workspace all requests are scoped to. null until bootstrapped
  // from whoami; an empty socket workspace means "the token's default".
  activeWorkspace: string | null;

  // Incremented on every real workspace switch. Lets cache consumers
  // discard stale in-flight responses from a previous workspace.
  generation: number;

  // Adopt a default workspace at bootstrap without counting as a switch.
  initActiveWorkspace: (id: string) => void;

  // Switch workspace; bumps the generation.
  setActiveWorkspace: (id: string) => void;

  clearActiveWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set) => ({
  activeWorkspace: readSession(),
  generation: 0,

  initActiveWorkspace: (id) =>
    set((s) => {
      if (s.activeWorkspace) return s;
      writeSession(id);
      return { activeWorkspace: id };
    }),

  setActiveWorkspace: (id) => {
    writeSession(id);
    set((s) => ({ activeWorkspace: id, generation: s.generation + 1 }));
  },

  clearActiveWorkspace: () => {
    writeSession(null);
    set({ activeWorkspace: null });
  },
}));

// Discover the workspaces the caller can access (one for an ordinary
// user, all for an admin — driven entirely by what the gateway returns).
export const useWorkspaces = () => {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";

  const query = useQuery({
    queryKey: ["workspaces"],
    enabled: isSocketReady,
    queryFn: () => socket.iam().listMyWorkspaces(),
  });

  return {
    workspaces: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// The caller's own user record, including their home/default workspace.
export const useWhoami = () => {
  const socket = useSocket();
  const connectionState = useConnectionState();
  const isSocketReady = connectionState?.status === "authenticated";

  const query = useQuery({
    queryKey: ["whoami"],
    enabled: isSocketReady,
    queryFn: () => socket.iam().whoami(),
  });

  return {
    whoami: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

// Bootstrap + keep the socket's outbound workspace in sync. Mount once,
// high in the tree (e.g. in the authenticated app shell).
export const useWorkspaceSync = () => {
  const socket = useSocket();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const initActiveWorkspace = useWorkspaceStore((s) => s.initActiveWorkspace);
  const { whoami } = useWhoami();

  // Adopt the user's default workspace when we have no active one yet.
  useEffect(() => {
    if (!activeWorkspace && whoami?.workspace) {
      initActiveWorkspace(whoami.workspace);
    }
  }, [activeWorkspace, whoami, initActiveWorkspace]);

  // Stamp the active workspace onto outbound requests. Empty falls back
  // to the token's bound workspace at the gateway.
  useEffect(() => {
    socket.workspace = activeWorkspace ?? "";
  }, [socket, activeWorkspace]);
};

// Active workspace + the switcher action for components.
export const useWorkspace = () => {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const generation = useWorkspaceStore((s) => s.generation);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const setFlowId = useSessionStore((s) => s.setFlowId);
  const { updateSetting } = useSettings();
  const { workspaces } = useWorkspaces();
  const { whoami } = useWhoami();

  // Switching workspace is a full context reset: collections, flows,
  // documents and config all re-scope. Reset the inner context (flow +
  // collection) to defaults and invalidate every cache so all pages
  // refetch under the new workspace.
  const switchWorkspace = useCallback(
    (id: string) => {
      if (!id || id === activeWorkspace) return;
      // Set synchronously so refetches triggered below already carry it.
      socket.workspace = id;
      setActiveWorkspace(id);
      setFlowId("default");
      updateSetting("collection", "default");
      // Wipe workspace-scoped caches so stale data from the previous
      // workspace can't bleed through, then invalidate to trigger refetches.
      const keep = ["workspaces", "whoami", "settings"];
      queryClient.removeQueries({
        predicate: (q) => !keep.includes(q.queryKey[0] as string),
      });
      queryClient.invalidateQueries();
    },
    [
      activeWorkspace,
      socket,
      setActiveWorkspace,
      setFlowId,
      updateSetting,
      queryClient,
    ],
  );

  return {
    activeWorkspace,
    workspaces,
    defaultWorkspace: whoami?.workspace ?? null,
    generation,
    switchWorkspace,
  };
};
