import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { NavigationRequest, RouteEntry } from "./types";
import { resolveIntent, buildNavigationUrl } from "./resolveIntent";

interface NavigationContextValue {
  navigate: (request: NavigationRequest) => void;
  routes: RouteEntry[];
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  routes: RouteEntry[];
  children: ReactNode;
}

export function NavigationProvider({ routes, children }: NavigationProviderProps) {
  const routerNavigate = useNavigate();

  const navigate = useCallback((request: NavigationRequest) => {
    const resolved = resolveIntent(request, routes);
    if (resolved) {
      routerNavigate(buildNavigationUrl(request));
    } else {
      console.warn("No route matched for navigation request:", request);
    }
  }, [routes, routerNavigate]);

  return (
    <NavigationContext.Provider value={{ navigate, routes }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
