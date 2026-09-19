import { useEffect, useMemo, type ComponentType } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Header, StatusBar, Toaster, useGraphData, toast, WorkspaceSwitcher, ActionButtonBar, ThemeProvider, useTheme } from "@trustgraph/trustkit";
import { useLogout, useWorkspaceSync } from "@trustgraph/react-state";
import { useThemeSettings, ThemePanel } from "./components/ThemePanel";
import { WelcomePage, DocsViewer, SearchPage, IngestPage, ExploreView, GraphRagPage, DocRagPage, AgentPage, GraphView, QueryView, ExplainView, DataView, OntologyView, RawGraphPage, PromptPage, AgentConfigPage, OntologyManagePage, SchemaPage, SparqlPage, GraphqlPage } from "./pages";

import { CardGrid } from "./components/CardGrid";
import { PluginErrorBoundary } from "./RemotePlugin";
import { NavigationProvider, useNavigationConfig, resolveIntent, parseNavigationUrl, buildNavigationUrl } from "./navigation";
import type { NavigationRequest, TabEntry } from "./navigation";

const BUILTIN_COMPONENTS = new Map<string, ComponentType<{ config?: unknown }>>([
  ["welcome", WelcomePage as ComponentType<{ config?: unknown }>],
  ["docs", DocsViewer as ComponentType<{ config?: unknown }>],
  ["search", SearchPage as ComponentType<{ config?: unknown }>],
  ["home-grid", CardGrid],
  ["demos-grid", CardGrid],
  ["admin-grid", CardGrid],
  ["ingest", IngestPage as ComponentType<{ config?: unknown }>],
  ["context-graph-navigator", ExploreView as ComponentType<{ config?: unknown }>],
  ["graph-rag", GraphRagPage as ComponentType<{ config?: unknown }>],
  ["document-rag", DocRagPage as ComponentType<{ config?: unknown }>],
  ["agent", AgentPage as ComponentType<{ config?: unknown }>],
  ["graph-navigator", RawGraphPage as ComponentType<{ config?: unknown }>],
  ["prompts", PromptPage as ComponentType<{ config?: unknown }>],
  ["agent-config", AgentConfigPage as ComponentType<{ config?: unknown }>],
  ["table-explorer", DataView as ComponentType<{ config?: unknown }>],
  ["ontology", OntologyView as ComponentType<{ config?: unknown }>],
  ["ontology-manage", OntologyManagePage as ComponentType<{ config?: unknown }>],
  ["schemas", SchemaPage as ComponentType<{ config?: unknown }>],
  ["sparql", SparqlPage as ComponentType<{ config?: unknown }>],
  ["graphql", GraphqlPage as ComponentType<{ config?: unknown }>],
  ["graph", GraphView as ComponentType<{ config?: unknown }>],
  ["query", QueryView as ComponentType<{ config?: unknown }>],
  ["explain", ExplainView as ComponentType<{ config?: unknown }>],
]);

export default function App() {
  const themeSettings = useThemeSettings();

  return (
    <ThemeProvider theme={themeSettings.theme} scale={themeSettings.scale}>
      <AppShell themeSettings={themeSettings} />
    </ThemeProvider>
  );
}

function AppShell({ themeSettings }: { themeSettings: ReturnType<typeof useThemeSettings> }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { entities, isLoading } = useGraphData();
  const logout = useLogout();
  const { theme, sz } = useTheme();
  const { navConfig, tabs, components, routes, isLoading: configLoading } = useNavigationConfig(BUILTIN_COMPONENTS as Map<string, ComponentType>);

  useWorkspaceSync();

  useEffect(() => {
    if (!isLoading && entities.length > 0) {
      toast.success(`Graph loaded: ${entities.length} entities`);
    }
  }, [isLoading, entities.length]);

  const handleNavigate = (request: NavigationRequest) => {
    navigate(buildNavigationUrl(request));
  };

  // Build nav tabs for the Header component
  const navTabs = useMemo(() =>
    tabs
      .filter((t: TabEntry) => !t.hidden)
      .map((t: TabEntry) => ({
        key: t.target,
        label: t.label,
        icon: t.icon,
      })),
    [tabs],
  );

  // All tab targets (including hidden) for route generation
  const allTabTargets = useMemo(() => tabs.map((t: TabEntry) => t.target), [tabs]);

  // Determine active tab from current URL
  const activeTab = useMemo(() => {
    const request = parseNavigationUrl(location.pathname, location.search);
    // Check if the current target matches a tab
    const target = request.target || request.intent;
    if (target && allTabTargets.includes(target)) return target;
    // Check if the resolved component matches a tab's component
    const resolved = resolveIntent(request, routes);
    if (resolved) {
      for (const t of tabs) {
        const tabResolved = resolveIntent({ target: t.target }, routes);
        if (tabResolved && tabResolved.componentId === resolved.componentId) return t.target;
      }
    }
    return navConfig.default || navTabs[0]?.key || "";
  }, [location, allTabTargets, routes, tabs, navConfig.default, navTabs]);

  if (configLoading) return null;

  return (
    <NavigationProvider routes={routes}>
      <div style={{
        "--page-height": "calc(100vh - 140px)",
        width: "100%", minHeight: "100vh", background: theme.surface.base,
        fontFamily: theme.font.sans,
        color: theme.text.primary, overflow: "hidden",
      } as React.CSSProperties}>
        <div style={{
          display: "flex", alignItems: "center",
          background: theme.surface.overlay,
          borderBottom: `1px solid ${theme.border.default}`,
        }}>
          <div style={{ flex: 1 }}>
            <Header
              activeTab={activeTab}
              onTabChange={(target: string) => handleNavigate({ target })}
              tabs={navTabs}
            />
          </div>
          <ActionButtonBar configKey="global" />
          <div style={{ width: 12 }} />
          <WorkspaceSwitcher />
          <div style={{ marginLeft: sz(12) }}>
            <ThemePanel settings={themeSettings} />
          </div>
          <button
            onClick={logout}
            style={{
              margin: `0 ${sz(20)}px 0 ${sz(12)}px`, padding: `${sz(6)}px ${sz(12)}px`, borderRadius: 6,
              background: "transparent",
              border: `1px solid ${theme.border.default}`,
              color: theme.text.muted, fontSize: sz(11), cursor: "pointer",
              fontFamily: theme.font.mono,
            }}
          >
            Sign out
          </button>
        </div>

        <Routes>
          <Route path="/" element={<Navigate to={buildNavigationUrl({ target: navConfig.default })} replace />} />
          <Route path="/*" element={<IntentRouter components={components} routes={routes} />} />
        </Routes>

        <StatusBar />
        <Toaster />
      </div>
    </NavigationProvider>
  );
}

// Catch-all route that resolves intent URLs to components
function IntentRouter({
  components,
  routes,
}: {
  components: Map<string, { id: string; Component: ComponentType | null; config?: unknown }>;
  routes: import("./navigation").RouteEntry[];
}) {
  const location = useLocation();
  const request = parseNavigationUrl(location.pathname, location.search);
  const resolved = resolveIntent(request, routes);

  if (!resolved) {
    return <Navigate to="/" replace />;
  }

  const comp = components.get(resolved.componentId);
  if (!comp?.Component) {
    return <Navigate to="/" replace />;
  }

  const Comp = comp.Component as ComponentType<{ config?: unknown }>;
  return (
    <PluginErrorBoundary name={resolved.componentId}>
      <Comp config={comp.config} />
    </PluginErrorBoundary>
  );
}
