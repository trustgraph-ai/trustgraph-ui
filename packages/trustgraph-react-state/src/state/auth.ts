import { useEffect, useState, useCallback, useRef } from "react";
import { create } from "zustand";
import { createAuthApi, AuthError } from "@trustgraph/client";
import type { AuthApiOptions, AuthApi } from "@trustgraph/client";

const TOKEN_STORAGE_KEY = "tg.auth.token";
const EXPIRES_STORAGE_KEY = "tg.auth.expires";

export type AuthStatus =
  | "idle"
  | "logging-in"
  | "authenticated"
  | "auth-failed";

export type BootstrapPhase =
  | "checking"
  | "pre-bootstrap"
  | "needs-bootstrap"
  | "normal"
  | "error";

export interface AuthStoreState {
  token: string | null;
  jwtExpires: string | null;
  status: AuthStatus;
  error: string | null;

  setToken: (token: string, expires?: string | null) => void;
  clearToken: () => void;
  setStatus: (status: AuthStatus, error?: string | null) => void;
}

const readSession = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSession = (key: string, value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const initialToken = readSession(TOKEN_STORAGE_KEY);
const initialExpires = readSession(EXPIRES_STORAGE_KEY);

export const useAuthStore = create<AuthStoreState>((set) => ({
  token: initialToken,
  jwtExpires: initialExpires,
  status: initialToken ? "authenticated" : "idle",
  error: null,

  setToken: (token, expires) => {
    writeSession(TOKEN_STORAGE_KEY, token);
    writeSession(EXPIRES_STORAGE_KEY, expires ?? null);
    set({
      token,
      jwtExpires: expires ?? null,
      status: "authenticated",
      error: null,
    });
  },

  clearToken: () => {
    writeSession(TOKEN_STORAGE_KEY, null);
    writeSession(EXPIRES_STORAGE_KEY, null);
    set({
      token: null,
      jwtExpires: null,
      status: "idle",
      error: null,
    });
  },

  setStatus: (status, error) =>
    set({ status, error: error ?? null }),
}));

// Module-level AuthApi singleton. Configurable via configureAuthApi() — the
// demo (or any consumer) can override URLs / fetchImpl before any hook
// runs.
let authApiSingleton: AuthApi = createAuthApi();

export const configureAuthApi = (options: AuthApiOptions) => {
  authApiSingleton = createAuthApi(options);
};

const getAuthApi = (): AuthApi => authApiSingleton;

export interface UseAuthResult {
  token: string | null;
  jwtExpires: string | null;
  status: AuthStatus;
  error: string | null;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthResult => {
  const token = useAuthStore((s) => s.token);
  const jwtExpires = useAuthStore((s) => s.jwtExpires);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  return {
    token,
    jwtExpires,
    status,
    error,
    isAuthenticated: status === "authenticated" && !!token,
  };
};

export interface UseLoginResult {
  login: (
    username: string,
    password: string,
    default_workspace?: string,
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const useLogin = (): UseLoginResult => {
  const setToken = useAuthStore((s) => s.setToken);
  const setStatus = useAuthStore((s) => s.setStatus);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);

  const login = useCallback(
    async (username: string, password: string, default_workspace?: string) => {
      setStatus("logging-in", null);
      try {
        const result = await getAuthApi().login(
          username,
          password,
          default_workspace,
        );
        setToken(result.jwt, result.jwtExpires);
        return true;
      } catch (e) {
        const message =
          e instanceof AuthError
            ? e.message
            : e instanceof Error
              ? e.message
              : "login failed";
        setStatus("auth-failed", message);
        return false;
      }
    },
    [setToken, setStatus],
  );

  return {
    login,
    isLoading: status === "logging-in",
    error,
  };
};

export const useLogout = () => {
  const clearToken = useAuthStore((s) => s.clearToken);
  return useCallback(() => clearToken(), [clearToken]);
};

export interface UseBootstrapStatusResult {
  phase: BootstrapPhase;
  error: string | null;
  refetch: () => void;
}

export const useBootstrapStatus = (): UseBootstrapStatusResult => {
  const [phase, setPhase] = useState<BootstrapPhase>("checking");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const check = useCallback(async () => {
    setPhase("checking");
    setError(null);
    try {
      const result = await getAuthApi().bootstrapStatus();
      if (cancelled.current) return;
      setPhase(result.bootstrapAvailable ? "needs-bootstrap" : "normal");
    } catch (e) {
      if (cancelled.current) return;
      const message =
        e instanceof Error ? e.message : "bootstrap-status failed";
      // Distinguish "service unreachable" (likely pre-bootstrap or down)
      // from other errors. The IAM spec doesn't define a separate signal
      // for pre-bootstrap, so we treat any failure to reach the endpoint
      // as pre-bootstrap territory and let the operator interpret.
      setError(message);
      setPhase("pre-bootstrap");
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    check();
    return () => {
      cancelled.current = true;
    };
  }, [check]);

  return { phase, error, refetch: check };
};
