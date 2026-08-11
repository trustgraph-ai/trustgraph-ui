import { useState, useEffect, type ComponentType } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import type { DomainKey, Entity } from "@trustgraph/trustkit";
import { Header, StatusBar, Toaster, useGraphData, toast, WorkspaceSwitcher, ActionButtonBar, ThemeProvider, useTheme } from "@trustgraph/trustkit";
import { useLogout, useWorkspaceSync } from "@trustgraph/react-state";
import { useThemeSettings, ThemePanel } from "./components/ThemePanel";
import { HomePage, DemosPage, IngestPage, ExploreView, GraphRagPage, DocRagPage, AgentPage, GraphView, QueryView, ExplainView, DataView, OntologyView, RawGraphPage, PromptPage, AgentConfigPage, OntologyManagePage, SchemaPage, SparqlPage, GraphqlPage } from "./pages";
import { PluginErrorBoundary } from "./RemotePlugin";
import { usePluginManifest } from "./usePluginManifest";

const BUILTIN_COMPONENTS = new Map<string, ComponentType>([
  ["ingest", IngestPage],
  ["explore", ExploreView],
  ["graph-rag", GraphRagPage],
  ["doc-rag", DocRagPage],
  ["agent", AgentPage],
  ["raw-graph", RawGraphPage],
  ["prompts", PromptPage],
  ["agent-config", AgentConfigPage],
  ["data", DataView],
  ["ontology", OntologyView],
  ["ontology-manage", OntologyManagePage],
  ["schemas", SchemaPage],
  ["sparql", SparqlPage],
  ["graphql", GraphqlPage],
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
  const [activeFilter, setActiveFilter] = useState<DomainKey | null>(null);
  const [selectedNode, setSelectedNode] = useState<Entity | null>(null);
  const { entities, isLoading } = useGraphData();
  const logout = useLogout();
  const { theme, sz } = useTheme();
  const { sections, navTabs, byTab } = usePluginManifest("/config/components.json", BUILTIN_COMPONENTS);
  const allComponents = sections.flatMap(s => s.components);

  useWorkspaceSync();

  useEffect(() => {
    if (!isLoading && entities.length > 0) {
      toast.success(`Graph loaded: ${entities.length} entities`);
    }
  }, [isLoading, entities.length]);

  const handleNavigate = (view: string) => {
    navigate(view === "home" ? "/" : `/${view}`);
  };

  const activeView = location.pathname === "/" ? "home" : location.pathname.slice(1);

  return (
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
            activeTab={activeView as any}
            onTabChange={handleNavigate}
            tabs={navTabs}
          />
        </div>
        <ActionButtonBar configKey="global" />
        <div style={{ width: 12 }} />
        <WorkspaceSwitcher />
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
        <Route path="/" element={<HomePage onNavigate={handleNavigate} sections={byTab("home")} />} />
        {navTabs.filter(t => t.key !== "home").map(t => (
          <Route key={t.key} path={`/${t.key}`} element={<DemosPage onNavigate={handleNavigate} sections={byTab(t.key)} />} />
        ))}
        <Route
          path="/graph"
          element={
            <GraphView
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
            />
          }
        />
        <Route path="/query" element={<QueryView />} />
        <Route path="/explain" element={<ExplainView />} />
        {allComponents.map(p => p.Component ? (
          <Route key={p.id} path={`/${p.id}`} element={
            <PluginErrorBoundary name={p.id}>
              <p.Component />
            </PluginErrorBoundary>
          } />
        ) : null)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <StatusBar />
      <Toaster />
      <ThemePanel settings={themeSettings} />
    </div>
  );
}
